# Codebase Concerns

**Analysis Date:** 2026-03-12

---

## Security Considerations

**Google Maps API key hardcoded in source:**
- Risk: The API key is committed directly into source code and will be exposed in the compiled JS bundle served to all clients. Anyone can extract it and use it to incur billing charges.
- Files: `src/components/GoogleMapView.tsx` line 89: `const GOOGLE_MAPS_API_KEY = 'AIzaSyDcgpO1JqG6-5yFTwNkgpQH3Yb0ztGCjUM';`
- Current mitigation: None. The key has no referrer restriction enforcement visible in the code.
- Recommendations: Move to `VITE_GOOGLE_MAPS_API_KEY` environment variable; add HTTP referrer restrictions in Google Cloud Console.

**Supabase anon key hardcoded in source:**
- Risk: The Supabase URL and publishable (anon) key are hardcoded in the client file. While anon keys are designed to be public, the specific URL and key pattern allows targeted attacks against the Supabase project if RLS is misconfigured.
- Files: `src/integrations/supabase/client.ts` lines 5-6
- Current mitigation: The key is labeled "PUBLISHABLE_KEY" and Supabase anon keys are publicly safe by design, but coupling it with the URL in source creates a fingerprint for the project.
- Recommendations: Move both values to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables so `.env` can be excluded from git.

**`.env` file not in `.gitignore`:**
- Risk: The `.gitignore` does not include `.env` or `.env.*` entries. If the `.env` file contains secrets (it is present at the project root), those secrets may be committed to git history.
- Files: `.gitignore`, `.env` (present but contents not read)
- Current mitigation: The repository may not have committed `.env` yet, but there is no guard preventing it.
- Recommendations: Add `.env`, `.env.*`, and `.env.local` to `.gitignore` immediately.

**Payment confirmation bypass:**
- Risk: `PaymentModal.tsx` (`handleConfirmPayment`) allows a passenger to mark a payment as `completed` in the database directly from the client side, without any server-side verification that the PIX was actually paid. Any user can call this update and receive a ride without paying.
- Files: `src/components/PaymentModal.tsx` lines 89-112
- Current mitigation: The webhook at `supabase/functions/payment-webhook/index.ts` correctly marks payments paid when BlackCat calls back, but there is a parallel client-side path that bypasses this entirely.
- Recommendations: Remove the client-side `handleConfirmPayment` button or replace it with a server function that actually polls the payment provider before marking as paid.

**PIX payment mock fallback in production code:**
- Risk: When the BlackCat API call fails, `create-pix-payment/index.ts` silently generates a fake mock QR code and stores it as a real payment record. This means failed API calls produce records that look legitimate but can never be verified.
- Files: `supabase/functions/create-pix-payment/index.ts` lines 129-138
- Current mitigation: None.
- Recommendations: Return a hard error when the payment provider is unreachable rather than creating mock records.

**Webhook has no signature verification:**
- Risk: `payment-webhook/index.ts` accepts any POST body and processes it as a payment confirmation. A malicious actor could spoof a webhook call to mark any pending payment as paid.
- Files: `supabase/functions/payment-webhook/index.ts`
- Current mitigation: None. There is no HMAC signature check or secret header validation.
- Recommendations: Validate the `Authorization` or `X-Signature` header from BlackCat before processing any payment state change.

---

## Tech Debt

**Dual identity system for passengers (device fingerprint vs. user ID):**
- Issue: Passengers are identified in two incompatible ways: `passenger_user_id` (Supabase auth UUID) for authenticated flows and `passenger_device_id` (browser fingerprint hash) for legacy/unauthenticated flows. Many queries do `OR` across both columns. The fingerprint algorithm is duplicated in `useRideSubscription.ts` (`getDeviceId`) and `usePilotStats.ts` (`getDeviceFingerprint`) with slightly different variable naming.
- Files: `src/hooks/useRideSubscription.ts` lines 147-166, `src/hooks/usePilotStats.ts` lines 13-34, `src/services/rideService.ts` lines 24 and 68, `src/pages/passenger/RideHistory.tsx` lines 38-42
- Impact: Rides may be linked to the wrong account; ride history queries are unreliable when a user logs in on a different device or browser.
- Fix approach: Standardize on `passenger_user_id` for all authenticated operations. Remove the fingerprint fallback path and the duplicate fingerprint functions.

**Pilot identity uses a legacy `pilots` table separate from `pilot_profiles`:**
- Issue: `usePilotStats.ts` reads from and creates records in a `pilots` table keyed by `device_id` (fingerprint), while the actual pilot authentication uses `pilot_profiles` keyed by Supabase user UUID. These two tables are not joined anywhere, so stats and profiles are siloed.
- Files: `src/hooks/usePilotStats.ts` lines 49-86, `src/contexts/AuthContext.tsx` (references `pilot_profiles`)
- Impact: Pilot stats (rides today, earnings, rating) may be fetched for the wrong pilot or accumulate on ghost records.
- Fix approach: Migrate `usePilotStats` to query `rides` table by `pilot_id` using the authenticated user's UUID from `AuthContext`, and remove the `pilots` table lookup.

**Mock data imported and rendered in production UI:**
- Issue: `src/data/mockData.ts` exports hardcoded locations, a fake pilot (`mockPilot`), and fake passengers. The `PassengerHome` and `RequestRide` pages import `locations` from this file and use it as the full set of bookable destinations. The QR Code shown in `PaymentModal` is a placeholder icon, not the actual QR from the payment API.
- Files: `src/data/mockData.ts`, `src/pages/passenger/PassengerHome.tsx` line 11, `src/pages/passenger/RequestRide.tsx` line 6, `src/components/PaymentModal.tsx` lines 143-149
- Impact: The app only supports the 6 hardcoded pier locations; pilots and passengers cannot add custom locations; QR code display is non-functional.
- Fix approach: Replace hardcoded locations with a Supabase `locations` table; render the actual base64 QR image from the payment API response.

**Distance/price calculation is a Euclidean approximation, not nautical routing:**
- Issue: `AppContext.tsx` (`calculateDistance`) computes straight-line Euclidean distance from coordinate deltas, scaled by an arbitrary factor of 100. This is not geodesic and produces incorrect results even for short distances on water where routes must follow channels.
- Files: `src/contexts/AppContext.tsx` lines 36-41
- Impact: Prices and estimated times shown to passengers are unreliable. Price range is capped at R$3–R$10 regardless of actual route complexity.
- Fix approach: Use the Haversine formula (already implemented correctly in `src/pages/passenger/Tracking.tsx` `calculateDistance`) and feed actual route data from the Google Maps Directions API or a fixed fare table per pier-to-pier route.

**Two duplicate toast systems installed:**
- Issue: Both `sonner` (`<Sonner>` from `src/components/ui/sonner.tsx`) and `@radix-ui/react-toast` (`<Toaster>` from `src/components/ui/toaster.tsx`) are mounted simultaneously in `src/App.tsx`. The codebase uses `sonner` for all actual toasts, making the Radix toast system dead weight.
- Files: `src/App.tsx` lines 2-3 and 43-44
- Impact: Increases bundle size; potential DOM conflicts if both ever fire.
- Fix approach: Remove `<Toaster>` and all `@radix-ui/react-toast` imports if sonner is the canonical toast system.

**`usePilotStats.ts` makes two separate DB round-trips for the same `rides` table:**
- Issue: The hook fetches `allRides` (all completed rides for the pilot) and `todayRides` (completed rides since midnight) in two sequential queries. Only `allRides` is used for rating; `todayRides` is used for earnings. Both queries could be a single query with client-side filtering.
- Files: `src/hooks/usePilotStats.ts` lines 96-118
- Impact: Double the database round-trips on every stat refresh; stats channel triggers `fetchStats` on every ride change.
- Fix approach: Fetch all completed rides once, filter client-side for today vs. all-time.

---

## Known Bugs

**Searching screen can navigate to tracking before modal closes:**
- Symptoms: In `SearchingPilot.tsx`, when a ride is accepted, `setShowAcceptedModal(true)` is called and then `navigate('/passenger/tracking', ...)` is called in the same synchronous block. The modal never fully displays before the navigation occurs.
- Files: `src/pages/passenger/SearchingPilot.tsx` lines 85-95
- Trigger: Pilot accepts ride while passenger is on the SearchingPilot screen.
- Workaround: The `RideAcceptedModal`'s `onClose` handler also navigates to tracking, so the modal is reachable via poll path, but the realtime path skips it.

**Auto-cancel timer in SearchingPilot fires even if `currentRideId` is null:**
- Symptoms: The timer `useEffect` in `SearchingPilot` runs from mount and increments `searchTime`. If `getCurrentRide` returns null (race condition on mount), `currentRideId` remains null, so the auto-cancel `cancelRide(null)` path is never called — but the timer still runs indefinitely and shows the user a 0:00 counter.
- Files: `src/pages/passenger/SearchingPilot.tsx` lines 173-190
- Trigger: Navigating to `/passenger/searching` before a ride record is created in the DB.

**Tracking page exits silently if `currentPilot` is null:**
- Symptoms: `Tracking.tsx` calls `navigate('/passenger')` and returns `null` synchronously if `currentPilot` is falsy (line 290-293). This happens on page refresh because `currentPilot` lives in React context (not persisted) and is reset on load.
- Files: `src/pages/passenger/Tracking.tsx` lines 290-293
- Trigger: Passenger refreshes the browser while on the Tracking page.
- Workaround: The `useEffect` at lines 83-93 tries to refetch `rideId` but cannot restore `currentPilot` from context after refresh.

**Pilot phone button in ActiveRide is non-functional:**
- Symptoms: The `<Button variant="secondary" size="icon">` with a `Phone` icon in `ActiveRide.tsx` (line 386) has no `onClick` handler. Pressing it does nothing.
- Files: `src/pages/pilot/ActiveRide.tsx` line 386
- Trigger: Pilot taps the phone button on the active ride screen.

---

## Fragile Areas

**Realtime + polling dual mechanism:**
- Files: `src/pages/passenger/SearchingPilot.tsx`, `src/pages/passenger/PassengerHome.tsx`, `src/pages/passenger/Tracking.tsx`
- Why fragile: Every critical screen runs both a Supabase Realtime subscription and a `setInterval` polling fallback. Status-change handlers (`handleStatusChange`) are defined inside `useEffect` closures and are re-created on each render cycle. When both realtime and polling fire for the same event, some handlers (like navigation) execute twice. The `lastStatus` variable used in Tracking is a closure variable that does not survive re-renders.
- Safe modification: Centralize ride state into a single hook with a stable callback reference using `useCallback` and `useRef` for previous status tracking. Do not co-locate polling and subscription in the same `useEffect`.
- Test coverage: No tests exist for any of these flows.

**AppContext price/distance calculations depend on in-memory Location state:**
- Files: `src/contexts/AppContext.tsx` lines 36-61
- Why fragile: `calculateDistance`, `calculateTime`, and `calculatePrice` all close over React state (`origin`, `destination`) that is stored only in memory. Any page refresh or navigation that clears context resets these to zero. Pages that display price (e.g., `SearchingPilot`) call `calculatePrice()` without verifying that origin/destination are set, showing "R$0".
- Safe modification: Persist origin/destination to `sessionStorage` in the context and rehydrate on mount.

**`useAuth` sign-up is not atomic:**
- Files: `src/hooks/useAuth.ts` lines 150-218
- Why fragile: Sign-up performs three sequential database operations: `supabase.auth.signUp`, `user_roles.insert`, and `passenger_profiles.insert` / `pilot_profiles.insert`. If any step after the first fails, the user account is created but has no role or profile, leaving the account in a broken state with no recovery path visible in the UI.
- Safe modification: Move all post-signup profile creation into a Supabase database trigger or Edge Function that runs within a transaction.

**Device fingerprint is not stable across environments:**
- Files: `src/hooks/useRideSubscription.ts` lines 147-166, `src/hooks/usePilotStats.ts` lines 13-34
- Why fragile: The fingerprint uses `userAgent`, `screen.width/height`, `colorDepth`, and `timezoneOffset`. Any OS update, browser update, or screen resolution change produces a different hash. This silently creates a new "passenger" or "pilot" identity in the database.
- Safe modification: Remove the fingerprint approach entirely; rely solely on Supabase auth user UUIDs.

---

## Performance Bottlenecks

**Google Maps API loads on every screen that mounts `GoogleMapView`:**
- Problem: `GoogleMapView` calls `useJsApiLoader` with a static `id: 'google-map-script'`. While the SDK caches the script after first load, the component re-initializes the loader state on every mount (e.g., navigating PassengerHome → RequestRide both mount separate `GoogleMapView` instances).
- Files: `src/components/GoogleMapView.tsx` lines 95-98
- Cause: No shared map provider; each component instance owns its own loader lifecycle.
- Improvement path: Hoist `useJsApiLoader` to a single top-level provider in `App.tsx` and pass the `isLoaded` flag down via context.

**`usePilotStats` fetches all rides on every status change event:**
- Problem: The realtime channel in `usePilotStats` triggers `fetchStats` for any change to any ride row for the pilot. Completing a ride fires the event, which re-fetches all completed rides + today's rides from scratch.
- Files: `src/hooks/usePilotStats.ts` lines 161-185
- Cause: No incremental update; full re-query on each change event.
- Improvement path: Use optimistic updates or maintain a local accumulator for stats and only re-fetch on the `completed` event type.

**Polling intervals are additive and not deduplicated:**
- Problem: `PassengerHome` polls every 5 seconds. `SearchingPilot` polls every 3 seconds. `Tracking` polls every 5 seconds. If a user navigates quickly between these pages without proper cleanup, multiple interval timers accumulate until component unmount fires.
- Files: `src/pages/passenger/PassengerHome.tsx` line 87, `src/pages/passenger/SearchingPilot.tsx` line 168, `src/pages/passenger/Tracking.tsx` line 150
- Improvement path: Ensure cleanup `return () => clearInterval(interval)` is always reachable; consider a global ride-polling hook that is mounted once in the app tree.

---

## Test Coverage Gaps

**No tests exist in the repository:**
- What's not tested: All business logic, hooks, services, payment flows, auth flows, GPS tracking, and realtime subscriptions.
- Files: Entire `src/` directory
- Risk: Any change to critical paths (ride acceptance, payment confirmation, auth sign-up atomicity) can break silently.
- Priority: High

**Payment flow has no integration test:**
- What's not tested: The `create-pix-payment` Edge Function, the `payment-webhook` handler, and the client-side `PaymentModal` confirm path.
- Files: `supabase/functions/create-pix-payment/index.ts`, `supabase/functions/payment-webhook/index.ts`, `src/components/PaymentModal.tsx`
- Risk: The mock fallback in create-pix-payment and the client-side bypass in PaymentModal could both silently allow unpaid rides to proceed.
- Priority: High

**Auth sign-up atomicity is untested:**
- What's not tested: Partial failure scenarios where the auth user is created but the role or profile insert fails.
- Files: `src/hooks/useAuth.ts` lines 150-218
- Risk: Broken accounts accumulate in the auth system with no user-facing recovery.
- Priority: High

---

## Scaling Limits

**Hardcoded location list of 6 piers:**
- Current capacity: 6 fixed pickup/dropoff locations in `src/data/mockData.ts`
- Limit: Adding new piers requires a code deployment.
- Scaling path: Create a `locations` table in Supabase; load locations dynamically via a query on app init.

**Single `pilot-rides` realtime channel for all pilots:**
- Current capacity: All online pilots share one `pilot-rides` channel filtered by `status=eq.pending`. This channel is re-subscribed each time a pilot goes online/offline.
- Limit: Supabase Realtime has per-connection and per-project channel limits. If many pilots are online simultaneously, this pattern creates duplicate subscriptions.
- Scaling path: Use a single persistent subscription with server-side dispatch rather than individual client-managed channels.

---

## Missing Critical Features

**No server-side payment verification before ride dispatch:**
- Problem: Rides become visible to pilots (status `pending`) at ride creation, before payment is confirmed. The flow in `RequestRide.tsx` creates the ride record and then opens the payment modal. A passenger who closes the modal without paying leaves a `pending` ride in the queue.
- Blocks: Payment integrity; pilots may accept unpaid rides.

**Favorites page is fully unimplemented:**
- Problem: `src/pages/passenger/Favorites.tsx` shows two hardcoded example entries in component state with no persistence. The "add favorite" button shows a toast: "Em breve: adicionar local favorito" (coming soon).
- Blocks: Users cannot save preferred pickup/dropoff locations.

**Payment page (saved methods) is fully unimplemented:**
- Problem: `src/pages/passenger/Payment.tsx` shows two hardcoded example payment methods in component state. The "add method" button shows "Em breve" toast. No card or PIX management is wired to any backend.
- Blocks: Saved payment method management.

**Pilot photo in passenger view always uses placeholder:**
- Problem: When a ride is accepted, the pilot is populated with `photo: '/placeholder.svg'` in every location: `SearchingPilot.tsx` line 79, `PassengerHome.tsx` line 64. The actual `photo_url` from `pilot_profiles` is never fetched into the ride acceptance flow.
- Files: `src/pages/passenger/SearchingPilot.tsx` line 79, `src/pages/passenger/PassengerHome.tsx` line 64, `src/pages/pilot/PilotDashboard.tsx` line 44

**`MapView.tsx` component exists but is unused:**
- Files: `src/components/MapView.tsx`
- Problem: There is a `MapView` component alongside `GoogleMapView`. It appears to be an older or alternate map implementation. Its usage count is zero — no pages import it.

---

*Concerns audit: 2026-03-12*
