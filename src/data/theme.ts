/**
 * Shared visual palette constants (single source of truth across engine,
 * procedural canvas textures, and 3D board materials).
 */
export const TURF_COLORS = {
  // Unpainted turf cell (未完成): crisp bright chalk-white striped pad
  unpaintedBaseHex: '#F1F5F9',
  unpaintedStripeHex: '#94A3B8',
  unpaintedBorderHex: '#FFFFFF',
  unpaintedDashHex: '#334155',
  unpaintedBracketHex: '#0F172A',
  unpaintedSlotInt: 0xe2e8f0,
  unpaintedEmissiveInt: 0x94a3b8,

  // Painted turf cell (已完成): blazing saturated Splatoon neon emerald-green ink
  paintedHex: '#00E65C',
  paintedCenterHex: '#5CFF92',
  paintedEdgeHex: '#00B848',
  paintedRimHex: '#8CFFB2',
  paintedOutlineHex: '#005A24',
  paintedSlotInt: 0x00e65c,
  paintedEmissiveInt: 0x00b848,
  paintedParticleInt: 0x00ff70,
} as const;
