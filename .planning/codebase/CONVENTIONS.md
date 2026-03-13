# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` (e.g., `PilotCard.tsx`, `PassengerHome.tsx`)
- Custom hooks: camelCase with `use` prefix `.ts` (e.g., `useAuth.ts`, `useRideSubscription.ts`)
- Utility functions: camelCase `.ts` (e.g., `validators.ts`, `retryOperation.ts`)
- Context files: PascalCase ending in `Context.tsx` (e.g., `AuthContext.tsx`, `AppContext.tsx`)
- Service files: camelCase ending in `Service.ts` (e.g., `rideService.ts`)
- Type files: `index.ts` inside `src/types/`
- UI primitives: lowercase hyphenated in `src/components/ui/` (e.g., `button.tsx`, `alert-dialog.tsx`)

**Functions:**
- React components: PascalCase (e.g., `const PilotCard: React.FC<PilotCardProps>`)
- Custom hooks: camelCase with `use` prefix (e.g., `export function useAuth()`, `export const useSettings = ()`)
- Async service functions: camelCase descriptive verbs (e.g., `createRide`, `cancelRide`, `getCurrentRide`)
- Utility functions: camelCase verbs (e.g., `validateCPF`, `formatPhone`, `retryOperation`, `safeDbOperation`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleRideCancelled`, `handleLocationSelect`, `handleSearchClick`)
- Callbacks passed as props: camelCase with `on` prefix (e.g., `onCall`, `onMessage`, `onRideUpdate`)

**Variables:**
- Local state: camelCase noun/noun-phrase (e.g., `activeRide`, `isPilotOnline`, `drawerOpen`)
- Boolean state: `is`/`has`/`show` prefix (e.g., `isLoaded`, `isSaving`, `showNotificationBanner`)
- Constants: UPPER_SNAKE_CASE for module-level defaults (e.g., `DEFAULT_OPTIONS`, `DEFAULT_SETTINGS`)
- Database-mapped fields: snake_case (e.g., `full_name`, `passenger_device_id`, `photo_url`)
- App-layer fields: camelCase (e.g., `fullName`, `passengerCount`, `boatType`)

**Types and Interfaces:**
- Interfaces: PascalCase with `I` not used (e.g., `interface PilotCardProps`, `interface UserSettings`)
- Props interfaces: PascalCase component name + `Props` suffix (e.g., `PilotCardProps`, `ProtectedRouteProps`)
- Type aliases: PascalCase (e.g., `type UserRole = 'passenger' | 'pilot'`, `type RideStatus`)
- Context type interfaces: PascalCase + `Type` suffix (e.g., `AppContextType`, `AuthContextType`)
- Database row interfaces: `Db` prefix (e.g., `DbRide`)
- Validation result interfaces: PascalCase + `Validation` suffix (e.g., `PassengerProfileValidation`)

## Code Style

**Formatting:**
- No Prettier config detected — formatting is not enforced by tooling
- Indentation: 2 spaces
- Quotes: single quotes for imports and string literals
- Semicolons: used consistently
- Trailing commas: used in multi-line objects/arrays

**Linting:**
- ESLint with `typescript-eslint` and `eslint-plugin-react-hooks`
- `@typescript-eslint/no-unused-vars` is explicitly turned OFF
- `react-refresh/only-export-components` set to `warn`
- `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` enforced via plugin defaults
- TypeScript `strictNullChecks: false` and `noImplicitAny: false` — loose type safety

## Import Organization

**Order (observed pattern):**
1. React and React ecosystem (e.g., `react`, `react-router-dom`)
2. External libraries (e.g., `@tanstack/react-query`, `lucide-react`, `sonner`)
3. Internal path-aliased imports using `@/` (e.g., `@/components/ui/button`, `@/contexts/AuthContext`)
4. Relative imports (rare — avoided in favor of `@/` alias)

**Path Aliases:**
- `@/` maps to `./src/` — use for all cross-directory imports
- Configured in both `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`)

**Example:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
```

## Component Patterns

**Functional Components:**
- Always arrow functions assigned to `const` for page/feature components
- `React.FC<Props>` typing used for components with explicit props
- `React.forwardRef` used for UI primitives that wrap DOM elements (see `src/components/ui/button.tsx`)
- Named function style used for some hooks (e.g., `export function useAuth()`)

**Props Pattern:**
```typescript
interface PilotCardProps {
  pilot: Pilot;
  arrivalTime?: number;
  onCall?: () => void;
}

const PilotCard: React.FC<PilotCardProps> = ({ pilot, arrivalTime, onCall }) => {
  // ...
};

export default PilotCard;
```

**Context Pattern:**
- Context created with `createContext<Type | undefined>(undefined)`
- Provider wraps logic hook (e.g., `AuthContext` wraps `useAuth` hook)
- Consumer hook throws descriptive error if used outside provider:
```typescript
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
```

**UI Components (shadcn/ui pattern):**
- `cva` (class-variance-authority) for variant-based styling
- `cn()` utility from `src/lib/utils.ts` for conditional Tailwind class merging
- `displayName` set on forwardRef components

## Styling

**Tailwind CSS:**
- All styling via Tailwind utility classes directly in JSX
- Design tokens use CSS variables via Tailwind config (e.g., `bg-card`, `text-foreground`, `border-primary`)
- Responsive modifiers rare — mobile-first, full-screen layout assumed
- Animation via `tailwindcss-animate` plugin
- Custom classes like `safe-area-top` for mobile notch handling
- `cn()` used to compose classes conditionally:
```typescript
className={cn(buttonVariants({ variant, size, fullWidth, className }))}
```

## Error Handling

**Async Operations:**
- Supabase calls destructure `{ data, error }` — check `error` before using `data`
- Service functions throw errors to callers; UI components catch in try/catch
- `retryOperation()` in `src/utils/retryOperation.ts` wraps critical DB ops with exponential backoff
- `safeDbOperation()` wraps retry with friendly user-facing error messages (Portuguese)
- `getFriendlyErrorMessage()` maps technical errors to Portuguese UI strings

**Pattern:**
```typescript
// Service layer — throw on error
const { data, error } = await supabase.from('rides').insert({...}).select().single();
if (error) {
  console.error('Error creating ride:', error);
  throw error;
}

// UI layer — catch and handle
try {
  await someOperation();
} catch (error) {
  console.error('Context message:', error);
}
```

**Guards:**
- Null/undefined guards via early return: `if (!user?.id) return;`
- Optional chaining pervasive: `session?.user ?? null`, `pilot?.id`

## Logging

**Framework:** Native `console` — no logging library used

**Patterns:**
- `console.error()` for Supabase errors and caught exceptions — always with descriptive prefix string
- `console.log()` for debug/tracing with `[ComponentName]` bracket prefix (e.g., `[getCurrentRide]`, `[PassengerHome]`)
- `console.warn()` not widely used
- 96 total `console.*` calls across 31 files — logging is heavy and not guarded by environment flag

**Example:**
```typescript
console.error('Error creating ride:', error);
console.log('[getCurrentRide] Found active ride:', data?.id, 'status:', data?.status);
```

## Comments

**When to Comment:**
- JSDoc used for utility functions with `@param` and `@returns` tags (see `src/utils/validators.ts`)
- Critical implementation notes placed as inline comments (e.g., coordinate format warnings in `src/types/index.ts`)
- Section headers in long files using `//` comments (e.g., `// Polling a cada 5 segundos como fallback`)
- Brazilian Portuguese comments used in business logic (matches app locale)

**JSDoc Example:**
```typescript
/**
 * Validates a Brazilian CPF number with check digit verification
 * @param cpf - CPF string (with or without formatting)
 * @returns true if valid, false otherwise
 */
export function validateCPF(cpf: string): boolean {
```

## Function Design

**Size:** No enforced limit; hooks can exceed 200 lines (e.g., `useAuth.ts` is 347 lines)

**Parameters:** Object destructuring for multi-param functions; primitive params for simple utilities

**Return Values:**
- Hooks return named object: `return { user, loading, signOut, ... }`
- Service functions return `data` directly or throw
- `safeDbOperation` returns `{ data, error }` wrapped result

## Module Design

**Exports:**
- Pages: `export default ComponentName`
- UI primitives: named exports + default export (e.g., `export { Button, buttonVariants }`)
- Hooks: named export function (`export function useAuth()` or `export const useSettings = ()`)
- Services: named exports for each function (`export const createRide = async ...`)
- Utils: named exports for each function

**Barrel Files:** No index barrel files — imports go directly to the source file

---

*Convention analysis: 2026-03-12*
