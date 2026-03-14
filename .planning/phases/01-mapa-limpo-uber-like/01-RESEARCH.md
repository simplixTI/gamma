# Phase 1: Mapa Limpo (Uber-like) - Research

**Researched:** 2026-03-13
**Domain:** Google Maps JS API styling, animated markers, polyline routing — @react-google-maps/api v2.20.8
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R7.1 | Mapa Google limpo — sem POIs comerciais, sem propaganda, paleta marinha idêntica ao Uber | JSON styles array fully researched; specific featureTypes and styler values documented |
| R7.2 | Marker de piloto animado (barco se movendo suavemente em GPS updates) | Smooth animation via position interpolation researched; existing SVG-in-data-URI pattern documented |
| R7.3 | Rota desenhada entre origem e destino | Polyline approach confirmed as correct for water routes; Directions API ruled out (no water mode) |
</phase_requirements>

---

## Summary

The codebase already has a solid GoogleMapView.tsx foundation. The `mapOptions` object has a `styles` array but it is incomplete — it does not hide `poi.business`, `poi.attraction`, `poi.medical`, `poi.place_of_worship`, `poi.school`, and other sub-feature POI types, and does not hide POI label icons. The water color (`#a8dcd9`) is a light teal, not the navy/dark-ocean palette that matches the Uber aesthetic. These are targeted, minimal edits.

For the boat marker animation (R7.2), the existing code renders an SVG emoji marker (🚤) and updates `pilotPosition` from Supabase realtime. The gap is that the position jumps instantly — there is no interpolation between old and new lat/lng. The correct fix is a `useRef`-tracked previous position plus a `requestAnimationFrame` / `setInterval` loop that moves the marker in small increments over ~500ms whenever a new GPS position arrives.

For route drawing (R7.3), the codebase already renders a `<Polyline>` from origin to destination with `geodesic: true`. The Directions API is explicitly the wrong tool here — it has no water/boat travel mode and would snap routes to roads. The existing `<Polyline>` straight-line approach is exactly correct for short water routes between fixed piers. The gap is cosmetic: the line style (color, dash pattern, arrow icon) needs to match the desired Uber-like visual.

**Primary recommendation:** Three targeted edits to GoogleMapView.tsx — (1) replace the `mapOptions.styles` array with a complete navy-palette clean style, (2) add position interpolation for the pilot marker on GPS update, (3) refine the origin→destination polyline visual style. No new files needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-google-maps/api | ^2.20.8 (installed) | React wrapper for Google Maps JS API | Already in project; provides GoogleMap, Marker, Polyline, OverlayView components |
| Google Maps JS API | loaded via useJsApiLoader | Map rendering, marker icons, polylines | Already configured with `places` + `geometry` libraries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `useRef` | 18.3 (installed) | Store previous pilot position without re-render | For interpolation animation state |
| React `useEffect` | 18.3 (installed) | Trigger interpolation loop on pilotPosition change | Every GPS position update |
| `requestAnimationFrame` / `setInterval` | Browser native | Drive smooth position interpolation | Inside the animation effect |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polyline (current) | Directions API | Directions API has no water/boat mode — polyline is correct |
| Polyline (current) | google.maps.marker.AdvancedMarkerElement | AdvancedMarkerElement requires `mapId` prop on GoogleMap, adds migration complexity; legacy Marker still functional for this scope |
| JSON styles (inline) | Cloud-based Map Styling | Cloud styling requires Google Cloud Console map ID; inline JSON requires zero extra config and works identically |

**Installation:** No new packages needed. Everything required is already installed.

---

## Architecture Patterns

### Files to Modify
```
src/
└── components/
    └── GoogleMapView.tsx    # Only file that needs changes (all three requirements)
```

No new files required. All three requirements are edits to the existing component.

### Pattern 1: Complete Navy-Ocean Map Style (R7.1)

**What:** Replace the partial `mapOptions.styles` array with a comprehensive set that hides ALL poi sub-types (including `poi.business`), ALL poi label icons, ALL transit, simplifies roads, and sets the water color to a deep navy/ocean tone matching the Uber aesthetic.

**When to use:** Applied once as the `styles` prop on the `mapOptions` constant. The existing `disableDefaultUI: true` plus `gestureHandling: 'greedy'` stays untouched.

**Key featureTypes to cover (HIGH confidence — verified with Google Maps style reference):**
- `poi` — hides all points of interest geometry
- `poi.business` — specifically hides commercial business markers (the main "ad-like" elements)
- `poi.attraction` — hides tourist attractions
- `poi.medical`, `poi.school`, `poi.place_of_worship`, `poi.sports_complex` — hide all POI subtypes
- `poi` + `elementType: "labels.icon"` — hides the pin icons even when geometry is hidden
- `poi` + `elementType: "labels"` — hides all POI text labels
- `transit` — hides transit lines and stations
- `water` + `elementType: "geometry"` — set navy color `#1a3a5c` (or `#0d2137` for darker)
- `landscape` + `elementType: "geometry"` — light off-white `#f8f8f6` or `#e8ead6`
- `road` + `elementType: "labels.icon"` — hides road shield icons

**Note on advertisements:** The Google Maps style API has no `advertisement` featureType — ads are not surfaced through the JSON styling system. Setting `poi.business` to `visibility: off` removes the business pins which are the closest equivalent.

**Example style array (verified against Google Maps style reference):**
```typescript
// Source: Google Maps Style Reference — developers.google.com/maps/documentation/javascript/style-reference
const GIGOIA_MAP_STYLES: google.maps.MapTypeStyle[] = [
  // Hide ALL poi geometry and labels
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Hide transit
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  // Navy water — deep ocean tone
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
  // Clean off-white land
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
  // White roads, simplified labels
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  // Subtle administrative borders
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c0c0c0' }, { weight: 0.8 }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
];
```

### Pattern 2: Smooth Pilot Marker Animation (R7.2)

**What:** When `pilotPosition` prop changes, instead of the marker jumping instantly, interpolate from the previous position to the new position over ~500ms using `setInterval`.

**When to use:** Triggered inside a `useEffect` that watches `pilotPosition`. Requires `useRef` to track previous position and animation interval.

**Why this approach:** The `google.maps.Marker` `.setPosition()` method accepts any `LatLng` value and updates immediately — the smoothness comes from calling it rapidly with interpolated values. This works in @react-google-maps/api's `<Marker>` by controlling the `position` prop via React state, OR by holding a direct ref to the marker instance and calling `.setPosition()` imperatively.

**Imperative approach (preferred for smooth animation — avoids React re-render overhead per frame):**
```typescript
// Source: Google Maps JS API docs — marker position update pattern
const pilotMarkerRef = useRef<google.maps.Marker | null>(null);
const prevPilotPositionRef = useRef<{ lat: number; lng: number } | null>(null);
const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => {
  if (!pilotPosition || !pilotMarkerRef.current) return;

  const prev = prevPilotPositionRef.current ?? pilotPosition;
  const from = { lat: prev.lat, lng: prev.lng };
  const to = { lat: pilotPosition.lat, lng: pilotPosition.lng };

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
      prevPilotPositionRef.current = to;
    }
  }, DURATION_MS / STEPS);

  return () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
  };
}, [pilotPosition]);
```

Wire the ref to the `<Marker>` via the `onLoad` callback:
```typescript
<Marker
  position={pilotPosition}
  onLoad={(marker) => { pilotMarkerRef.current = marker; }}
  ...
/>
```

### Pattern 3: Route Polyline Visual Polish (R7.3)

**What:** The existing origin→destination `<Polyline>` works correctly. The refinement is visual: dashed line with a directional arrow, using the navy color palette.

**Current state:** Green (`#22c55e`) polyline with a forward arrow at 50%. This is functional but doesn't match the navy aesthetic.

**Recommended style:**
```typescript
// Source: @react-google-maps/api Polyline component — existing pattern in GoogleMapView.tsx
options={{
  strokeColor: '#00A8E8',    // Uber-like cyan-blue
  strokeOpacity: 0,           // Hide solid line (use dashed icons instead)
  strokeWeight: 4,
  geodesic: true,
  icons: [
    {
      icon: {
        path: 'M 0,-1 0,1',   // Dash segment
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

### Anti-Patterns to Avoid

- **Using Directions API for water routes:** No `WATER` or `BOAT` travel mode exists. Directions API would snap the route to roads on land, producing a nonsensical path for pier-to-pier routes. Use `<Polyline geodesic={true}>` instead.
- **Animating via React state per frame:** Setting `useState` on every animation frame causes React to re-render the full component 20+ times per second. Use imperative `markerRef.current.setPosition()` instead.
- **Hiding only `poi` but not `poi.business`:** The `poi` featureType hides the geometry, but sub-types can still show labels. Always include explicit `poi.business` and `poi` + `labels.icon` rules.
- **Using emoji in SVG markers:** The existing `🚤` emoji in SVG `<text>` elements renders inconsistently across platforms (Android vs iOS vs desktop). Use an SVG path for a boat/arrow shape instead for production.
- **Requiring `mapId` for AdvancedMarkerElement:** If migrating to `AdvancedMarkerElement`, the `<GoogleMap>` component must receive a `mapId` prop (a cloud-configured ID). This is extra setup that is out of scope for this phase — stay with legacy `Marker`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Water route path | Custom routing algorithm between piers | `<Polyline geodesic={true}>` with hardcoded pier coordinates | Short distances; `geodesic: true` accounts for Earth curvature; piers are fixed points |
| Position interpolation math | Custom easing library | Linear interpolation (`from + (to - from) * t`) with `setInterval` | Sufficient smoothness for 5-second GPS intervals; easing libraries add dependencies for no visual benefit at this scale |
| Map style JSON | Custom color picker UI | Inline `mapOptions.styles` array | Styles are static config, not runtime user input |
| Boat icon | External image CDN | Inline SVG path in `icon.url` data URI or `icon.path` SVG path string | No network request, works offline, scales perfectly |

---

## Common Pitfalls

### Pitfall 1: Incomplete POI Hiding
**What goes wrong:** Map still shows business pin icons even after `poi: visibility off`.
**Why it happens:** The `poi` featureType rule hides geometry but subtype labels may still render. Additionally `poi.business` must be explicitly targeted.
**How to avoid:** Include both `{ featureType: 'poi', stylers: [{ visibility: 'off' }] }` AND `{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }` AND `{ featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }`.
**Warning signs:** Colored map pins (restaurants, shops) still visible on the map.

### Pitfall 2: Marker Position Jumping on GPS Update
**What goes wrong:** Pilot boat marker teleports instantly to new position, creating jarring UX.
**Why it happens:** `pilotPosition` prop updates from Supabase realtime push and React re-renders the Marker with the new position immediately.
**How to avoid:** Use the interpolation pattern with `setInterval` + `markerRef.current.setPosition()` described in Pattern 2.
**Warning signs:** Marker "snaps" rather than glides between positions.

### Pitfall 3: `coordinates` Array Order Confusion
**What goes wrong:** Pier markers appear in the ocean or at wrong locations.
**Why it happens:** The `Location` type uses GeoJSON standard `[longitude, latitude]` ordering, but Google Maps expects `{ lat, lng }`. The existing code correctly handles this with `coordinates[1]` for lat and `coordinates[0]` for lng — but it is easy to regress.
**How to avoid:** Never change the coordinate access pattern. The comment in `index.ts` is the ground truth: `lat = coordinates[1], lng = coordinates[0]`.
**Warning signs:** Markers appear far from the Gigoia archipelago.

### Pitfall 4: Animation Interval Not Cleaned Up
**What goes wrong:** Memory leak / stale closure causes marker to animate to wrong position after component unmount or rapid GPS updates.
**Why it happens:** `setInterval` callback captures `from` and `to` in closure; if a new GPS update arrives before animation completes, two intervals compete.
**How to avoid:** Always `clearInterval(animationIntervalRef.current)` at the top of the new animation effect, and in the effect's cleanup function.
**Warning signs:** Marker oscillates or moves in wrong direction.

### Pitfall 5: Water Color Too Dark at Low Zoom
**What goes wrong:** Navy water color `#0d2137` makes the archipelago look like a black void at zoom < 13.
**Why it happens:** At low zoom, dark water with light land creates too much contrast and loses map readability.
**How to avoid:** Test at zoom 12–17 (the app's operational range). If too dark, lighten to `#1a3a5c` or `#17497a`. The `lightness` styler can be used instead of absolute `color` for easier tuning.
**Warning signs:** Map looks unusable when zoomed out to see all piers.

---

## Code Examples

Verified patterns from existing codebase and official sources:

### Existing mapOptions Structure (from GoogleMapView.tsx line 37)
```typescript
// Source: existing GoogleMapView.tsx — already has the right shape
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,         // keep false — app has no zoom control UI
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy', // keep — mobile touch optimization
  styles: [
    // REPLACE this entire array with GIGOIA_MAP_STYLES constant
  ],
};
```

### Complete mapOptions for Production (R7.1)
```typescript
// Source: Google Maps Style Reference — all featureTypes verified
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a7fa5' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2ef' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c0c0c0' }, { weight: 0.8 }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
  ],
};
```

### Pilot Marker SVG Path (boat shape, no emoji)
```typescript
// Source: Google Maps icon.path pattern — SVG path string
// Simple boat/arrow shape as SVG path — platform-consistent rendering
const BOAT_ICON_PATH = 'M 0,0 L -8,-14 L 0,-10 L 8,-14 Z'; // arrow pointing up

// Used in Marker icon prop:
icon={{
  path: BOAT_ICON_PATH,
  fillColor: '#00A8E8',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.5,
  anchor: new google.maps.Point(0, 0),
  rotation: headingDegrees, // optional: rotate to match movement direction
}}
```

### Calculating Heading for Marker Rotation (bonus)
```typescript
// Rotate boat icon to face direction of travel
function calculateHeading(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google.maps.Marker` | `google.maps.marker.AdvancedMarkerElement` | Feb 2024 (deprecated in v3.56) | Legacy Marker still works; migration requires `mapId` cloud config — out of scope for this phase |
| Inline JSON styles | Cloud-based Map Styling (Google Cloud Console) | 2022+ | Cloud styling is more powerful but requires map ID config; inline JSON remains fully supported and simpler |
| `google.maps.Animation.BOUNCE/DROP` | Custom interpolation | Always | Built-in animations are for cosmetic entry effects only; smooth GPS tracking requires custom `setInterval` interpolation |

**Deprecated/outdated:**
- Emoji `🚤` in SVG `<text>` element: Renders differently per platform. Prefer `icon.path` SVG path string.
- `google.maps.Marker` (legacy): Deprecated Feb 2024 per Google. Still functional but a migration target. Not blocking for this phase.

---

## Open Questions

1. **Water color exact value**
   - What we know: `#0d2137` is deep navy; `#1a3a5c` is medium navy; current code has `#a8dcd9` (teal)
   - What's unclear: Product decision — how dark should the water be? Similar to Uber black map or lighter?
   - Recommendation: Default to `#17497a` (readable navy) and allow easy tweak via named constant `WATER_COLOR`

2. **Boat icon design**
   - What we know: Current emoji `🚤` is inconsistent across platforms
   - What's unclear: No design spec provided for boat SVG shape
   - Recommendation: Use a simple upward-pointing chevron/arrow SVG path (already shown in Code Examples above) that clearly indicates a moving vessel — upgrade to custom SVG asset post-MVP

3. **Marker heading/rotation**
   - What we know: `icon.rotation` (degrees) can rotate the boat to face the direction of travel
   - What's unclear: Whether the `pilotPosition` updates come fast enough to compute meaningful heading
   - Recommendation: Implement heading calculation using `prevPilotPositionRef` and `calculateHeading()` — skip rotation if positions are identical (no movement)

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, vitest.config, pytest.ini found) |
| Config file | None — Wave 0 gap |
| Quick run command | `npm run lint` (only verification available currently) |
| Full suite command | `npm run build` (TypeScript compile check) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R7.1 | Map styles array hides poi, transit; sets navy water | manual-only (visual) | `npm run build` — TypeScript validates styles type | N/A visual |
| R7.2 | Pilot marker animates smoothly between GPS positions | manual-only (visual) | `npm run build` — validates no type errors in animation code | N/A visual |
| R7.3 | Polyline renders between origin and destination piers | manual-only (visual) | `npm run build` — validates Polyline props | N/A visual |

**Manual-only justification:** All three requirements are visual rendering behaviors of a Google Maps canvas element. These cannot be unit-tested without a full browser environment running a live Google Maps API key. Automated visual regression testing (e.g., Playwright screenshots) is out of scope for this phase.

### Sampling Rate
- **Per task commit:** `npm run build && npm run lint`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build green + manual visual verification in browser before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework installed — `npm install -D vitest` if unit tests become needed post-MVP
- [ ] No automated visual regression — acceptable for this MVP phase

---

## Sources

### Primary (HIGH confidence)
- Google Maps Style Reference — developers.google.com/maps/documentation/javascript/style-reference — featureTypes, elementTypes, styler properties (all verified)
- Google Maps MapOptions Reference — developers.google.com/maps/documentation/javascript/reference/map#MapOptions — UI control properties
- Google Maps Marker Animations — developers.google.com/maps/documentation/javascript/examples/marker-animations — DROP/BOUNCE + setTimeout pattern
- Google Maps AdvancedMarkerElement Reference — developers.google.com/maps/documentation/javascript/reference/advanced-markers — deprecation status confirmed
- Google Maps Directions API — developers.google.com/maps/documentation/javascript/directions — no water travel mode confirmed

### Secondary (MEDIUM confidence)
- Snazzy Maps `light-gray` style JSON — snazzymaps.com/style/132/light-gray — reference pattern for complete style arrays
- Snazzy Maps `ultra-light-with-labels` — snazzymaps.com/style/151/ultra-light-with-labels — reference for road + label styling

### Tertiary (LOW confidence)
- N/A — all key findings verified with primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @react-google-maps/api v2.20.8 confirmed in package.json; all components (`Marker`, `Polyline`, `GoogleMap`) already in use
- Architecture: HIGH — single file edit confirmed; no new dependencies; all patterns verified against Google Maps official docs
- Map styles (R7.1): HIGH — featureTypes verified against official style reference; specific poi.business confirmed
- Animation (R7.2): MEDIUM-HIGH — interpolation pattern from official docs; exact frame timing may need tuning in browser
- Route drawing (R7.3): HIGH — Directions API water limitation confirmed; Polyline geodesic approach already working in codebase
- Pitfalls: HIGH — derived from direct code inspection of GoogleMapView.tsx + official deprecation notices

**Research date:** 2026-03-13
**Valid until:** 2026-09-13 (Google Maps style reference is stable; @react-google-maps/api v2.x API unlikely to change)
