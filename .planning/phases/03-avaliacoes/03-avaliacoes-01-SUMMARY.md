---
phase: 03-avaliacoes
plan: 01
subsystem: rating-system
tags: [ride-reviews, star-rating, triggers, passenger-profile, pilot-rating]
dependency_graph:
  requires: [02-pagamentos]
  provides: [ride_reviews-table, passenger-rating-display, pilot-rating-update, star-rating-component]
  affects: [passenger/Completed, pilot/ActiveRide, pilot/PilotDashboard, passenger/Profile]
tech_stack:
  added: [ride_reviews table, PostgreSQL triggers, StarRating component]
  patterns: [ride_reviews INSERT for reviews, trigger-based average updates, conditional insert for legacy rides]
key_files:
  created:
    - supabase/migrations/20260313_ride_reviews.sql
    - src/components/StarRating.tsx
    - src/pages/pilot/RatePassenger.tsx
  modified:
    - src/integrations/supabase/types.ts
    - src/types/index.ts
    - src/contexts/AuthContext.tsx
    - src/pages/pilot/PilotDashboard.tsx
    - src/pages/passenger/Completed.tsx
    - src/pages/pilot/ActiveRide.tsx
    - src/App.tsx
    - src/pages/passenger/Profile.tsx
decisions:
  - "pilot_user_id approach: rides table gets a separate UUID column referencing auth.users, distinct from pilot_id (which is device-based UUID from public.pilots). This avoids breaking existing pilot_id logic while enabling proper auth-based ride_reviews foreign keys."
  - "Legacy ride handling: if rideData.pilot_user_id is null (rides accepted before migration), Completed.tsx skips the ride_reviews insert but still shows success toast and navigates away. RatePassenger.tsx redirects silently to /pilot if passenger_user_id is null."
  - "Skip is always optional: both passenger and pilot can skip rating without any penalty or blocking."
  - "UNIQUE(ride_id, reviewer_role) constraint prevents double-submission at DB level."
metrics:
  duration: ~25 minutes
  completed_date: 2026-03-13
  tasks_completed: 5
  files_created: 3
  files_modified: 8
---

# Phase 3 Plan 01: Avaliações (Rating System) Summary

**One-liner:** Mutual ride rating system with ride_reviews table, PostgreSQL triggers for auto-averaging, StarRating component, and dedicated RatePassenger screen for pilots.

## What Was Built

### Wave 0 — Database Migration (`supabase/migrations/20260313_ride_reviews.sql`)

Migration file created (NOT applied — user applies manually via Supabase Dashboard or `supabase db push`):

- `ALTER TABLE rides ADD COLUMN IF NOT EXISTS pilot_user_id UUID REFERENCES auth.users(id)` — auth UUID for the pilot, separate from device-based `pilot_id`
- `ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 5.0` — passenger average rating
- `CREATE TABLE ride_reviews` with columns: `id`, `ride_id`, `reviewer_id`, `reviewee_id`, `reviewer_role` (`'passenger'|'pilot'`), `stars` (1-5), `comment`, `created_at`
- `UNIQUE(ride_id, reviewer_role)` — prevents double-submission per ride per role
- RLS enabled: INSERT policy (own review only), SELECT policy (reviewer or reviewee)
- `trg_update_pilot_rating` — AFTER INSERT on ride_reviews WHERE reviewer_role='passenger', updates `pilot_profiles.rating` with AVG(stars)
- `trg_update_passenger_rating` — AFTER INSERT on ride_reviews WHERE reviewer_role='pilot', updates `passenger_profiles.rating` with AVG(stars)

### Wave 1 — TypeScript Types

**`src/integrations/supabase/types.ts`:**
- Added `rating: number` to `passenger_profiles.Row`; `rating?: number` to Insert/Update
- Added complete `ride_reviews` table block (Row, Insert, Update, Relationships)
- Added `pilot_user_id: string | null` to `rides.Row`; `pilot_user_id?: string | null` to Insert/Update

**`src/types/index.ts`:**
- Added `passenger_user_id?: string | null` and `pilot_user_id?: string | null` to `DbRide` interface

**`src/contexts/AuthContext.tsx`:**
- Added `rating?: number` to `PassengerProfile` interface so the field is available via `useAuthContext()`

**`src/pages/pilot/PilotDashboard.tsx`:**
- Destructured `user` from `useAuthContext()` (was only using `pilotProfile`)
- Added `pilot_user_id: user?.id ?? null` to the `.update()` call in `handleAcceptRide`
- All new rides accepted from this point will have `pilot_user_id` set

### Wave 2A — StarRating Component + Completed.tsx Refactor

**`src/components/StarRating.tsx`** (new file):
- Reusable star rating component with props: `value`, `onChange`, `size` (`sm|md|lg`), `readonly`
- Uses lucide-react `Star` icon; filled/unfilled states; hover animation; disabled in readonly mode

**`src/pages/passenger/Completed.tsx`:**
- Added imports: `useAuthContext`, `StarRating`
- Added `const { user } = useAuthContext()`
- Replaced 5 inline `<button><Star /></button>` elements with `<StarRating value={rating} onChange={setRating} size="lg" />`
- Replaced `handleSubmit`: now inserts into `ride_reviews` (not `rides.rating`). Guard: `if (rideId && user?.id && rideData?.pilot_user_id)` — legacy rides (no `pilot_user_id`) skip insert silently but still show success toast and navigate
- Tip still saved to `rides.tip` separately for compatibility
- Removed unused `Star` import from lucide-react

### Wave 2B — RatePassenger + ActiveRide + Route

**`src/pages/pilot/RatePassenger.tsx`** (new file):
- Route: `/pilot/rate/:rideId`
- On mount: fetches `passenger_user_id`, `passenger_name`, `price` from `rides`
- If `passenger_user_id` is null (legacy ride): navigates to `/pilot` immediately, renders null
- Shows ride price in success format, `StarRating` component, optional comment textarea
- Submit: inserts into `ride_reviews` with `reviewer_role: 'pilot'`
- Skip button navigates to `/pilot` without inserting

**`src/pages/pilot/ActiveRide.tsx`:**
- Removed `setTimeout(() => navigate('/pilot'), 2000)` from `handleAction`
- Added `navigate(\`/pilot/rate/${rideId}\`)` — immediate navigation to RatePassenger on ride completion
- Removed entire `if (phase === 'completed') { return (...) }` splash block — RatePassenger now shows the completion UI
- Removed unused `Check` and `MapPin` imports from lucide-react

**`src/App.tsx`:**
- Added `import RatePassenger from "./pages/pilot/RatePassenger"`
- Added route: `<Route path="/pilot/rate/:rideId" element={<ProtectedRoute requiredRole="pilot"><RatePassenger /></ProtectedRoute>} />`

### Wave 3 — Passenger Profile Rating Display

**`src/pages/passenger/Profile.tsx`:**
- Added `Star` to lucide-react imports
- Added rating badge below the photo section: shows `passengerProfile.rating` formatted to 1 decimal (e.g., "5.0 avaliação") with filled yellow star icon
- Conditional: only renders if `passengerProfile?.rating !== undefined` (will show for all users after migration, default 5.0)

## Decisions Made

1. **pilot_user_id approach:** `rides.pilot_user_id` is a new UUID column referencing `auth.users(id)`, completely separate from `pilot_id` (device-based UUID from `public.pilots` table). This maintains backward compatibility with existing pilot_id logic (GPS tracking, active ride lookup) while enabling proper auth-aware ride_reviews.

2. **Legacy ride handling:** Rides accepted before the migration will have `pilot_user_id = null`. Completed.tsx gracefully skips the ride_reviews insert in that case (passenger still sees "Obrigado!" and is redirected). RatePassenger.tsx redirects pilots to `/pilot` silently if `passenger_user_id` is null.

3. **No setTimeout in ActiveRide:** The 2-second delay was removed entirely. The pilot is immediately taken to RatePassenger, which provides the completion celebration UI (check icon, price display). This is faster and more intentional.

4. **Skip is non-blocking:** Both sides can skip rating at any time. The `Pular` button navigates without any insert.

## Build Result

```
npm run build — SUCCESS
2662 modules transformed, built in 9.67s
No TypeScript errors
Pre-existing warnings only (CSS @import order, chunk size — unrelated to this phase)
```

## Requirement Status

| Requirement | Status | Evidence |
|-------------|--------|---------|
| R5.1 — Passenger rates pilot 1-5 stars | DONE | Completed.tsx inserts into ride_reviews with reviewer_role='passenger'; StarRating component used |
| R5.2 — Pilot rates passenger 1-5 stars | DONE | RatePassenger.tsx at /pilot/rate/:rideId; ActiveRide navigates there on completion |
| R5.3 — Pilot rating auto-updated and visible | DONE | trg_update_pilot_rating trigger; pilot_profiles.rating already shown in PilotDashboard and PilotProfile (pre-existing) |
| R5.4 — Passenger rating auto-updated and visible | DONE | trg_update_passenger_rating trigger; passenger_profiles.rating now shown in Profile.tsx |

## Deviations from Plan

**1. [Rule 1 - Bug] Removed unused lucide-react imports**
- **Found during:** Task 4 (ActiveRide) and Task 3 (Completed.tsx)
- **Issue:** After removing inline star buttons from Completed.tsx and the completed splash block from ActiveRide.tsx, `Star` and `Check`/`MapPin` became unused imports that would cause TypeScript lint warnings
- **Fix:** Removed `Star` from Completed.tsx import; removed `Check` and `MapPin` from ActiveRide.tsx import
- **Files modified:** `src/pages/passenger/Completed.tsx`, `src/pages/pilot/ActiveRide.tsx`

**2. [Rule 2 - Missing field] Added rating to PassengerProfile interface in AuthContext**
- **Found during:** Task 5 (Profile.tsx)
- **Issue:** `AuthContext.tsx` defines a local `PassengerProfile` interface that did not include `rating`, so `passengerProfile.rating` would be a TypeScript error even after types.ts was updated
- **Fix:** Added `rating?: number` to `PassengerProfile` interface in AuthContext.tsx
- **Files modified:** `src/contexts/AuthContext.tsx`

**3. [Rule 2 - Missing fields] Added passenger_user_id to DbRide**
- **Found during:** Task 2 review
- **Issue:** `DbRide` in `src/types/index.ts` was missing `passenger_user_id` which is used in RatePassenger.tsx to fetch the passenger's auth UUID
- **Fix:** Added both `passenger_user_id?: string | null` and `pilot_user_id?: string | null` to DbRide
- **Files modified:** `src/types/index.ts`

## Self-Check

Files created/exist:
- `supabase/migrations/20260313_ride_reviews.sql` — CREATED
- `src/components/StarRating.tsx` — CREATED
- `src/pages/pilot/RatePassenger.tsx` — CREATED
- `src/integrations/supabase/types.ts` — MODIFIED (ride_reviews block, passenger_profiles.rating, rides.pilot_user_id)
- `src/types/index.ts` — MODIFIED (DbRide.pilot_user_id, DbRide.passenger_user_id)
- `src/contexts/AuthContext.tsx` — MODIFIED (PassengerProfile.rating)
- `src/pages/pilot/PilotDashboard.tsx` — MODIFIED (user from auth, pilot_user_id in update)
- `src/pages/passenger/Completed.tsx` — MODIFIED (ride_reviews insert, StarRating component)
- `src/pages/pilot/ActiveRide.tsx` — MODIFIED (removed setTimeout, navigate to /pilot/rate/:rideId, removed splash)
- `src/App.tsx` — MODIFIED (RatePassenger import + route)
- `src/pages/passenger/Profile.tsx` — MODIFIED (Star import, rating display)

Build: PASSED (npm run build, 2662 modules, 0 TypeScript errors)

## Self-Check: PASSED

## Next Step

Apply the migration before testing:
```
supabase db push
```
or paste `supabase/migrations/20260313_ride_reviews.sql` into Supabase Dashboard > SQL Editor and run it.

Then proceed to UAT checkpoint (checkpoint:human-verify) as defined in the plan.
