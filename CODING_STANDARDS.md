# Coding Standards (Review Guide)

Judgement-call standards enforced during code review. Mechanical rules (TypeScript `strict`/`noUnusedLocals`, asset presence, difficulty monotonicity, computed `touch-action`, turf regressions) are enforced by `npm run verify`.

## Visual Fidelity & Assets
- Render official Splatoon 3 badge images (`public/assets/badges/*.webp`) unmodified—display them cleanly with `object-fit: contain` and represent locked badges via CSS silhouette filtering rather than drawing synthetic frames over badge art.
- Keep `src/data/splat3*.generated.ts` strictly script-generated via `scripts/sync_splat3_assets.py`; derive total level/badge counts from `TOTAL_LEVELS` / `TOTAL_BADGES` instead of hardcoded literals.
- Keep shared color tokens in `src/data/theme.ts` so WebGL meshes and HUD chips stay visually aligned.

## Mobile Portrait UX (390×844)
- Keep all top HUD controls (level pill, badge thumb, moves counter) inside the 390px viewport with zero right-edge clipping, and keep tile silhouettes + ink colors distinct across all 6 weapon slots.
- Paginate or slice 1,549-item modal lists (chapters of 50 levels; badge locker batches with `loading="lazy"` and `decoding="async"`) rather than mounting all 1,549 DOM nodes at once.

## WebGL & Texture Lifecycle
- Update `WeaponTextures` canvases in-place with a monotonic `loadGen` guard and `tex.needsUpdate = true`, preserving `BoardScene`'s bound `CanvasTexture` references and avoiding eager synchronous `toDataURL` bursts during level transitions.
- Avoid per-frame allocations inside `BoardScene`'s render loop; reuse scratch `THREE.Vector3`/`Vector2`/`Raycaster` instances and dispose every dynamic geometry/material created per level.
