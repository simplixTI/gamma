---
phase: 02-tabela-de-precos-por-trecho
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/pricingData.ts
  - src/contexts/AppContext.tsx
autonomous: false
requirements:
  - R2.3
  - R2.12

must_haves:
  truths:
    - "Selecting pier pair Gigoia Principal → Marina Barra Clube displays R$8 per person in RequestRide"
    - "Selecting 2 passengers shows R$16 total (2x R$8) in the confirmation panel"
    - "Price shown while searching for pilot matches the price shown at confirmation"
    - "Price stored in Supabase rides table equals totalPrice = pricePerPerson * passengerCount"
    - "No distance-based calculation affects the displayed price"
    - "PLACEHOLDER VALUES comment is prominent in pricingData.ts so owner knows prices need final confirmation"
  artifacts:
    - path: "src/data/pricingData.ts"
      provides: "PRICE_TABLE nested-object with all 30 directed pier pairs, DEFAULT_PRICE fallback"
      exports: ["PRICE_TABLE", "DEFAULT_PRICE"]
    - path: "src/contexts/AppContext.tsx"
      provides: "calculatePrice() returning table lookup instead of haversine formula"
      contains: "PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE"
  key_links:
    - from: "src/contexts/AppContext.tsx"
      to: "src/data/pricingData.ts"
      via: "import { PRICE_TABLE, DEFAULT_PRICE } from '@/data/pricingData'"
      pattern: "PRICE_TABLE\\[origin\\.id\\]"
    - from: "src/pages/passenger/RequestRide.tsx"
      to: "src/contexts/AppContext.tsx"
      via: "calculatePrice() from useApp()"
      pattern: "calculatePrice\\(\\)"

user_setup: []
---

<objective>
Replace the haversine-based price calculation in AppContext.tsx with a fixed lookup table keyed by
pier ID pair. Create src/data/pricingData.ts holding the authoritative PRICE_TABLE constant, then
swap the calculatePrice() function body to a two-line lookup. No component files change.

Purpose: R2.12 — passengers see a fixed, deterministic price per route rather than an approximated
distance-derived value. The table structure lets the owner (Lucas) update prices by editing a
single plain TypeScript file.

Output: Two file changes. All three existing call sites of calculatePrice() (RequestRide,
SearchingPilot, Tracking) automatically receive correct prices with no JSX modifications.
</objective>

<execution_context>
@C:/Users/lucas/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/lucas/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/02-tabela-de-precos-por-trecho/02-RESEARCH.md

<interfaces>
<!-- Key contracts the executor needs. No codebase exploration required. -->

From src/data/mockData.ts — pier Location.id values (string):
  '1' = Pier Principal Gigoia
  '2' = Marina Barra Clube
  '3' = Pier Ilha Itanhangá
  '4' = Pier Norte Gigoia
  '5' = Pier Ilha Primeira
  '6' = Canal de Marapendi

From src/types/index.ts — Location interface:
  interface Location { id: string; name: string; address: string; coordinates: [number, number]; ... }

From src/contexts/AppContext.tsx — current calculatePrice() (lines 57–69):
  const calculatePrice = () => {
    const distance = calculateDistance();
    const minPrice = 3; const maxPrice = 10; const maxDistance = 1.5;
    const normalizedDistance = Math.min(distance, maxDistance) / maxDistance;
    const price = minPrice + (normalizedDistance * (maxPrice - minPrice));
    return Math.round(price * 100) / 100;
  };
  // origin and destination are both Location | null, available as closure variables

From src/pages/passenger/RequestRide.tsx — call pattern (lines 39–40):
  const pricePerPerson = calculatePrice();          // per-person base price
  const totalPrice = pricePerPerson * passengerCount; // multiplied here, NOT inside calculatePrice
  // totalPrice is passed to supabase insert at line 72 as price: totalPrice
</interfaces>
</context>

<tasks>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 0 — Data contract (must land before AppContext edit)
     ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 1 (Wave 0): Create src/data/pricingData.ts with PRICE_TABLE</name>
  <files>src/data/pricingData.ts</files>
  <action>
    Create a new file src/data/pricingData.ts. The file must contain exactly:

    1. A multi-line comment block at the top identifying all six piers by their Location.id values,
       stating that all values are in BRL per person, and including a prominent line:
       "PLACEHOLDER VALUES — replace with owner-approved prices before launch."

    2. An exported const named PRICE_TABLE typed as Record<string, Record<string, number>>.
       The table must cover all 30 directed pairs (6 piers × 5 destinations each).
       Self-keys (pier to itself) must NOT appear — the picker already prevents same-pier selection,
       and calculatePrice() will guard against it.
       Use these placeholder values (R$7–R$14 range, realistic for Gigoia archipelago):
         '1': { '2': 8,  '3': 10, '4': 7,  '5': 9,  '6': 12 }
         '2': { '1': 8,  '3': 6,  '4': 9,  '5': 11, '6': 13 }
         '3': { '1': 10, '2': 6,  '4': 8,  '5': 10, '6': 14 }
         '4': { '1': 7,  '2': 9,  '3': 8,  '5': 7,  '6': 10 }
         '5': { '1': 9,  '2': 11, '3': 10, '4': 7,  '6': 11 }
         '6': { '1': 12, '2': 13, '3': 14, '4': 10, '5': 11 }

    3. An exported const named DEFAULT_PRICE typed as number, value 10. This is the fallback
       for any pier pair not found in the table (e.g., future pier additions).

    Do NOT export anything else. Do NOT import anything. This file has zero dependencies.
  </action>
  <verify>
    Run: npx tsc --noEmit
    Expected: no TypeScript errors introduced by this file.
    Also verify manually: open src/data/pricingData.ts and confirm 6 rows are present,
    each with 5 destination keys (no self-key), and PLACEHOLDER comment is visible at top.
  </verify>
  <done>
    src/data/pricingData.ts exists, exports PRICE_TABLE and DEFAULT_PRICE, zero TS errors,
    prominent PLACEHOLDER comment present.
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 1 — Swap calculatePrice() body in AppContext
     ═══════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2 (Wave 1): Replace calculatePrice() body in AppContext.tsx</name>
  <files>src/contexts/AppContext.tsx</files>
  <action>
    Read src/contexts/AppContext.tsx in full before editing.

    Make two changes:

    CHANGE A — Add import at the top of the file, after the existing imports:
      import { PRICE_TABLE, DEFAULT_PRICE } from '@/data/pricingData';

    CHANGE B — Replace the entire body of calculatePrice() (currently lines 57–69).
    The new function must be:
      const calculatePrice = (): number => {
        if (!origin || !destination) return 0;
        if (origin.id === destination.id) return 0;
        return PRICE_TABLE[origin.id]?.[destination.id] ?? DEFAULT_PRICE;
      };

    Do NOT touch:
    - calculateDistance() — haversine stays intact (used for km display)
    - calculateTime() — stays intact (used for minutes display)
    - The AppContextType interface — calculatePrice: () => number signature is unchanged
    - The Provider value object — calculatePrice is already listed there
    - Any other code in the file

    The return type annotation `: number` is added for clarity but is not breaking.
  </action>
  <verify>
    Run: npx tsc --noEmit
    Expected: zero TypeScript errors.
    Run: npm run build
    Expected: build succeeds with no errors.
  </verify>
  <done>
    AppContext.tsx imports pricingData, calculatePrice() body uses PRICE_TABLE lookup,
    calculateDistance() and calculateTime() are untouched, build succeeds.
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 2 — Human verification in the running app
     ═══════════════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Fixed price lookup table replacing haversine-based pricing.
    - src/data/pricingData.ts: 30-pair PRICE_TABLE constant
    - src/contexts/AppContext.tsx: calculatePrice() now reads from PRICE_TABLE
    Build passes. No component files were changed.
  </what-built>
  <how-to-verify>
    1. Run the dev server: npm run dev
    2. Log in as a passenger (or use the dev bypass if available).
    3. Navigate to the ride request screen.
    4. Select "Pier Principal Gigoia" as origin and "Marina Barra Clube" as destination.
       Expected price: R$8 (1 passenger) — R$16 (2 passengers).
    5. Change destination to "Canal de Marapendi".
       Expected price: R$12 (1 passenger) — R$24 (2 passengers).
    6. Set passenger count to 3 and verify the label shows "3x R$8" and total shows "R$24"
       (for pier 1 → pier 2 pair).
    7. Confirm that changing the passenger count updates the total price immediately
       without changing the per-person price.
    8. Proceed to confirm a ride (PIX payment screen) and verify the amount shown in
       PaymentModal matches the total displayed on the confirmation panel.

    These values must match the PRICE_TABLE rows exactly — not approximate distance-derived amounts.
  </how-to-verify>
  <resume-signal>
    Type "approved" if all prices match the table values, or describe any discrepancy
    (e.g., "pier 3 → pier 5 shows R$11 but table says R$10").
  </resume-signal>
</task>

</tasks>

<verification>
After all waves complete:

1. TypeScript: `npx tsc --noEmit` — zero errors
2. Build: `npm run build` — exits 0
3. Lint: `npm run lint` — no new errors vs baseline
4. Manual: All pier-pair prices shown in RequestRide match PRICE_TABLE values exactly
5. Manual: Multi-passenger total = pricePerPerson * passengerCount (no double-multiplication)
6. Manual: SearchingPilot and Tracking pages show the same per-person price as RequestRide
   (they call the same calculatePrice() from context)
7. Structural: calculateDistance() and calculateTime() are unmodified (km and minutes still display)
</verification>

<success_criteria>
- src/data/pricingData.ts exists with PRICE_TABLE covering all 30 directed pier pairs
- src/contexts/AppContext.tsx calculatePrice() returns PRICE_TABLE[origin.id][destination.id]
- Price displayed in RequestRide is deterministic and matches the table (not distance-derived)
- Passenger count multiplication works correctly: 2 passengers at R$8 = R$16 total
- Build succeeds, TypeScript reports zero errors
- PLACEHOLDER VALUES comment is visible in pricingData.ts for owner hand-off
- No component files (RequestRide.tsx, SearchingPilot.tsx, Tracking.tsx) were modified
</success_criteria>

<output>
After completion, create `.planning/phases/02-tabela-de-precos-por-trecho/02-01-SUMMARY.md`
with the standard summary template: what was built, files modified, decisions made,
patterns established, and any deferred items (final price values pending owner approval).
</output>
