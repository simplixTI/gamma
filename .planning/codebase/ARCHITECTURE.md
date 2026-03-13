# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Feature-segmented Single-Page Application (SPA) with role-based dual-portal design

**Key Characteristics:**
- Two distinct user portals: Passenger and Pilot, each with their own page tree and navigation drawer
- React Context provides global auth and ride state, consumed by all pages via custom hooks
- Supabase Realtime (postgres_changes) drives live ride status updates with polling fallback
- Edge Functions (Deno/Supabase) handle server-side payment processing; all other logic lives client-side
- No dedicated state management library — state is split between two React Contexts and local component state

## Layers

**Routing / Entry Shell:**
- Purpose: Wraps the entire app with providers and defines all SPA routes
- Location: `src/App.tsx`, `src/main.tsx`
- Contains: QueryClientProvider, AuthProvider, SettingsInitializer, AppProvider, BrowserRouter, all Route declarations
- Depends on: All context providers, all page components
- Used by: `index.html` via `src/main.tsx`

**Pages:**
- Purpose: Full-screen views, each mapped 1:1 to a URL route; own data-fetching and local state
- Location: `src/pages/` (sub-directories: `auth/`, `passenger/`, `pilot/`)
- Contains: Role-specific screens (auth flows, dashboards, ride flow, history, profile, settings, earnings)
- Depends on: Contexts, hooks, services, components
- Used by: Router in `src/App.tsx`

**Context / Global State:**
- Purpose: App-wide shared state without prop drilling
- Location: `src/contexts/AuthContext.tsx`, `src/contexts/AppContext.tsx`
- Contains: AuthContext (user session, role, passenger/pilot profiles), AppContext (ride lifecycle state, origin/destination, price calculations)
- Depends on: `src/hooks/useAuth.ts`, `src/integrations/supabase/client.ts`
- Used by: All pages and components that need auth or ride state

**Custom Hooks:**
- Purpose: Encapsulate async logic, side effects, and subscriptions; reusable across pages
- Location: `src/hooks/`
- Contains: `useAuth`, `useRideSubscription`, `usePilotGPS`, `useSettings`, `useNotifications`, `useNotificationSound`, `usePilotStats`, `useConnectionStatus`, `use-mobile`, `use-toast`
- Depends on: Supabase client, browser APIs (Geolocation, Notification), contexts
- Used by: Pages and SettingsInitializer

**Services:**
- Purpose: Stateless Supabase data operations extracted from components
- Location: `src/services/rideService.ts`
- Contains: `createRide`, `cancelRide`, `getCurrentRide`
- Depends on: `src/integrations/supabase/client.ts`, `src/types/index.ts`
- Used by: Passenger pages

**Integrations:**
- Purpose: Auto-generated Supabase client and TypeScript types for the database schema
- Location: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`
- Contains: Typed `supabase` singleton, full Database type definition
- Depends on: `@supabase/supabase-js`
- Used by: All hooks and services that query the database

**Components:**
- Purpose: Reusable UI building blocks; split between domain-specific and generic primitives
- Location: `src/components/` (domain), `src/components/ui/` (shadcn/ui primitives), `src/components/layout/` (drawer navigation)
- Contains: Map views, ride cards, modals, banners, ProtectedRoute, SettingsInitializer
- Depends on: Contexts, hooks, Supabase client (some components fetch directly)
- Used by: Pages

**Utilities:**
- Purpose: Pure helper functions for validation, retry logic, and class merging
- Location: `src/utils/profileValidation.ts`, `src/utils/retryOperation.ts`, `src/utils/validators.ts`, `src/lib/utils.ts`
- Contains: `validatePilotProfile`, `validatePassengerProfile`, `retryOperation`, `safeDbOperation`, `getFriendlyErrorMessage`, `cn`
- Depends on: Nothing (pure functions)
- Used by: Pages, hooks

**Types:**
- Purpose: Shared TypeScript interfaces and union types
- Location: `src/types/index.ts`
- Contains: `UserRole`, `Location`, `Pilot`, `Ride`, `RideStatus`, `DbRide`
- Depends on: Nothing
- Used by: All layers

**Static Data:**
- Purpose: Hardcoded waterway location fixtures and mock entities used as seed data for the UI
- Location: `src/data/mockData.ts`
- Contains: Six real `Location` entries (Ilha da Gigoia area), `mockPilot`, `mockPassenger`, `mockRides`
- Depends on: `src/types/index.ts`
- Used by: AppContext, PassengerHome, RideRequestCard

**Edge Functions (Server-side):**
- Purpose: Server-side payment creation and webhook handling that requires secret API keys
- Location: `supabase/functions/create-pix-payment/index.ts`, `supabase/functions/payment-webhook/index.ts`
- Contains: PIX payment creation via BlackCat Pagamentos API, payment record persistence, webhook ingestion
- Depends on: Deno runtime, Supabase service role client
- Used by: Passenger payment pages (invoked via `supabase.functions.invoke`)

## Data Flow

**Passenger Ride Request Flow:**

1. Passenger authenticates via `PassengerAuth` → `useAuth` creates/fetches profile from `passenger_profiles` table
2. `PassengerHome` calls `getCurrentRide` (rideService) on mount and polls every 5 seconds to detect active rides
3. Passenger selects origin from `locations` fixture, navigates to `/passenger/request` (`RequestRide`)
4. `RequestRide` uses `AppContext.calculatePrice()` to compute fare based on coordinate distance; user confirms
5. `createRide` (rideService) inserts a `rides` row with `status: 'pending'`
6. Passenger lands on `/passenger/searching`; `useRideSubscription` subscribes to postgres_changes on that ride row
7. Pilot accepts ride → DB row updates to `status: 'accepted'`; subscription fires `notifyRideAccepted`; passenger navigates to `/passenger/tracking`
8. Ride progresses: `pilot_arriving` → `in_progress` → `completed` via pilot UI; each DB write triggers realtime callbacks
9. On completion, passenger navigates to payment via `/passenger/payment`; Edge Function `create-pix-payment` is called to generate PIX QR code

**Pilot Ride Acceptance Flow:**

1. Pilot authenticates via `PilotAuth`, profile fetched from `pilot_profiles`
2. `PilotDashboard` mounts; if `isPilotOnline` (AppContext), subscribes to `rides` INSERT events for `status=pending`
3. New ride appears as `RideRequestCard`; `usePilotStats` fetches today's earnings and ride count
4. Pilot taps Accept → `validatePilotProfile` checks completeness; if invalid, shows `ProfileIncompleteModal`
5. `safeDbOperation` wraps a Supabase UPDATE: sets `status: 'accepted'`, writes `pilot_id`, `pilot_name`, `pilot_phone`, `accepted_at`
6. Pilot navigates to `/pilot/ride/:rideId` (`ActiveRide`); `usePilotGPS` begins polling `navigator.geolocation` every 5 s, writing `pilot_lat`/`pilot_lng` to the rides row
7. Pilot manually advances status: `pilot_arriving` → `in_progress` → `completed` via buttons in `ActiveRide`

**Authentication Flow:**

1. App loads → `AuthProvider` calls `supabase.auth.getSession()` and sets up `onAuthStateChange` listener
2. On session present, `fetchUserRole` queries `user_roles` table, then fetches the appropriate profile (`passenger_profiles` or `pilot_profiles`)
3. `ProtectedRoute` checks `useAuthContext().user` and `role`; redirects to `/auth/passenger` or `/auth/pilot` if unauthed, or to correct dashboard if role mismatch

**State Management:**
- `AuthContext`: Session, user object, role, full profile objects — updated by Supabase auth events
- `AppContext`: Ephemeral ride state (origin, destination, rideStatus, currentPilot, passengerCount) — updated by page components; reset on ride completion
- Local component state: UI toggles, loading flags, ride lists in dashboard pages
- `useSettings`: User preferences synced to `user_settings` table via upsert; dark mode applied directly to `document.documentElement`

## Key Abstractions

**ProtectedRoute:**
- Purpose: Role-aware route guard
- Examples: `src/components/ProtectedRoute.tsx`
- Pattern: Wraps every authenticated route in `App.tsx`; reads `user` and `role` from AuthContext; redirects based on auth state and role mismatch

**useRideSubscription:**
- Purpose: Encapsulates Supabase Realtime channel setup and ride status transition notifications
- Examples: `src/hooks/useRideSubscription.ts`
- Pattern: One hook instance per active ride screen; handles INSERT (new ride for pilot) and UPDATE (status changes for passenger); cleans up channel on unmount

**safeDbOperation:**
- Purpose: Retry wrapper for Supabase writes with exponential backoff and friendly error messages
- Examples: `src/utils/retryOperation.ts`
- Pattern: Used in `PilotDashboard` ride acceptance to handle race conditions when multiple pilots attempt to accept simultaneously

**DbRide / Ride duality:**
- Purpose: `DbRide` mirrors the raw Supabase schema (snake_case); `Ride` is the camelCase app model
- Examples: `src/types/index.ts`
- Pattern: `PilotDashboard.dbRideToRide()` converts between shapes for display components

**Location coordinates convention:**
- Purpose: Coordinates stored as `[longitude, latitude]` (GeoJSON order) throughout the app
- Examples: `src/types/index.ts` (documented in JSDoc), `src/services/rideService.ts` (reverses on DB write: `origin_lat: coordinates[1]`)
- Pattern: Always access `coordinates[1]` for lat, `coordinates[0]` for lng when passing to map or DB

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`, Vite injects the module
- Responsibilities: Mounts `<App />` into `#root` DOM node; imports global CSS

**App Shell:**
- Location: `src/App.tsx`
- Triggers: Rendered by `main.tsx`
- Responsibilities: Establishes provider hierarchy (QueryClient → Auth → SettingsInitializer → App → Tooltip → Router), declares all routes with role guards

**Landing Page:**
- Location: `src/pages/Landing.tsx`
- Triggers: Route `/`
- Responsibilities: Role-select entry point; auto-redirects authenticated users to their dashboard

**Auth Pages:**
- Location: `src/pages/auth/PassengerAuth.tsx`, `src/pages/auth/PilotAuth.tsx`
- Triggers: Routes `/auth/passenger`, `/auth/pilot`
- Responsibilities: Email/password sign-up and sign-in; OTP phone login; profile creation on first sign-up

## Error Handling

**Strategy:** Errors are caught at the call site; displayed via `sonner` toast notifications; no global error boundary.

**Patterns:**
- Service functions (`rideService.ts`) throw on Supabase error; callers catch and show toast
- `safeDbOperation` wraps operations in try/catch with retry; returns `{ data, error }` tuple; callers check `error` string
- Auth errors in `useAuth` throw directly; auth page components catch and display inline messages
- Edge Functions return `{ success: false, error: string }` on failure; clients check `success` flag

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout; prefixed with component name in brackets (e.g., `[getCurrentRide]`, `[RetryOperation]`)

**Validation:** Input validation at form submit time in auth pages; profile completeness validated in `src/utils/profileValidation.ts` before ride acceptance; coordinate format documented via JSDoc in `src/types/index.ts`

**Authentication:** Supabase Auth (email+password, phone OTP); session persisted to `localStorage`; role stored in `user_roles` table; enforced client-side via `ProtectedRoute`

---

*Architecture analysis: 2026-03-12*
