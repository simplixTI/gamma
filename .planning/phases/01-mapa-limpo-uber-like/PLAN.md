---
phase: 01-mapa-limpo-uber-like
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/GoogleMapView.tsx
autonomous: true
requirements:
  - R7.1
  - R7.2
  - R7.3

must_haves:
  truths:
    - "Mapa não exibe ícones de restaurantes, lojas, atrações ou qualquer pin de POI comercial"
    - "Água do mapa tem cor navy escura (não teal claro #a8dcd9)"
    - "Marcador do piloto desliza suavemente entre atualizações de GPS — sem teleporte"
    - "Marcador do piloto exibe ícone de barco SVG consistente (não emoji 🚤)"
    - "Linha de rota entre origem e destino usa paleta navy/cyan — não verde"
  artifacts:
    - path: "src/components/GoogleMapView.tsx"
      provides: "Mapa limpo com estilos completos, animação de marcador e rota estilizada"
      contains: "GIGOIA_MAP_STYLES"
  key_links:
    - from: "mapOptions.styles"
      to: "Google Maps rendering"
      via: "GIGOIA_MAP_STYLES constant passed to options prop"
      pattern: "GIGOIA_MAP_STYLES"
    - from: "pilotPosition prop change"
      to: "pilotMarkerRef.current.setPosition()"
      via: "useEffect with setInterval interpolation"
      pattern: "animationIntervalRef"
    - from: "origin → destination Polyline"
      to: "visual style"
      via: "options.strokeColor + icons array"
      pattern: "strokeColor.*00A8E8"
---

<objective>
Apply three targeted visual edits to GoogleMapView.tsx to produce a clean, Uber-like nautical map.

Purpose: The map currently shows commercial POI pins, has light-teal water (#a8dcd9), and teleports the pilot marker on GPS updates. These three gaps block the MVP aesthetic.

Output: A single updated GoogleMapView.tsx with (1) complete 13-rule style array hiding all POIs and setting deep-navy water, (2) smooth 500ms linear interpolation on pilot marker position changes, (3) origin→destination route line styled in cyan instead of green.
</objective>

<execution_context>
@C:/Users/lucas/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/lucas/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/01-mapa-limpo-uber-like/01-RESEARCH.md
@src/components/GoogleMapView.tsx

<interfaces>
<!-- Key structure extracted from GoogleMapView.tsx -->

Component props (line 12–24):
```typescript
interface GoogleMapViewProps {
  className?: string;
  showBoats?: boolean;
  onLocationSelect?: (location: Location) => void;
  selectedLocation?: Location | null;
  showRoute?: boolean;
  origin?: Location | null;
  destination?: Location | null;
  pilotPosition?: { lat: number; lng: number } | null;
  pilotPositions?: PilotLocation[];
  animateBoatOnRoute?: boolean;
  zoom?: number;
}
```

Current mapOptions (lines 37–74): has 6 partial style rules — REPLACE the `styles` array entirely.
Current imports (line 1): `useCallback, useState, useEffect, useMemo` — add `useRef` here.
Pilot marker (lines 337–351): single `<Marker position={pilotPosition}>` with emoji SVG — this is the one to animate.
Fallback boat markers (lines 245–260): `showBoats` grid, separate from pilotPosition — keep as-is (display only, not animated).
Origin→destination Polyline (lines 311–334): currently `strokeColor: '#22c55e'` — restyle to cyan.
Coordinate convention (confirmed from code): `lat = coordinates[1]`, `lng = coordinates[0]` — do NOT change.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace mapOptions.styles with complete 13-rule navy palette (R7.1)</name>
  <files>src/components/GoogleMapView.tsx</files>
  <action>
    Extract the styles array from the inline `mapOptions` object into a named constant `GIGOIA_MAP_STYLES` placed at module level (above the `GoogleMapView` component, below the `boatPositions` constant). Replace the current 6-rule partial array with the full 13-rule array below.

    The existing `mapOptions` object stays in place — only the `styles` value changes from the inline array to `GIGOIA_MAP_STYLES`.

    Keep all other mapOptions properties untouched: `disableDefaultUI: true`, `zoomControl: false`, `mapTypeControl: false`, `streetViewControl: false`, `fullscreenControl: false`, `gestureHandling: 'greedy'`.

    Complete GIGOIA_MAP_STYLES constant to use:
    ```typescript
    const GIGOIA_MAP_STYLES: google.maps.MapTypeStyle[] = [
      // Hide ALL POI geometry (commercial pins, attraction icons, etc.)
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      // Explicitly hide poi.business (main "ad-like" business pins)
      { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
      // Hide all POI text labels
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      // Hide POI pin icons (belt-and-suspenders with the rules above)
      { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      // Hide transit lines and station icons
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      // Deep navy water — Uber-like dark ocean tone
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17497a' }] },
      // Subtle water label color (pier names, water body names)
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
      // Off-white land (clean, high contrast against navy water)
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
      // White roads
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
      // Simplified road labels (keep street names, remove clutter)
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
      // Hide road shield icons (route numbers, highway badges)
      { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      // Subtle admin borders
      { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c0c0c0' }, { weight: 0.8 }] },
      // Muted admin labels (city/neighborhood names)
      { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
    ];
    ```

    Note: `#17497a` is medium-dark navy — readable at zoom 12–17. Lighter than `#0d2137` to avoid black-void appearance at low zoom. If product feedback requests darker, change only this constant.

    Note: There is no `advertisement` featureType in the Google Maps style API. `poi.business: visibility off` is the correct way to remove commercial pin markers.

    After the edit, `mapOptions` should read:
    ```typescript
    const mapOptions: google.maps.MapOptions = {
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      styles: GIGOIA_MAP_STYLES,
    };
    ```
  </action>
  <verify>
    <automated>cd "c:/Users/lucas/OneDrive/Desktop/CLAUDE CODE/GAMMA APP" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    Build passes with no TypeScript errors. The `mapOptions.styles` field references `GIGOIA_MAP_STYLES` constant with 13 rules. Water color is `#17497a`. Rules for `poi.business` and `poi` + `labels.icon` are both present.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace emoji pilot marker with SVG boat icon + smooth interpolation animation (R7.2)</name>
  <files>src/components/GoogleMapView.tsx</files>
  <action>
    This task has two parts: (A) add three refs and the animation useEffect, (B) replace the `<Marker>` for pilotPosition with the new icon and onLoad ref wiring.

    **Part A — Add refs and animation effect**

    1. Add `useRef` to the existing import on line 1:
       ```typescript
       import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
       ```

    2. Add a module-level constant for the SVG boat path (place it near the top, after `GIGOIA_MAP_STYLES`):
       ```typescript
       // SVG path for boat marker — platform-consistent (no emoji rendering differences)
       // Simple upward-pointing chevron representing a vessel bow
       const BOAT_ICON_PATH = 'M 0,-12 L -7,6 L 0,2 L 7,6 Z';
       ```

    3. Inside the `GoogleMapView` component body, after the existing `const [map, setMap]` line, add three refs:
       ```typescript
       const pilotMarkerRef = useRef<google.maps.Marker | null>(null);
       const prevPilotPositionRef = useRef<{ lat: number; lng: number } | null>(null);
       const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
       ```

    4. Add the animation useEffect after the existing "Auto-fit map" useEffect (around line 134):
       ```typescript
       // Smooth pilot marker animation — interpolate position over 500ms to avoid GPS teleport
       useEffect(() => {
         if (!pilotPosition || !pilotMarkerRef.current) return;

         const prev = prevPilotPositionRef.current ?? pilotPosition;
         const from = { lat: prev.lat, lng: prev.lng };
         const to = { lat: pilotPosition.lat, lng: pilotPosition.lng };

         // Clear any in-progress animation before starting a new one
         if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);

         const STEPS = 20;
         const DURATION_MS = 500;
         let step = 0;

         animationIntervalRef.current = setInterval(() => {
           step++;
           const t = step / STEPS;
           const lat = from.lat + (to.lat - from.lat) * t;
           const lng = from.lng + (to.lng - from.lng) * t;
           pilotMarkerRef.current?.setPosition({ lat, lng });
           if (step >= STEPS) {
             clearInterval(animationIntervalRef.current!);
             animationIntervalRef.current = null;
             prevPilotPositionRef.current = to;
           }
         }, DURATION_MS / STEPS);

         return () => {
           if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
         };
       }, [pilotPosition]);
       ```

    **Part B — Replace the pilot position Marker JSX**

    Locate the `{/* Pilot position marker */}` block (lines 337–351). Replace the entire `<Marker>` element with:
    ```tsx
    {pilotPosition && (
      <Marker
        position={pilotPosition}
        onLoad={(marker) => { pilotMarkerRef.current = marker; }}
        icon={{
          path: BOAT_ICON_PATH,
          fillColor: '#00A8E8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new google.maps.Point(0, 0),
        }}
        zIndex={15}
      />
    )}
    ```

    The `showBoats` fallback markers (lines 245–260, the grid of static boat positions) are NOT the animated pilot marker — leave them unchanged.

    Key correctness constraints:
    - Do NOT animate via React state (no `setPilotPosition` calls inside the effect) — use `markerRef.current.setPosition()` only.
    - Do NOT use `AdvancedMarkerElement` — the legacy `Marker` component from @react-google-maps/api is correct here (no `mapId` required).
    - The `onLoad` callback fires once when the Marker mounts and stores the native google.maps.Marker instance in the ref.
    - `prevPilotPositionRef` must be initialized to `null` (not to `pilotPosition`) so the first animation runs from the initial position to itself (no visible movement on first render).
  </action>
  <verify>
    <automated>cd "c:/Users/lucas/OneDrive/Desktop/CLAUDE CODE/GAMMA APP" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    Build passes. The pilot marker Marker JSX uses `icon.path: BOAT_ICON_PATH` (not a data URI with emoji). Three refs (`pilotMarkerRef`, `prevPilotPositionRef`, `animationIntervalRef`) exist in the component. The animation useEffect depends on `[pilotPosition]` and calls `clearInterval` in both the step completion branch and the cleanup return.
  </done>
</task>

<task type="auto">
  <name>Task 3: Restyle origin→destination Polyline to navy/cyan palette (R7.3)</name>
  <files>src/components/GoogleMapView.tsx</files>
  <action>
    Locate the `{/* Route line from origin to destination (green) */}` Polyline block (lines 311–334). Replace its `options` prop with the navy/cyan dashed style below.

    Current options to replace:
    ```tsx
    options={{
      strokeColor: '#22c55e',
      strokeOpacity: 0.7,
      strokeWeight: 3,
      geodesic: true,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }, offset: '50%' }],
    }}
    ```

    Replace with:
    ```tsx
    options={{
      strokeColor: '#00A8E8',
      strokeOpacity: 0,          // hide solid stroke — visually replaced by dashed icons
      strokeWeight: 4,
      geodesic: true,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',  // dash segment
            strokeOpacity: 1,
            scale: 3,
            strokeColor: '#00A8E8',
          },
          offset: '0',
          repeat: '12px',
        },
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#00A8E8',
            fillColor: '#00A8E8',
            fillOpacity: 1,
          },
          offset: '100%',
        },
      ],
    }}
    ```

    Leave the `{/* Route line from pilot to origin (blue) */}` Polyline above it completely unchanged — it is already correctly styled in cyan.

    Leave `geodesic: true` intact. Do NOT use the Directions API. The straight geodesic line between two fixed pier coordinates is the correct approach for water routes.
  </action>
  <verify>
    <automated>cd "c:/Users/lucas/OneDrive/Desktop/CLAUDE CODE\GAMMA APP" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    Build passes. The origin→destination Polyline `options.strokeColor` is `#00A8E8` (not `#22c55e`). The `icons` array contains a dash segment (`'M 0,-1 0,1'`) with `repeat: '12px'` and a `FORWARD_CLOSED_ARROW` at `offset: '100%'`. The `strokeOpacity` is `0` (dashed pattern replaces solid line).
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Three edits to GoogleMapView.tsx:
    1. Map styles: 13-rule GIGOIA_MAP_STYLES constant with deep-navy water (#17497a), all POIs hidden, transit hidden, road shields hidden
    2. Pilot marker: SVG chevron icon replacing emoji, smooth 500ms interpolation animation on GPS position updates
    3. Route polyline: dashed cyan line with direction arrow replacing solid green line
  </what-built>
  <how-to-verify>
    Run the dev server:
    ```
    npm run dev
    ```
    Then open the app in a browser (typically http://localhost:5173).

    Check R7.1 — Map style:
    1. Navigate to any screen that shows the Google Map
    2. Pan around the Gigoia archipelago area
    3. Confirm: water is dark navy (not light teal)
    4. Confirm: no restaurant/cafe/shop pin icons anywhere on the map
    5. Confirm: no transit station icons
    6. Zoom out to zoom level ~12 — confirm water is still readable (not a black void)

    Check R7.2 — Pilot marker animation:
    1. Navigate to a ride-in-progress screen where `pilotPosition` is being passed
    2. Observe the pilot marker when a GPS update arrives (Supabase realtime)
    3. Confirm: marker shows boat chevron SVG icon (not circular emoji)
    4. Confirm: when position updates, the marker slides smoothly over ~0.5 seconds (no instant teleport)
    5. If live GPS unavailable: in browser DevTools, manually call the Supabase realtime callback or temporarily hard-code a position change with a 5-second setInterval to simulate GPS updates

    Check R7.3 — Route line style:
    1. Start a ride as passenger (select origin and destination piers)
    2. Confirm: the route line between origin and destination is dashed cyan (#00A8E8), not solid green
    3. Confirm: a direction arrow appears at the end of the route line (at 100% offset)
    4. Confirm: the pilot-to-origin line (if pilot is active) remains unchanged
  </how-to-verify>
  <resume-signal>Type "approved" if all three requirements pass, or describe any issues found</resume-signal>
</task>

</tasks>

<verification>
After all auto tasks complete, run:

```bash
cd "c:/Users/lucas/OneDrive/Desktop/CLAUDE CODE/GAMMA APP" && npm run build && npm run lint
```

Both must exit 0.

Structural checks (grep):
- `GIGOIA_MAP_STYLES` constant exists with 13 entries
- `poi.business` featureType is present in the styles array
- `pilotMarkerRef` ref is declared and used in `onLoad`
- `animationIntervalRef` ref is declared and cleared in both cleanup paths
- Origin→destination Polyline `strokeColor` is `#00A8E8`
- Origin→destination Polyline `strokeOpacity` is `0` (dashed icons, not solid line)
- No `🚤` emoji remains in the pilot marker JSX (the `showBoats` fallback static markers are separate and may be updated in a later phase)
</verification>

<success_criteria>
- `npm run build` exits 0 — no TypeScript type errors in any of the edits
- `npm run lint` exits 0 — no ESLint violations
- Manual UAT (checkpoint task above) passes all three visual checks:
  - Navy water color replaces teal
  - Zero commercial POI pins visible anywhere on map
  - Pilot marker is SVG chevron, glides smoothly on GPS updates
  - Route line is dashed cyan with directional arrow
</success_criteria>

<output>
After completion, create `.planning/phases/01-mapa-limpo-uber-like/01-01-SUMMARY.md` with:
- What was implemented (all three edits)
- Key decisions made (water color chosen: #17497a over #0d2137 for readability at low zoom)
- Any deviations from the plan
- Build and lint status
- UAT result (approved / issues found)
</output>
