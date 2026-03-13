# Testing Patterns

**Analysis Date:** 2026-03-12

## Test Framework

**Runner:** None configured

No test runner, test framework, or assertion library is installed or configured in this project.

**Evidence:**
- `package.json` has no `test` script
- No `jest.config.*`, `vitest.config.*`, or similar config files exist
- No `@testing-library/*`, `jest`, `vitest`, `mocha`, or equivalent in `dependencies` or `devDependencies`
- No `.spec.*` or `.test.*` files exist anywhere in the project

**Run Commands:**
```bash
# No test commands configured — package.json scripts are:
npm run dev       # Vite dev server
npm run build     # Production build
npm run lint      # ESLint only
npm run preview   # Preview production build
```

## Test File Organization

**Location:** Not applicable — no test files exist

**Naming:** Not applicable

**Structure:** Not applicable

## Test Structure

**Suite Organization:** Not applicable — no tests exist

## Mocking

**Framework:** None

## Fixtures and Factories

**Test Data:** None — but `src/data/mockData.ts` exists as a runtime mock for development/demo purposes (not a test fixture):
- Contains `locations` array of `Location` objects with hardcoded coordinates
- Contains `mockPilot` object used in `src/contexts/AppContext.tsx`
- This is imported by production code, not test code

**Location:** `src/data/mockData.ts`

## Coverage

**Requirements:** None — no coverage tooling configured

## Test Types

**Unit Tests:** Not used

**Integration Tests:** Not used

**E2E Tests:** Not used

## State of Testing in This Codebase

This codebase has **zero automated tests**. All quality assurance appears to be manual. The following areas are completely untested:

**Critical untested logic:**
- `src/utils/validators.ts` — CPF validation algorithm (`validateCPF`) and formatting (`formatCPF`, `formatPhone`) are pure functions with deterministic behavior; highest priority for unit tests
- `src/utils/retryOperation.ts` — retry logic with exponential backoff (`retryOperation`, `safeDbOperation`, `getFriendlyErrorMessage`) — pure/deterministic, ideal for unit tests
- `src/utils/profileValidation.ts` — profile completeness validation (`validatePassengerProfile`, `validatePilotProfile`) — pure functions
- `src/services/rideService.ts` — Supabase database operations (`createRide`, `cancelRide`, `getCurrentRide`)
- `src/hooks/useAuth.ts` — authentication flow, role fetching, profile upsert logic
- `src/hooks/useRideSubscription.ts` — realtime subscription channel setup and status transition logic
- `src/contexts/AppContext.tsx` — price, distance, and time calculation functions (`calculatePrice`, `calculateDistance`, `calculateTime`)

## Recommended Setup (if tests are added)

Based on the stack (Vite + React + TypeScript), the standard choice would be:

**Runner:** Vitest (native Vite integration, no separate bundler config)
**DOM environment:** `@testing-library/react` + `@testing-library/user-event`
**Assertion:** Vitest built-in (`expect`) + `@testing-library/jest-dom` matchers

**Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

**Config addition to `vite.config.ts`:**
```typescript
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
}
```

**Recommended test file placement:** Co-located with source files
```
src/utils/validators.ts
src/utils/validators.test.ts   ← co-located

src/hooks/useAuth.ts
src/hooks/useAuth.test.ts      ← co-located
```

**Example pattern for pure utility (highest priority to add):**
```typescript
// src/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateCPF, formatCPF, formatPhone } from './validators';

describe('validateCPF', () => {
  it('returns true for a valid CPF', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it('returns false for all-same-digit CPF', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
  });

  it('returns false for wrong length', () => {
    expect(validateCPF('123')).toBe(false);
  });
});
```

**Example pattern for hook testing:**
```typescript
// src/hooks/useSettings.test.ts
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));
```

---

*Testing analysis: 2026-03-12*
