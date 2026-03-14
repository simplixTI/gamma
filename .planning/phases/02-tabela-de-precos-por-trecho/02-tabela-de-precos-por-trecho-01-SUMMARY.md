---
phase: 02-tabela-de-precos-por-trecho
plan: 01
subsystem: pricing
tags: [pricing, data, context, table-lookup]
dependency_graph:
  requires: []
  provides: [src/data/pricingData.ts, calculatePrice-table-lookup]
  affects: [src/contexts/AppContext.tsx, RequestRide, SearchingPilot, Tracking]
tech_stack:
  added: []
  patterns: [table-lookup, static-data-file, named-export-constants]
key_files:
  created:
    - src/data/pricingData.ts
  modified:
    - src/contexts/AppContext.tsx
decisions:
  - "Used plain Record<string,Record<string,number>> with string pier IDs matching Location.id — no enum needed"
  - "DEFAULT_PRICE=10 fallback handles future pier additions without crashing"
  - "calculatePrice() returns 0 for null or same-pier selection, consistent with pre-existing guard behavior"
metrics:
  duration: ~10m
  completed: 2026-03-13
---

# Phase 02 Plan 01: Tabela de Preços por Trecho Summary

**One-liner:** Fixed pier-pair price table (30 directed pairs, R$7–R$14 placeholder) replacing haversine distance formula in AppContext.

## What Was Built

Replaced the haversine-based dynamic price calculation with a static lookup table keyed by pier ID pair. Two files changed; zero component files modified. All three existing call sites (RequestRide, SearchingPilot, Tracking) automatically receive table-based prices through the existing `calculatePrice()` context function.

## Files Created

### `src/data/pricingData.ts` (new)
- Exports `PRICE_TABLE: Record<string, Record<string, number>>` — 30 directed pairs across 6 piers
- Exports `DEFAULT_PRICE: number = 10` — fallback for unknown pairs
- Contains prominent `PLACEHOLDER VALUES` comment at top and inline
- Zero dependencies, zero imports

## Files Modified

### `src/contexts/AppContext.tsx`
- Added import: `import { PRICE_TABLE, DEFAULT_PRICE } from '@/data/pricingData';`
- Replaced `calculatePrice()` body (was 10-line haversine-derived formula) with 3-line table lookup:
  ```ts
  const calculatePrice = (): number => {
    if (!origin || !destination) return 0;
    if (origin.id === destination.id) return 0;
    return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
  };
  ```
- `calculateDistance()` — untouched (haversine stays, used for km display)
- `calculateTime()` — untouched (minutes display)

## Pier IDs Used in Price Table

| ID | Pier Name                |
|----|--------------------------|
| '1' | Pier Principal Gigoia   |
| '2' | Marina Barra Clube      |
| '3' | Pier Ilha Itanhangá     |
| '4' | Pier Norte Gigoia       |
| '5' | Pier Ilha Primeira      |
| '6' | Canal de Marapendi      |

## Price Table (Placeholder Values — BRL per person)

|        | →'1' | →'2' | →'3' | →'4' | →'5' | →'6' |
|--------|------|------|------|------|------|------|
| '1'→   | —    | R$8  | R$10 | R$7  | R$9  | R$12 |
| '2'→   | R$8  | —    | R$6  | R$9  | R$11 | R$13 |
| '3'→   | R$10 | R$6  | —    | R$8  | R$10 | R$14 |
| '4'→   | R$7  | R$9  | R$8  | —    | R$7  | R$10 |
| '5'→   | R$9  | R$11 | R$10 | R$7  | —    | R$11 |
| '6'→   | R$12 | R$13 | R$14 | R$10 | R$11 | —    |

## Build Result

`npm run build` — succeeded in 10.04s, zero TypeScript errors, 2660 modules transformed.

Pre-existing warnings (not introduced by this change):
- CSS `@import` order warning in index.css (pre-existing)
- Chunk size > 500 kB warning (pre-existing, 1043 kB JS bundle)

## Decisions Made

1. `Record<string, Record<string, number>>` with string pier IDs matching `Location.id` — no enum needed, matches existing data model directly.
2. `DEFAULT_PRICE = 10` fallback prevents crashes if future piers are added before table is updated.
3. `calculatePrice()` returns `0` for null origin/destination and same-pier selection — consistent with context pattern (UI should prevent same-pier selection upstream).

## Deferred Items

- **KNOWN BLOCKER (STATE.md):** Final price values require owner approval from Lucas. All 30 values in `PRICE_TABLE` are placeholder estimates in the R$7–R$14 range. Edit `src/data/pricingData.ts` to update.

## Checkpoint Pending

Task 3 (Wave 2) is a `checkpoint:human-verify` — manual verification in the running app is required:
1. Run `npm run dev`
2. Select Pier Principal Gigoia → Marina Barra Clube → expect R$8/person
3. Select Pier Principal Gigoia → Canal de Marapendi → expect R$12/person
4. Verify passenger-count multiplication (2 pax × R$8 = R$16 total)

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed in order (Wave 0 before Wave 1). No bugs found, no missing functionality added beyond spec.
