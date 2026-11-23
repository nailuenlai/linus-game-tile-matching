import type { BadgeDef } from '../types';

/**
 * Returns the exact official Splatoon 3 v12.0.0 badge artwork URL.
 * Locked state is rendered cleanly via CSS silhouette/dimming so the badge
 * artwork itself always stays 100% identical to Splatoon 3!
 */
export function getBadgeImageUrl(badge: BadgeDef, _locked = false): string {
  return badge.imgUrl;
}
