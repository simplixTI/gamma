# Phase 3: Avaliações (Rating System) - Research

**Researched:** 2026-03-13
**Domain:** Mutual ride rating system — Supabase PostgreSQL, React 18 + TypeScript, shadcn/ui
**Confidence:** HIGH

---

## Summary

The passenger rating screen at `/passenger/completed` already exists and is largely functional: it collects 1–5 stars, an optional comment, and a tip, then writes `rating`, `rating_comment`, and `tip` directly to the `rides` table row. However, this only captures the passenger-to-pilot direction and does not feed the pilot's stored `rating` average on `pilot_profiles`. The pilot side has no rating screen at all — when a ride completes, `ActiveRide.tsx` shows a "Corrida concluída!" splash and redirects to `/pilot` after 2 seconds.

The existing schema already stores a `rating` column on `rides` (passenger's rating of the pilot) and `pilot_profiles.rating NUMERIC(3,2)` as a stored average. The `passenger_profiles` table has no rating column. A new dedicated `ride_reviews` table is the cleanest path for mutual bidirectional ratings, resolving the ambiguity of the current single-direction `rides.rating` field.

**Primary recommendation:** Create a `ride_reviews` table (one row per direction per ride), add `rating` to `passenger_profiles`, update `pilot_profiles.rating` via database trigger on insert, and surface both averages on their respective profile pages. The passenger flow requires refactoring `Completed.tsx` to write to `ride_reviews` instead of `rides.rating`; the pilot flow requires a new rating screen inserted between the completion splash and the redirect to `/pilot`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R5.1 | Passageiro avalia piloto (1–5 estrelas + comentário) após corrida | Passenger `Completed.tsx` already has the UI and flow; needs to write to `ride_reviews` and trigger pilot rating recalculation |
| R5.2 | Piloto avalia passageiro após corrida | No pilot rating screen exists; needs new page/component invoked from `ActiveRide.tsx` completion phase before redirecting to `/pilot` |
| R5.3 | Rating médio visível no perfil do piloto | `pilot_profiles.rating` column exists and is already displayed in `PilotProfile.tsx`; needs to be kept up to date by trigger or recalculation |
| R5.4 | Rating médio visível no perfil do passageiro | `passenger_profiles` has no `rating` column; needs column addition, trigger, and display in `Profile.tsx` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | ^2.x (already installed) | Insert reviews, query averages | Already the project's database client |
| React 18 + TypeScript | Already installed | UI components | Project stack |
| lucide-react | Already installed | `Star` icon already used for ratings in `Completed.tsx` and `PilotProfile.tsx` | Consistent icon set |
| shadcn/ui | Already installed | `Button`, `Textarea` components | Project UI library |
| react-router-dom | Already installed | Navigation between post-ride and rating screens | Routing layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | Already installed | Toast notifications on submit success/error | Matches existing error feedback pattern |
| canvas-confetti | Already installed | Celebration for 5-star rating | Already used in `Completed.tsx` for 5-star + tip combo |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated `ride_reviews` table | Keep using `rides.rating` + add `pilot_to_passenger_rating` column | Simpler migration but doesn't scale; ambiguous column semantics; no clean RLS enforcement per reviewer |
| Database trigger for average | Recalculate average on every query with AVG() | On-query AVG is always accurate but requires a JOIN on every profile read; stored average is faster for profile displays with many reviews |
| Separate pilot rating page | Inline rating in the completed splash in `ActiveRide.tsx` | Inline is simpler but harder to validate and skip gracefully |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── pages/
│   ├── passenger/
│   │   └── Completed.tsx          # MODIFY: write to ride_reviews instead of rides.rating
│   └── pilot/
│       ├── ActiveRide.tsx          # MODIFY: navigate to pilot rating screen after completion
│       └── RatePassenger.tsx       # NEW: pilot rates passenger after ride
├── components/
│   └── StarRating.tsx              # NEW: reusable star input component
supabase/
└── migrations/
    └── YYYYMMDD_ride_reviews.sql   # NEW: ride_reviews table + triggers
```

### Pattern 1: Dedicated `ride_reviews` Table

**What:** A separate table with one row per reviewer per ride. Columns: `id`, `ride_id`, `reviewer_id` (auth.users), `reviewee_id` (auth.users), `reviewer_role` (`passenger` | `pilot`), `stars` (1–5), `comment` (nullable), `created_at`.

**When to use:** Anytime mutual bidirectional ratings exist between two parties in the same transaction.

**Example:**
```sql
-- Source: Supabase PostgreSQL pattern for ride-sharing ratings
CREATE TABLE public.ride_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id UUID NOT NULL REFERENCES auth.users(id),
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('passenger', 'pilot')),
  stars       SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, reviewer_role)  -- one review per direction per ride
);
ALTER TABLE public.ride_reviews ENABLE ROW LEVEL SECURITY;
```

The `UNIQUE (ride_id, reviewer_role)` constraint prevents double-submission — a single `INSERT` with `ON CONFLICT DO NOTHING` is safe to call multiple times.

### Pattern 2: Stored Average via PostgreSQL Trigger

**What:** An `AFTER INSERT ON ride_reviews` trigger recalculates the running average and updates the target profile table.

**When to use:** When profile pages frequently display the rating and must not incur a JOIN cost on every read.

**Example:**
```sql
-- Source: PostgreSQL trigger pattern
CREATE OR REPLACE FUNCTION public.update_pilot_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.pilot_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'passenger'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_pilot_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'passenger')
  EXECUTE FUNCTION public.update_pilot_rating();

-- Mirror for passenger rating
CREATE OR REPLACE FUNCTION public.update_passenger_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.passenger_profiles
  SET rating = (
    SELECT COALESCE(AVG(stars), 5.0)
    FROM public.ride_reviews
    WHERE reviewee_id = NEW.reviewee_id
      AND reviewer_role = 'pilot'
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_passenger_rating
  AFTER INSERT ON public.ride_reviews
  FOR EACH ROW
  WHEN (NEW.reviewer_role = 'pilot')
  EXECUTE FUNCTION public.update_passenger_rating();
```

### Pattern 3: Reusable Star Rating Component

**What:** A small controlled React component that renders 5 clickable `Star` icons from lucide-react, already used in `Completed.tsx` inline. Extract to a shared component.

**Example:**
```tsx
// Source: existing pattern in src/pages/passenger/Completed.tsx lines 223–238
interface StarRatingProps {
  value: number;
  onChange: (stars: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

const StarRating = ({ value, onChange, size = 'md', readonly = false }: StarRatingProps) => {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  return (
    <div className="flex justify-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          className={`transition-all p-1 ${readonly ? 'cursor-default' : 'active:scale-90 hover:scale-110'}`}
          disabled={readonly}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= value
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-border hover:text-yellow-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **Writing to `rides.rating` for the new mutual system:** The column exists and `Completed.tsx` currently writes to it, but it is single-direction (passenger only). The new system should insert into `ride_reviews` and the old `rides.rating` write can be removed or kept as a legacy mirror — not the source of truth.
- **Querying AVG() on every profile page load without caching:** Adding a JOIN on every profile fetch adds latency. The trigger-based stored average pattern avoids this.
- **Blocking ride completion on rating submission:** Never block the pilot from proceeding if the passenger hasn't rated yet (and vice versa). Rating is always skippable.
- **Pilot rating immediately in the completion splash in `ActiveRide.tsx`:** The current completion state renders for 2 seconds then auto-navigates. Inserting a rating form inside that 2-second splash window is too fragile. Navigate to a dedicated `RatePassenger` page instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Average calculation | Custom JS function to compute average across reviews | PostgreSQL `AVG()` aggregate + trigger | Race conditions, consistency; database-level atomicity |
| Duplicate review prevention | Frontend guard only | `UNIQUE (ride_id, reviewer_role)` DB constraint + `ON CONFLICT DO NOTHING` | Frontend can be circumvented; DB constraint is authoritative |
| Star icon rendering | Custom SVG stars | `lucide-react Star` (already imported in `Completed.tsx`) | Already present, consistent with design system |

**Key insight:** The database already has 90% of the scaffolding needed (`pilot_profiles.rating`, `rides.rating`). The primary work is schema formalization and wiring the pilot side.

---

## Common Pitfalls

### Pitfall 1: Reviewer Identity — `pilot_id` is stored as TEXT, not UUID

**What goes wrong:** The `rides` table stores `pilot_id TEXT` (not a UUID FK to `auth.users`). Looking at the schema: `pilot_id TEXT` with no FK constraint. The `ride_reviews` table needs `reviewer_id UUID REFERENCES auth.users(id)`. When the pilot submits a review, the app must use `auth.uid()` (UUID from the Supabase session), NOT `rides.pilot_id` (which is a text field).

**Why it happens:** The original `rides` schema was device-ID based (`passenger_device_id TEXT`). Auth UUIDs were added later. The two ID systems coexist.

**How to avoid:** In the pilot's `RatePassenger` page, always get the reviewer UUID from `useAuthContext().user.id`, not from `ride.pilot_id`. Similarly, get the `reviewee_id` (passenger) from `rides.passenger_user_id` (which is `UUID REFERENCES auth.users`).

**Warning signs:** RLS errors when inserting into `ride_reviews` if you pass text pilot_id instead of auth UUID.

### Pitfall 2: `passenger_user_id` Can Be NULL

**What goes wrong:** `rides.passenger_user_id` is nullable. If a ride was created in an older session or anonymously, the passenger UUID might be null, making it impossible to store `reviewee_id` in `ride_reviews`.

**Why it happens:** Legacy device-based flow; authentication was added later.

**How to avoid:** Before allowing the pilot to submit a review, verify `ride.passenger_user_id IS NOT NULL`. If null, silently skip or show "review unavailable for this ride."

### Pitfall 3: RLS Policy for `ride_reviews` Must Allow Both Roles to Insert

**What goes wrong:** Writing an overly restrictive INSERT policy like `WITH CHECK (reviewer_id = auth.uid())` is correct, but you must also ensure the SELECT policy allows both the reviewer and reviewee to read their reviews (for profile display).

**How to avoid:**
```sql
-- INSERT: only the reviewer can insert their own review
CREATE POLICY "Reviewer can insert own review"
  ON public.ride_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- SELECT: reviewer or reviewee can read
CREATE POLICY "Participants can read reviews"
  ON public.ride_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR reviewee_id = auth.uid());
```

### Pitfall 4: Pilot Rating Screen Navigation Timing

**What goes wrong:** `ActiveRide.tsx` currently calls `setTimeout(() => navigate('/pilot'), 2000)` when phase becomes `completed`. If you add a rating screen after completion, this auto-redirect will fire before the user has rated.

**Why it happens:** The auto-redirect was designed for a no-rating flow.

**How to avoid:** Replace the `setTimeout navigate('/pilot')` with `navigate('/pilot/rate/:rideId', { state: { rideId } })`. The rating page then navigates to `/pilot` after submit or skip.

### Pitfall 5: `passenger_profiles` Has No `rating` Column

**What goes wrong:** R5.4 requires showing passenger average rating on their profile. The `passenger_profiles` table has no `rating` column. Without adding it, the trigger has nowhere to write.

**How to avoid:** Migration must add `rating NUMERIC(3,2) NOT NULL DEFAULT 5.0` to `passenger_profiles` and update the TypeScript types in `types.ts` and `supabase/types.ts`.

### Pitfall 6: Rating Must Be Optional / Skippable

**What goes wrong:** Blocking post-ride navigation until a rating is submitted creates friction that users abandon.

**Uber pattern (confirmed):** Rating is shown as a prompt but always has a "Skip" or "Not now" option. The existing `Completed.tsx` already implements `handleSkip()` that calls `navigate('/passenger')` without writing a review. Keep this pattern.

**How to avoid:** Always expose a skip/dismiss path. The requirement says "após corrida" (after ride) — it does not mandate the rating be mandatory.

---

## Code Examples

### Submitting a Review from `Completed.tsx`

```typescript
// Source: pattern derived from existing Completed.tsx handleSubmit + ride_reviews schema
const handleSubmit = async () => {
  if (rating === 0) return toast.error('Selecione uma avaliação');
  if (!rideData?.pilot_id || !user?.id) return;

  setIsSubmitting(true);
  try {
    const { error } = await supabase
      .from('ride_reviews')
      .insert({
        ride_id: rideId,
        reviewer_id: user.id,                    // auth UUID
        reviewee_id: rideData.pilot_user_id,     // pilot's auth UUID (needs to be stored in rides)
        reviewer_role: 'passenger',
        stars: rating,
        comment: comment || null,
      });
    if (error) throw error;
    toast.success('Obrigado pela avaliação!');
    resetState();
    navigate('/passenger');
  } catch (err) {
    toast.error('Erro ao enviar avaliação');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Adding `rating` Column to `passenger_profiles`

```sql
-- Migration
ALTER TABLE public.passenger_profiles
  ADD COLUMN rating NUMERIC(3,2) NOT NULL DEFAULT 5.0;
```

### Reading Pilot Average Rating for Profile Display

```typescript
// Source: existing PilotProfile.tsx pattern — already reads pilotProfile.rating
// No query change needed; trigger keeps pilot_profiles.rating current
const rating = pilotProfile?.rating?.toFixed(1) ?? '5.0';
```

### Displaying Passenger Rating in Profile

```typescript
// Source: pattern derived from PilotProfile.tsx star display
// passenger_profiles.rating will be available after migration
const rating = passengerProfile?.rating?.toFixed(1) ?? '5.0';
```

---

## Critical Schema Finding: `pilot_user_id` Missing from `rides`

The `rides` table stores `pilot_id TEXT` (not a UUID FK). To insert a review with `reviewee_id UUID`, the pilot's auth UUID must be resolvable from the ride. Currently it cannot be cleanly retrieved from `rides.pilot_id`.

**Resolution options (choose one):**

1. **Add `pilot_user_id UUID REFERENCES auth.users(id)` to `rides`** — cleanest, requires a migration and updating the pilot ride-acceptance code to also write `pilot_user_id = auth.uid()`.
2. **Look up pilot UUID from `pilot_profiles WHERE user_id = (SELECT user_id FROM pilot_profiles WHERE id = rides.pilot_id::uuid)`** — fragile, relies on `pilot_id` being a valid UUID string matching `pilot_profiles.id`.
3. **Store pilot UUID at acceptance time** — when the pilot accepts a ride, write both `pilot_id` (existing) and `pilot_user_id = auth.uid()`. This is the recommended path.

**Recommendation:** Add `pilot_user_id UUID` to `rides` and populate it on ride acceptance. This unblocks both the review system and future features (push notifications, direct queries).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Write `rides.rating` from passenger | Insert into `ride_reviews` with reviewer_role | Phase 3 (this phase) | Enables mutual ratings; old column kept as nullable legacy |
| No passenger rating stored | `passenger_profiles.rating` column added | Phase 3 migration | Satisfies R5.4 |
| Pilot auto-redirects after 2s on completion | Pilot navigates to `RatePassenger` page | Phase 3 | Rating opportunity for pilots; `setTimeout` removed |

**Deprecated/outdated after this phase:**
- `rides.rating` and `rides.rating_comment` writes from `Completed.tsx` — replaced by `ride_reviews` inserts. The columns can remain nullable for backward compatibility but should not be written to going forward.

---

## Open Questions

1. **`pilot_user_id` on `rides` table**
   - What we know: `pilot_id TEXT` exists but is not a UUID FK to auth.users
   - What's unclear: Does the pilot acceptance code write `auth.uid()` to `pilot_id` or a different identifier?
   - Recommendation: Verify by reading `PilotDashboard.tsx` or the ride-acceptance handler. If `pilot_id` is already `auth.uid()` cast to text, option 2 above (cast + lookup) works. Otherwise, add `pilot_user_id UUID` column in the migration.

2. **Should the pilot rating screen be a full page or a bottom-sheet modal?**
   - What we know: The passenger rating is a full-page flow at `/passenger/completed`. The project uses bottom-sheets in `ActiveRide.tsx`.
   - What's unclear: User preference for pilot UX.
   - Recommendation: Use a full-page route `/pilot/rate/:rideId` mirroring the passenger pattern. Consistent and testable.

3. **Is R5.3 "rating visible on pilot profile" meant to be visible to passengers too (e.g., shown when a passenger sees who is coming)?**
   - What we know: `Tracking.tsx` and `InRide.tsx` show pilot info — currently hardcoded `rating: 4.9` in `PassengerHome.tsx`.
   - What's unclear: Should real pilot rating be shown in the ride-tracking UI?
   - Recommendation: Out of scope for this phase (R5.3 says "perfil do piloto"). Focus on `PilotProfile.tsx` display only.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in project |
| Config file | None — Wave 0 must create |
| Quick run command | `npm test` (after Wave 0 setup) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R5.1 | Passenger submits 1–5 star review after ride | unit | `npm test -- --testPathPattern=ride_reviews` | ❌ Wave 0 |
| R5.1 | Skip button navigates to /passenger without inserting review | unit | `npm test -- --testPathPattern=Completed` | ❌ Wave 0 |
| R5.2 | Pilot rating screen appears after ride completes | integration | manual smoke test | N/A |
| R5.2 | Pilot submits review — reviewee_id is passenger UUID | unit | `npm test -- --testPathPattern=RatePassenger` | ❌ Wave 0 |
| R5.3 | pilot_profiles.rating updates after passenger review inserted | unit (DB trigger) | manual Supabase test | N/A |
| R5.4 | passenger_profiles.rating updates after pilot review inserted | unit (DB trigger) | manual Supabase test | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (unit tests)
- **Per wave merge:** Full suite green
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework configured — add vitest or jest: `npm install -D vitest @testing-library/react @testing-library/user-event`
- [ ] `tests/Completed.test.tsx` — covers R5.1 skip and submit behavior
- [ ] `tests/RatePassenger.test.tsx` — covers R5.2 pilot rating submission
- [ ] `tests/ride_reviews.test.ts` — covers DB insert and trigger behavior (integration)

*(Note: Given the project has no existing test infrastructure, the planner may choose to treat testing as manual smoke-test only for this phase.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src/pages/passenger/Completed.tsx` — confirms existing passenger rating UI, star component pattern, skip behavior
- Direct code inspection of `src/pages/pilot/ActiveRide.tsx` — confirms no pilot rating screen; 2-second auto-redirect after completion
- Direct schema inspection of `supabase/migrations/20260313001928_bde99681-ee9f-46c5-90b9-8ff2ca0d0ee9.sql` — confirms `rides.rating INTEGER`, `pilot_profiles.rating NUMERIC(3,2)`, no reviews table, `pilot_id TEXT` (not UUID FK)
- Direct inspection of `src/integrations/supabase/types.ts` — confirms `passenger_profiles` has no `rating` column
- Direct inspection of `src/contexts/AuthContext.tsx` and `src/types/index.ts` — confirms auth UUID access pattern via `user.id`

### Secondary (MEDIUM confidence)
- Supabase RLS pattern: `reviewer_id = auth.uid()` as INSERT guard — standard documented pattern
- PostgreSQL `AFTER INSERT` trigger for running average — well-documented PostgreSQL feature

### Tertiary (LOW confidence)
- Uber's rating-is-optional pattern — inferred from app behavior knowledge; not officially documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in package.json/source files
- Architecture: HIGH — based on direct source code inspection; schema gaps confirmed
- Schema design: HIGH — direct migration file inspection; `pilot_user_id` gap is a confirmed finding
- Pitfalls: HIGH — identified from actual code (auto-redirect timing, nullable passenger_user_id, text pilot_id)
- Test infrastructure: HIGH (confirmed absent) — no test config found

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack)
