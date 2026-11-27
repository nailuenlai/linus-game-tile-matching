# Splat Crush 3 — Agent Guide

## Map
- Game rules, cascades, and level goals: `src/core/Match3Engine.ts`
- 3D WebGL board, slot/turf visuals, animations, and GPU cleanup: `src/render/BoardScene.ts`
- Procedural 256×256 tile/blocker/turf canvas textures: `src/render/WeaponTextures.ts`
- Deterministic 1,549-level & badge generator: `src/data/levels.ts`, `src/data/badges.ts`
- Shared visual palette constants (single source of truth): `src/data/theme.ts`
- Mobile HUD, modals, and goal chips: `src/ui/UIManager.ts`, `src/style.css`
- 4-layer mobile anti-zoom / pointer guard: `src/core/TouchGuard.ts`

## Verify & Inspect
- Full gate (typecheck, Vite build, 1,549-level + Playwright WebGL/touch/turf audit): `npm run verify`
- Visual mobile screenshot of any level/rule: `python3 tests/capture_level.py --rule turf --paint-half --out /tmp/turf.png`
- Query level metadata in Playwright via `window.__splatCrush.getLevelDef(lv)` (avoids rebuilding the 3D scene).

## Invariants
- iOS Safari GC/thermal discipline: cap DPR at 2, clamp `dt <= 0.05`, reuse shared Three.js geometries/materials, and `.dispose()` every dynamic material/geometry in `clearLevelVisuals()` and `dispose()`.
- Keep global `* { touch-action: none }` with explicit `.scroll-y` / `.scroll-x` exceptions and `pointer-events: none` on decorative button children.
- Pushing to `main` automatically builds, tests, and deploys live to GitHub Pages (`.github/workflows/deploy.yml`).
