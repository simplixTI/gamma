# Codebase Structure

**Analysis Date:** 2026-03-12

## Directory Layout

```
project-root/
├── src/                        # All application source code
│   ├── main.tsx                # App bootstrap / DOM mount
│   ├── App.tsx                 # Provider tree + route definitions
│   ├── App.css                 # Global CSS overrides
│   ├── index.css               # Tailwind base + CSS variables (design tokens)
│   ├── vite-env.d.ts           # Vite env type declarations
│   ├── pages/                  # Full-screen route components
│   │   ├── Landing.tsx         # Role-select entry point (/)
│   │   ├── Index.tsx           # Redirect stub
│   │   ├── NotFound.tsx        # 404 page
│   │   ├── auth/               # Unauthenticated auth flows
│   │   │   ├── PassengerAuth.tsx
│   │   │   └── PilotAuth.tsx
│   │   ├── passenger/          # Passenger-only pages (all protected)
│   │   │   ├── PassengerHome.tsx
│   │   │   ├── RequestRide.tsx
│   │   │   ├── SearchingPilot.tsx
│   │   │   ├── Tracking.tsx
│   │   │   ├── InRide.tsx
│   │   │   ├── Completed.tsx
│   │   │   ├── RideHistory.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Payment.tsx
│   │   │   ├── Favorites.tsx
│   │   │   └── Settings.tsx
│   │   └── pilot/              # Pilot-only pages (all protected)
│   │       ├── PilotDashboard.tsx
│   │       ├── ActiveRide.tsx
│   │       ├── PilotHistory.tsx
│   │       ├── PilotProfile.tsx
│   │       ├── PilotProfileEdit.tsx
│   │       ├── Earnings.tsx
│   │       └── PilotSettings.tsx
│   ├── components/             # Reusable React components
│   │   ├── layout/             # Navigation drawers
│   │   │   ├── PassengerDrawer.tsx
│   │   │   └── PilotDrawer.tsx
│   │   ├── ui/                 # shadcn/ui primitive components (generated)
│   │   │   └── [40+ files]    # button, card, dialog, input, toast, etc.
│   │   ├── ProtectedRoute.tsx  # Route guard with role enforcement
│   │   ├── SettingsInitializer.tsx  # Dark mode side-effect on mount
│   │   ├── GoogleMapView.tsx   # Google Maps embed
│   │   ├── MapView.tsx         # Alternate/legacy map component
│   │   ├── BottomSheet.tsx     # Sliding bottom panel (passenger home)
│   │   ├── RideRequestCard.tsx # Pilot's incoming ride card
│   │   ├── ActiveRideCard.tsx  # In-progress ride card (both roles)
│   │   ├── RideChat.tsx        # In-ride chat UI
│   │   ├── RideStatusBanner.tsx
│   │   ├── RideTimeline.tsx
│   │   ├── SearchingOverlay.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── PilotCard.tsx
│   │   ├── LocationCard.tsx
│   │   ├── RecentRidesCard.tsx
│   │   ├── RideHistoryFilters.tsx
│   │   ├── RideAcceptedModal.tsx
│   │   ├── ProfileIncompleteModal.tsx
│   │   ├── NotificationPermissionBanner.tsx
│   │   ├── ConnectionStatusBanner.tsx
│   │   ├── TermsModal.tsx
│   │   ├── NavLink.tsx
│   │   └── Logo.tsx
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.tsx     # Auth state + profile operations
│   │   └── AppContext.tsx      # Ride lifecycle state + price calc
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Core auth logic (backing AuthContext)
│   │   ├── useRideSubscription.ts  # Supabase Realtime ride updates
│   │   ├── usePilotGPS.ts      # Geolocation polling → DB write
│   │   ├── usePilotStats.ts    # Today's earnings/rides/rating
│   │   ├── useSettings.ts      # User prefs synced to user_settings table
│   │   ├── useNotifications.ts # Browser Notification API
│   │   ├── useNotificationSound.ts  # Audio alerts
│   │   ├── useConnectionStatus.ts   # Online/offline detection
│   │   ├── use-mobile.tsx      # Viewport width breakpoint detection
│   │   ├── use-toast.ts        # Toast hook (shadcn pattern)
│   │   └── use-toast.ts        # (duplicate in ui/ — see components/ui/)
│   ├── services/               # Stateless Supabase data functions
│   │   └── rideService.ts      # createRide, cancelRide, getCurrentRide
│   ├── integrations/           # External service clients
│   │   └── supabase/
│   │       ├── client.ts       # Typed supabase singleton (auto-generated)
│   │       └── types.ts        # Full Database TypeScript types (auto-generated)
│   ├── types/                  # Shared TypeScript types
│   │   └── index.ts            # UserRole, Location, Pilot, Ride, DbRide, RideStatus
│   ├── data/                   # Static fixture data
│   │   └── mockData.ts         # locations[], mockPilot, mockPassenger, mockRides
│   ├── utils/                  # Pure utility functions
│   │   ├── profileValidation.ts  # validatePassengerProfile, validatePilotProfile
│   │   ├── retryOperation.ts     # retryOperation, safeDbOperation, getFriendlyErrorMessage
│   │   └── validators.ts         # Additional input validators
│   └── lib/                    # Third-party utility wrappers
│       └── utils.ts            # cn() — clsx + tailwind-merge
├── supabase/                   # Supabase project configuration
│   ├── config.toml             # Supabase CLI project config
│   ├── functions/              # Edge Functions (Deno runtime)
│   │   ├── create-pix-payment/ # PIX QR code generation via BlackCat API
│   │   └── payment-webhook/    # Incoming payment status webhook
│   └── migrations/             # Ordered SQL migration files (13 migrations)
├── public/                     # Static assets served at root
├── index.html                  # SPA entry HTML
├── vite.config.ts              # Vite build config (port 8080, @/ alias)
├── tailwind.config.ts          # Tailwind theme config (design tokens)
├── tsconfig.json               # TypeScript project references
├── tsconfig.app.json           # App-specific TS config
├── tsconfig.node.json          # Node/tooling TS config
├── components.json             # shadcn/ui CLI config
├── eslint.config.js            # ESLint rules
├── postcss.config.js           # PostCSS (Tailwind processing)
├── package.json                # npm dependencies + scripts
├── bun.lock / bun.lockb        # Bun lockfile
└── .planning/codebase/         # GSD analysis documents (this file)
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One file per route; contains all layout, local state, and data-fetching for that screen
- Contains: TSX components exported as default, importing from contexts/hooks/services/components
- Key files: `src/pages/passenger/PassengerHome.tsx` (passenger entry), `src/pages/pilot/PilotDashboard.tsx` (pilot entry)

**`src/pages/passenger/`:**
- Purpose: The complete passenger user journey from ride request through payment
- Route map: `PassengerHome` → `RequestRide` → `SearchingPilot` → `Tracking` → `InRide` → `Completed` → `Payment`

**`src/pages/pilot/`:**
- Purpose: The complete pilot workflow from dashboard through active ride management and earnings
- Route map: `PilotDashboard` (ride list) → `ActiveRide` (specific ride management)

**`src/components/ui/`:**
- Purpose: shadcn/ui component library — generated primitives, do not manually edit
- Generated: Yes (via `npx shadcn-ui@latest add [component]`)
- Committed: Yes

**`src/components/layout/`:**
- Purpose: Slide-in navigation drawers for each role
- Key files: `PassengerDrawer.tsx`, `PilotDrawer.tsx`

**`src/hooks/`:**
- Purpose: All async side effects, subscriptions, and derived state outside of contexts
- Naming: `use` prefix + PascalCase noun (e.g., `useRideSubscription`, `usePilotGPS`)

**`src/integrations/supabase/`:**
- Purpose: Auto-generated files from Supabase CLI; regenerate with `supabase gen types typescript`
- Generated: Yes — do not manually edit `client.ts` or `types.ts`

**`supabase/migrations/`:**
- Purpose: Sequential SQL migrations tracked by Supabase CLI
- Naming: timestamp UUID pattern (e.g., `20251212190322_5fd2f7b3-...sql`)
- Generated: Yes (by Supabase Studio or CLI)
- Committed: Yes

**`supabase/functions/`:**
- Purpose: Deno-based Edge Functions deployed to Supabase; run server-side with secret access
- Key files: `create-pix-payment/index.ts`, `payment-webhook/index.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: DOM mount, imports App and global CSS
- `src/App.tsx`: All provider wrappers and route tree
- `index.html`: HTML shell; `<div id="root">` target

**Configuration:**
- `vite.config.ts`: Build config; `@` alias → `./src`; dev port 8080
- `tailwind.config.ts`: Theme tokens (colors, spacing, breakpoints)
- `components.json`: shadcn/ui registry config
- `supabase/config.toml`: Supabase project ID and local dev config

**Core Logic:**
- `src/contexts/AuthContext.tsx` + `src/hooks/useAuth.ts`: Auth lifecycle
- `src/contexts/AppContext.tsx`: Ride state and price/distance/time calculations
- `src/services/rideService.ts`: DB operations for rides
- `src/hooks/useRideSubscription.ts`: Realtime ride event handling
- `src/hooks/usePilotGPS.ts`: GPS polling and position writes
- `src/integrations/supabase/client.ts`: Supabase singleton

**Types:**
- `src/types/index.ts`: All shared domain types
- `src/integrations/supabase/types.ts`: Database schema types

**Utilities:**
- `src/utils/retryOperation.ts`: `safeDbOperation` + retry with backoff
- `src/utils/profileValidation.ts`: Profile completeness checks
- `src/lib/utils.ts`: `cn()` class merging helper

**Static Data:**
- `src/data/mockData.ts`: Hardcoded waterway locations (Ilha da Gigoia area)

## Naming Conventions

**Files:**
- Pages: PascalCase matching the route concept — `PassengerHome.tsx`, `PilotDashboard.tsx`
- Components: PascalCase noun — `RideRequestCard.tsx`, `BottomSheet.tsx`
- Hooks: camelCase with `use` prefix — `useRideSubscription.ts`, `usePilotGPS.ts`
- Services: camelCase noun + `Service` suffix — `rideService.ts`
- Utils: camelCase describing function group — `profileValidation.ts`, `retryOperation.ts`
- Contexts: PascalCase + `Context` suffix — `AuthContext.tsx`, `AppContext.tsx`
- Types file: `index.ts` (barrel)

**Directories:**
- Role-partitioned under `pages/`: `passenger/`, `pilot/`, `auth/`
- Primitive components: `components/ui/` (shadcn, lowercase kebab filenames)
- Layout components: `components/layout/`

## Where to Add New Code

**New Passenger Page:**
- Implementation: `src/pages/passenger/[PageName].tsx`
- Route: Add `<Route>` inside the passenger block in `src/App.tsx`, wrapped in `<ProtectedRoute requiredRole="passenger">`
- Tests: `src/tests/pages/passenger/[PageName].test.tsx` (no test infra currently exists — add alongside)

**New Pilot Page:**
- Implementation: `src/pages/pilot/[PageName].tsx`
- Route: Add `<Route>` inside the pilot block in `src/App.tsx`, wrapped in `<ProtectedRoute requiredRole="pilot">`

**New Shared Component:**
- Implementation: `src/components/[ComponentName].tsx`
- If role-specific layout: `src/components/layout/[ComponentName].tsx`
- If shadcn primitive: add via CLI, lands in `src/components/ui/`

**New Custom Hook:**
- Implementation: `src/hooks/use[HookName].ts` (or `.tsx` if it returns JSX)
- Access Supabase via `import { supabase } from '@/integrations/supabase/client'`
- Access auth state via `import { useAuthContext } from '@/contexts/AuthContext'`

**New Service Function:**
- Add to existing `src/services/rideService.ts` if ride-related
- Create `src/services/[domainName]Service.ts` for new domains

**New Shared Type:**
- Add to `src/types/index.ts`
- If DB-schema type: regenerate via Supabase CLI (auto-updates `src/integrations/supabase/types.ts`)

**New Utility:**
- Add function to the most relevant existing file in `src/utils/`
- Create `src/utils/[name].ts` only if the concern is distinct

**New Edge Function:**
- Create `supabase/functions/[function-name]/index.ts` following the Deno + serve() pattern used in `create-pix-payment`
- Invoke from client via `supabase.functions.invoke('[function-name]', { body: ... })`

**New DB Migration:**
- Create via Supabase Studio (auto-names with timestamp) or CLI: `supabase migration new [description]`
- File lands in `supabase/migrations/`
- Regenerate types after: `supabase gen types typescript --local > src/integrations/supabase/types.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents consumed by /gsd:plan-phase and /gsd:execute-phase
- Generated: Yes (by GSD mapper agents)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Flow agent definitions, skills, and command configurations
- Generated: Yes (by claude-flow CLI)
- Committed: Yes

**`.claude-flow/`:**
- Purpose: claude-flow runtime data (agents, hooks, learning, metrics)
- Generated: Yes (by claude-flow daemon)
- Committed: Partially (configuration yes; runtime data review before committing)

**`node_modules/`:**
- Purpose: npm/bun package dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-12*
