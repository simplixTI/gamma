---
phase: 01-mapa-limpo-uber-like
plan: 01
subsystem: map-rendering
tags: [google-maps, styles, animation, polyline, marker]
dependency_graph:
  requires: []
  provides: [clean-map-styles, pilot-marker-animation, cyan-route-polyline]
  affects: [GoogleMapView]
tech_stack:
  added: []
  patterns: [useRef-for-imperative-animation, setInterval-interpolation, google-maps-symbol-path]
key_files:
  modified:
    - src/components/GoogleMapView.tsx
decisions:
  - "Water color #17497a chosen over #0d2137 for readability at low zoom (not a black void)"
  - "SVG symbol path used for pilot marker instead of data-URI emoji SVG for platform consistency"
  - "strokeOpacity: 0 on origin-destination Polyline so dashed icon pattern fully replaces solid line"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-13"
  tasks_completed: 3
  files_modified: 1
---

# Phase 01 Plan 01: Mapa Limpo (Uber-like) Summary

**One-liner:** Complete 13-rule navy map style, SVG boat marker with 500ms setInterval interpolation, and cyan dashed route Polyline replacing green solid line.

## What Was Implemented

### Task 1 — Replace mapOptions.styles with GIGOIA_MAP_STYLES (R7.1)

Extracted the inline 6-rule `styles` array from `mapOptions` into a named module-level constant `GIGOIA_MAP_STYLES: google.maps.MapTypeStyle[]` with 13 rules.

Changes from the old 6-rule array:
- Water color: `#a8dcd9` (light teal) -> `#17497a` (deep navy)
- Added `poi.business: visibility off` (explicit business pin suppression)
- Added `poi labels: visibility off` (text label suppression)
- Added `poi labels.icon: visibility off` (belt-and-suspenders icon suppression)
- Added `water labels.text.fill: #4a7fa5` (muted pier/water-body label color)
- Landscape color: `#f0f0f0` -> `#f2f2ef` (slightly warmer off-white)
- Added `road labels.icon: visibility off` (removes highway shields)
- Added `administrative geometry.stroke: #c0c0c0, weight 0.8` (subtle admin borders)
- Added `administrative labels.text.fill: #555555` (muted city/neighborhood names)

`mapOptions` now reads `styles: GIGOIA_MAP_STYLES`.

### Task 2 — SVG boat marker + smooth interpolation animation (R7.2)

**Import change:** Added `useRef` to the existing React import.

**Module-level constant added:**
```
const BOAT_ICON_PATH = 'M 0,-12 L -7,6 L 0,2 L 7,6 Z';
```

**Three refs added inside component body:**
- `pilotMarkerRef` — holds the native `google.maps.Marker` instance
- `prevPilotPositionRef` — tracks last known position for animation start
- `animationIntervalRef` — holds the active `setInterval` handle for cleanup

**Animation useEffect added** (depends on `[pilotPosition]`):
- On each `pilotPosition` change: clears any in-progress interval, computes `from`/`to` coords, runs 20 steps over 500ms calling `pilotMarkerRef.current.setPosition()` imperatively
- Cleanup function clears the interval on unmount or re-render before next effect

**Pilot marker JSX replaced:**
- Removed: data-URI SVG embedding `🚤` emoji
- Added: `icon.path: BOAT_ICON_PATH` with `fillColor: #00A8E8`, `strokeColor: #ffffff`, `scale: 1.5`, `anchor: Point(0,0)`
- Added: `onLoad` callback that stores the `google.maps.Marker` instance into `pilotMarkerRef.current`

The `showBoats` fallback grid markers (lines 285-301) retain their emoji SVG — they are static display-only markers, not the animated pilot marker, and are out of scope for this plan.

### Task 3 — Restyle origin-to-destination Polyline to navy/cyan (R7.3)

Replaced `options` on the `{/* Route line from origin to destination */}` Polyline:

| Property | Before | After |
|---|---|---|
| strokeColor | `#22c55e` | `#00A8E8` |
| strokeOpacity | `0.7` | `0` (hidden — dashed icons replace solid) |
| strokeWeight | `3` | `4` |
| icons | Single `FORWARD_CLOSED_ARROW` at 50% in green | Dash segment (`M 0,-1 0,1`) repeating every 12px + `FORWARD_CLOSED_ARROW` at 100% in cyan |

The pilot-to-origin Polyline above it (already cyan `#00A8E8`) was left completely unchanged.

## Deviations from Plan

None. Plan executed exactly as written.

## Build Result

```
npm run build -> vite build -> SUCCESS in 7.64s
2660 modules transformed, 0 TypeScript errors
```

Pre-existing warnings (not caused by this plan):
- CSS `@import` order warning in global CSS (pre-existing)
- Chunk size warning for index-CbmzLau0.js > 500kB (pre-existing, unrelated to GoogleMapView)
- Supabase client dynamic/static import mixing warning (pre-existing)

## Structural Checks

- `GIGOIA_MAP_STYLES` constant: present at line 37, 13 rules confirmed
- `poi.business` featureType: present at line 41
- `pilotMarkerRef` declared at line 105, used in `onLoad` at line 393
- `animationIntervalRef` declared at line 107, cleared in step-completion branch (line 166) and cleanup return (line 173)
- Origin-destination Polyline `strokeColor`: `#00A8E8` at line 359
- Origin-destination Polyline `strokeOpacity`: `0` at line 360
- No `🚤` emoji in pilot marker JSX (emoji remains only in the separate `showBoats` fallback markers, out of scope)

## UAT Result

Awaiting human verification via checkpoint task (Task 4 in PLAN.md). The dev server can be started with `npm run dev` to verify:
1. Navy water color on map
2. No commercial POI pins visible
3. Pilot marker shows SVG chevron and animates smoothly
4. Route line is dashed cyan with directional arrow at end
