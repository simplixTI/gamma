# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

**Mapping:**
- Google Maps JavaScript API - Interactive ride map, route polylines, driver/passenger markers, and navigation links
  - SDK/Client: `@react-google-maps/api` ^2.20.8
  - Implementation: `src/components/GoogleMapView.tsx`
  - API Key: hardcoded in `src/components/GoogleMapView.tsx` line 89 (NOT stored in env — security concern)
  - Usage: `useJsApiLoader` hook loads the API; renders `GoogleMap`, `Marker`, `InfoWindow`, `Polyline` components
  - Navigation link: `https://www.google.com/maps/dir/?api=1&destination=...` opened in pilot's `src/pages/pilot/ActiveRide.tsx`

**Payments:**
- BlackCat Pagamentos - Brazilian PIX payment processing
  - Endpoint: `https://api.blackcatpagamentos.com/v1/transactions`
  - Auth: HTTP Basic Auth using `BLACKCAT_PUBLIC_KEY:BLACKCAT_API_KEY` (base64 encoded)
  - Implementation: Supabase Edge Function at `supabase/functions/create-pix-payment/index.ts`
  - Secrets: `BLACKCAT_PUBLIC_KEY` and `BLACKCAT_API_KEY` stored as Supabase Edge Function environment variables
  - Currency: BRL, amounts in centavos
  - Payment method: PIX only (QR code + copy-paste string)

## Data Storage

**Databases:**
- Supabase PostgreSQL (hosted)
  - Project ID: `yrhdcigbbahylzfzbsnk`
  - URL: `https://yrhdcigbbahylzfzbsnk.supabase.co`
  - Client: `@supabase/supabase-js` ^2.99.1; initialized in `src/integrations/supabase/client.ts`
  - Schema defined via migrations in `supabase/migrations/`
  - Key tables: `rides`, `payments`, `passenger_profiles`, `pilot_profiles`, `user_roles`
  - Full type-safe schema at `src/integrations/supabase/types.ts`

**File Storage:**
- Supabase Storage
  - Buckets: `avatars` (user profile photos), `boat-photos` (pilot boat images)
  - Upload logic in `src/hooks/useAuth.ts` — `uploadPhoto()` method
  - Files stored as `{userId}/{timestamp}.{ext}`

**Caching:**
- TanStack React Query in-memory cache (`src/App.tsx` — `new QueryClient()`)
- Supabase session persisted to `localStorage` (configured in `src/integrations/supabase/client.ts`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: `src/hooks/useAuth.ts`, exposed via `src/contexts/AuthContext.tsx`
  - Session storage: `localStorage` with `persistSession: true` and `autoRefreshToken: true`
  - Supported methods:
    - Email/password: `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`
    - Phone/OTP (SMS): `supabase.auth.signInWithOtp({ phone })` + `supabase.auth.verifyOtp()`
  - Auth state listener: `supabase.auth.onAuthStateChange()` in `src/hooks/useAuth.ts`
  - Email redirect URL: `${window.location.origin}/` on sign-up

**Role System:**
- Custom role table (`user_roles`) with values `passenger` | `pilot`
- Role checked on login, stored in React state via `useAuth` hook
- Route protection via `src/components/ProtectedRoute.tsx` with `requiredRole` prop

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry, Datadog, or similar service integrated

**Logs:**
- `console.error` / `console.log` throughout `src/` and Edge Functions
- Supabase Edge Function logs viewable in Supabase dashboard

## CI/CD & Deployment

**Hosting:**
- Supabase (backend: database, auth, storage, edge functions)
- Frontend hosting platform not explicitly configured — no Vercel/Netlify config files detected
- Built via `npm run build` (Vite); outputs static assets to `dist/`

**CI Pipeline:**
- None detected — no `.github/workflows/`, `.circleci/`, or similar

## Environment Configuration

**Required env vars (Edge Functions — set in Supabase dashboard):**
- `BLACKCAT_PUBLIC_KEY` — BlackCat payment public key
- `BLACKCAT_API_KEY` — BlackCat payment secret key
- `SUPABASE_URL` — Auto-injected by Supabase runtime
- `SUPABASE_SERVICE_ROLE_KEY` — Auto-injected by Supabase runtime

**Frontend config (hardcoded in source — not from env):**
- Supabase URL and anon key: hardcoded in `src/integrations/supabase/client.ts` (anon/publishable key, acceptable for client-side)
- Google Maps API key: hardcoded in `src/components/GoogleMapView.tsx` line 89 (security concern — should be env var)

**Secrets location:**
- Edge Function secrets: stored in Supabase project dashboard (not in codebase)
- Frontend publishable keys: committed to `src/integrations/supabase/client.ts`

## Webhooks & Callbacks

**Incoming:**
- `supabase/functions/payment-webhook/index.ts` — Receives payment status updates from BlackCat Pagamentos
  - URL pattern: `{SUPABASE_URL}/functions/v1/payment-webhook`
  - Registered as `postbackUrl` when creating PIX transaction in `create-pix-payment/index.ts`
  - Handles events: `payment.confirmed`, `payment.paid`, `payment.approved`, `pix.confirmed`, `pix.expired`, `payment.failed`, `payment.cancelled`
  - On success: updates `payments.status = 'completed'` and `rides.payment_status = 'paid'`

**Outgoing:**
- BlackCat Pagamentos API: `POST https://api.blackcatpagamentos.com/v1/transactions` from Edge Function
- Google Maps navigation: `window.open()` to `https://www.google.com/maps/dir/...` from `src/pages/pilot/ActiveRide.tsx`

## Realtime

**Supabase Realtime:**
- Used for live ride status updates via Postgres Changes subscriptions
  - `src/hooks/useRideSubscription.ts` — subscribes to `rides` table changes for passenger-side tracking
  - `src/hooks/usePilotStats.ts` — subscribes to `rides` table changes for pilot dashboard stats
  - `src/hooks/useConnectionStatus.ts` — monitors Supabase realtime connection health
- Pilot GPS updates pushed via polling interval (every 5000ms by default) writing to `rides.pilot_lat`/`rides.pilot_lng` in `src/hooks/usePilotGPS.ts`

## Browser APIs

**Geolocation:**
- `navigator.geolocation.getCurrentPosition()` — used in `src/hooks/usePilotGPS.ts` to track pilot position

**Notifications:**
- Browser `Notification` API — used in `src/hooks/useNotifications.ts` for ride status alerts
  - Requests permission on demand
  - Triggers for: ride accepted, pilot arriving, ride started, ride completed, new ride available (pilot)

---

*Integration audit: 2026-03-12*
