# Phase 2: Tabela de Preços por Trecho - Research

**Researched:** 2026-03-13
**Domain:** TypeScript data structures, React Context, fixed-price lookup tables
**Confidence:** HIGH

---

## Summary

This phase replaces the existing haversine-based `calculatePrice()` in `AppContext.tsx` with a flat lookup table: a nested object keyed by `originId → destinationId → price`. The table lives in a new file `src/data/pricingData.ts` (exported as a plain `const` object) so the owner can update values by editing a single file. All six piers are identified by string IDs `'1'` through `'6'` matching the `Location.id` values in `mockData.ts`.

The change is surgical: only `calculatePrice()` in `AppContext.tsx` changes. No components need modification because every consumer already reads `calculatePrice()` from context and formats the returned `number`. The price stored in the Supabase `rides` table (`price: totalPrice`) already comes from `calculatePrice() * passengerCount`, so the DB column does not change either.

`calculateDistance()` and `calculateTime()` remain intact — they display supplemental info (km, minutes) in `RequestRide.tsx` and are independent of pricing.

**Primary recommendation:** Create `src/data/pricingData.ts` with an `PRICE_TABLE` constant (Record of Records), then replace the haversine body of `calculatePrice()` in `AppContext.tsx` with a two-line lookup. No other files change.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R2.3 | Ver preço calculado antes de confirmar | `calculatePrice()` is called at line 39 of `RequestRide.tsx`; result shown at line 302. Replacing the function body is sufficient — no JSX changes needed. |
| R2.12 | Tabela de preços fixa por par de piers | A nested-object lookup keyed by pier IDs satisfies this requirement. The data structure must be easily editable by a non-developer (plain object literal). |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (built-in) | 5.x (project's tsconfig) | `Record<string, Record<string, number>>` type for the matrix | Zero dependencies, enforces exhaustiveness |
| React Context (built-in) | 18.x | `calculatePrice()` already lives in `AppContext` | No new dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | — |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

The only new file is:
```
src/
├── data/
│   ├── mockData.ts          # existing — piers, mock rides
│   └── pricingData.ts       # NEW — PRICE_TABLE constant
├── contexts/
│   └── AppContext.tsx        # EDIT — replace calculatePrice() body
```

### Pattern 1: Nested-Object Price Lookup (Record of Records)

**What:** A plain TypeScript object `PRICE_TABLE[originId][destinationId]` returns the fixed price in BRL.

**When to use:** Any time the number of origin-destination pairs is small and known in advance (here: 6 × 5 = 30 directed pairs, or 15 if symmetric).

**Example — pricingData.ts:**
```typescript
// src/data/pricingData.ts
// Edit these values when the owner defines final prices.
// Keys are Location.id strings ('1'–'6') from mockData.ts.
// All prices in BRL (reais), per person.

export const PRICE_TABLE: Record<string, Record<string, number>> = {
  '1': { '2': 8, '3': 10, '4': 7,  '5': 9,  '6': 12 },
  '2': { '1': 8, '3': 6,  '4': 9,  '5': 11, '6': 13 },
  '3': { '1': 10,'2': 6,  '4': 8,  '5': 10, '6': 14 },
  '4': { '1': 7, '2': 9,  '3': 8,  '5': 7,  '6': 10 },
  '5': { '1': 9, '2': 11, '3': 10, '4': 7,  '6': 11 },
  '6': { '1': 12,'2': 13, '3': 14, '4': 10, '5': 11 },
};

/** Fallback price when the pair is missing from the table. */
export const DEFAULT_PRICE = 10;
```

**Example — updated calculatePrice() in AppContext.tsx:**
```typescript
// Replace the entire calculatePrice function body
import { PRICE_TABLE, DEFAULT_PRICE } from '@/data/pricingData';

const calculatePrice = (): number => {
  if (!origin || !destination) return 0;
  return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
};
```

### Pattern 2: Symmetric vs Asymmetric Prices

**Decision:** Use a fully explicit asymmetric table (all 30 directed pairs spelled out). This is the correct approach because:
- Water taxi routes in an archipelago can have different prices by direction (wind, current, docking fees).
- The owner may want A→B ≠ B→A at any time.
- The table is only 30 entries — explicitness costs nothing and avoids a helper function.
- No transposition logic or symmetry enforcement is needed.

**Do not** use a helper like `getPrice(a, b) = getPrice(b, a)` — it hides the asymmetric capability that the business may need.

### Pattern 3: Where Prices Are Displayed

From codebase search, `calculatePrice()` is called in exactly three places:
1. `src/pages/passenger/RequestRide.tsx:39` — pre-confirmation price display (this phase's primary target)
2. `src/pages/passenger/SearchingPilot.tsx:210` — price shown while searching for pilot
3. `src/pages/passenger/Tracking.tsx:295` — fallback when `currentRide` has no DB price yet

All three call `calculatePrice()` from context and format the returned `number`. Updating `AppContext.tsx` fixes all three simultaneously — no component changes are required.

The `Completed.tsx` page reads `rideData.price` directly from Supabase (line 148) — this is the stored value from when the ride was created. It will automatically reflect the new price once the ride is created with the new table.

### Anti-Patterns to Avoid

- **Storing price logic in the database:** The table belongs in code (editable by the developer on behalf of the owner), not in a Supabase table. The owner doesn't have a DB admin UI; they need to ask the developer. A plain `.ts` file is the simplest hand-off mechanism.
- **A 6×6 matrix with diagonal zeros:** Using a full square matrix (including same-pier entries = 0) adds confusion when iterating. Use the nested-object approach without self-keys.
- **Importing PRICE_TABLE inside AppContext from mockData.ts:** The pricing concern is separate from mock entity data. Keeping it in `pricingData.ts` signals intent and makes it easy to find for updates.
- **Rounding the price at display time only:** The price stored in Supabase must be a clean integer (R$8, R$10). Since the table values are integers, `calculatePrice()` will already return integers — no rounding is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price lookup | Custom distance-interpolation math | Plain object lookup `PRICE_TABLE[a][b]` | The table IS the business rule; math introduces drift from agreed prices |
| Type safety on pier IDs | Runtime validation or enums | `??` fallback to `DEFAULT_PRICE` | IDs are controlled data ('1'–'6'); fallback handles any future pier addition gracefully |
| Synchronisation with DB | Storing the table in Supabase and fetching it | Hardcoded in TS | Zero latency, no network failure surface, owner updates through developer anyway |

---

## Common Pitfalls

### Pitfall 1: Same Origin and Destination
**What goes wrong:** User selects the same pier for origin and destination. `PRICE_TABLE['1']['1']` is `undefined`, returning `DEFAULT_PRICE` instead of 0 or an error.
**Why it happens:** Self-keys are intentionally absent from the table.
**How to avoid:** Add a guard before the lookup: `if (origin.id === destination.id) return 0;` — RequestRide already prevents this via the `loc.id !== origin?.id` filter in the picker dropdown, but the guard in `calculatePrice()` makes the function safe regardless.
**Warning signs:** A non-zero price shown when origin === destination.

### Pitfall 2: Location ID Type Mismatch
**What goes wrong:** `Location.id` is typed as `string` in `types/index.ts`. The `PRICE_TABLE` keys are string literals. No issue as long as IDs remain `'1'`–`'6'`. If a new pier is added with `id: 7` (number) the lookup silently falls back.
**Why it happens:** `mockData.ts` uses string IDs; any future pier data source must also produce strings.
**How to avoid:** `DEFAULT_PRICE` fallback handles unknown IDs gracefully. Document in `pricingData.ts` that keys must be string IDs matching `Location.id`.

### Pitfall 3: PassengerCount Multiplication Already Handled in RequestRide
**What goes wrong:** Accidentally double-multiplying `passengerCount`.
**Why it happens:** `calculatePrice()` returns the per-person base price. `RequestRide.tsx:40` does `pricePerPerson * passengerCount = totalPrice`. Then `totalPrice` is passed to the DB insert at line 72. This pattern must be preserved.
**How to avoid:** `calculatePrice()` must continue to return the per-person price only. The table values are per-person prices.

### Pitfall 4: SearchingPilot and Tracking Use calculatePrice() as Fallback
**What goes wrong:** If `calculatePrice()` returns 0 (no origin/destination set), the price shown in `SearchingPilot.tsx:310` will be R$0.
**Why it happens:** These pages read origin/destination from AppContext, which is set before navigation. As long as the user goes through the normal flow (RequestRide → Searching), origin and destination are set.
**How to avoid:** No change needed — the existing pattern is correct. The new table lookup will return the correct value when origin and destination are set.

---

## Code Examples

### Full pricingData.ts file
```typescript
// Source: Project analysis — piers from src/data/mockData.ts
// IDs: '1' = Pier Principal Gigoia, '2' = Marina Barra Clube,
//       '3' = Pier Ilha Itanhangá, '4' = Pier Norte Gigoia,
//       '5' = Pier Ilha Primeira, '6' = Canal de Marapendi
// PLACEHOLDER VALUES — replace with owner-approved prices before launch.
// All values in BRL, per person.

export const PRICE_TABLE: Record<string, Record<string, number>> = {
  '1': { '2': 8,  '3': 10, '4': 7,  '5': 9,  '6': 12 },
  '2': { '1': 8,  '3': 6,  '4': 9,  '5': 11, '6': 13 },
  '3': { '1': 10, '2': 6,  '4': 8,  '5': 10, '6': 14 },
  '4': { '1': 7,  '2': 9,  '3': 8,  '5': 7,  '6': 10 },
  '5': { '1': 9,  '2': 11, '3': 10, '4': 7,  '6': 11 },
  '6': { '1': 12, '2': 13, '3': 14, '4': 10, '5': 11 },
};

export const DEFAULT_PRICE = 10;
```

### Updated calculatePrice() in AppContext.tsx
```typescript
// Replace lines 57–69 of src/contexts/AppContext.tsx
// Add import at top: import { PRICE_TABLE, DEFAULT_PRICE } from '@/data/pricingData';

const calculatePrice = (): number => {
  if (!origin || !destination) return 0;
  if (origin.id === destination.id) return 0;
  return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
};
```

### No JSX Changes Required
`RequestRide.tsx` already handles the per-person/total display correctly:
```typescript
// lines 39-40 — unchanged, works with new table
const pricePerPerson = calculatePrice();          // now reads from table
const totalPrice = pricePerPerson * passengerCount;

// line 300-303 — unchanged
{passengerCount > 1 ? `${passengerCount}x R$${pricePerPerson.toFixed(0)}` : 'total'}
R${totalPrice.toFixed(0)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Distance-based interpolation (haversine) | Fixed table lookup per pier pair | Phase 2 | Prices become predictable and owner-controlled |

**Not deprecated in this phase:**
- `calculateDistance()` — still used for the km display in RequestRide
- `calculateTime()` — still used for the minutes display in RequestRide
- Both haversine helper functions stay; only `calculatePrice()` changes

---

## Open Questions

1. **Final price values**
   - What we know: Owner (Lucas) has not yet defined the prices. STATE.md explicitly flags this as a blocker.
   - What's unclear: Whether prices are per-person or per-boat, whether weekend/peak pricing will ever apply.
   - Recommendation: Use placeholder integers (R$7–R$14 range, realistic for short water taxi hops in Rio) and add a clear `// PLACEHOLDER VALUES` comment in `pricingData.ts`. The structure makes it trivial to update later.

2. **Same-pier edge case in UI**
   - What we know: The location picker already filters out the selected origin when showing destination options (and vice versa), so the user cannot normally select the same pier twice.
   - What's unclear: Whether this filter is enforced everywhere (e.g., deep links, programmatic navigation).
   - Recommendation: Add the `if (origin.id === destination.id) return 0` guard in `calculatePrice()` as a defense-in-depth measure.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test config files, no `__tests__` directory, no test scripts in package.json) |
| Config file | None — Wave 0 must create |
| Quick run command | `npm test` (once configured) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R2.12 | `calculatePrice()` returns table value for known pair | unit | `npm test -- pricingData` | Wave 0 |
| R2.12 | `calculatePrice()` returns 0 for same-pier pair | unit | `npm test -- pricingData` | Wave 0 |
| R2.12 | `calculatePrice()` returns DEFAULT_PRICE for unknown pair | unit | `npm test -- pricingData` | Wave 0 |
| R2.3 | Price displayed in RequestRide matches table value | manual | Manual UI test | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (once test infra exists)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Test framework not installed — no `vitest` or `jest` config found. Recommend: `npm install --save-dev vitest` + `vitest.config.ts`
- [ ] `src/data/pricingData.test.ts` — covers R2.12 (PRICE_TABLE lookup, same-pier guard, DEFAULT_PRICE fallback)
- [ ] Note: this is a 2-file phase change; if test infra cost is too high, manual verification of the price display is acceptable for MVP

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `src/contexts/AppContext.tsx` lines 57–69 (current haversine logic)
- Direct codebase analysis — `src/data/mockData.ts` (pier IDs and names)
- Direct codebase analysis — `src/types/index.ts` (Location.id: string)
- Direct codebase analysis — `src/pages/passenger/RequestRide.tsx` lines 39–41 (calculatePrice call site)
- Direct codebase analysis — grep across all `.tsx` files for `calculatePrice` and `price` (all call sites identified)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — confirms "valores da tabela de preços por trecho: Lucas precisa definir" (owner hasn't set values)
- `.planning/REQUIREMENTS.md` — R2.12 explicitly marked "falta implementar"

### Tertiary (LOW confidence)
- Placeholder price range (R$7–R$14) derived from geographic proximity of piers (short water taxi hops, Gigoia archipelago) — these are estimates until owner confirms

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TypeScript plain object, zero new dependencies, verified against existing code
- Architecture: HIGH — two-file change fully traced through all call sites in codebase
- Pitfalls: HIGH — all identified from direct code reading (no speculation)
- Placeholder prices: LOW — geographic estimate only, owner must confirm

**Research date:** 2026-03-13
**Valid until:** Stable (plain TypeScript — no library churn risk). Re-research only if pier list changes or owner introduces dynamic pricing.
