import type { BadgeCategory, BadgeDef, BadgeTier } from '../types';
import { RAW_SPLAT3_BADGES_V1200 } from './splat3Badges.generated';

export const SPLAT3_VERSION = '12.0.0';

export const BADGE_TIER_META: Record<
  BadgeTier,
  {
    labelZh: string;
    shortZh: string;
    colorHex: string;
    borderHex: string;
    bgHex: string;
    glowHex: string;
    rankOrder: number;
    diffRange: string;
  }
> = {
  rookie: {
    labelZh: '入門新手',
    shortZh: '入門',
    colorHex: '#94A3B8',
    borderHex: '#64748B',
    bgHex: '#272E3A',
    glowHex: 'rgba(148,163,184,0.28)',
    rankOrder: 1,
    diffRange: '難度 1–15',
  },
  bronze: {
    labelZh: '進階熟練',
    shortZh: '進階',
    colorHex: '#E08E55',
    borderHex: '#B8652E',
    bgHex: '#332218',
    glowHex: 'rgba(224,142,85,0.38)',
    rankOrder: 2,
    diffRange: '難度 16–32',
  },
  silver: {
    labelZh: '精英高手',
    shortZh: '精英',
    colorHex: '#E2E8F0',
    borderHex: '#94A3B8',
    bgHex: '#232B38',
    glowHex: 'rgba(226,232,240,0.42)',
    rankOrder: 3,
    diffRange: '難度 33–50',
  },
  gold: {
    labelZh: '純金大師',
    shortZh: '純金',
    colorHex: '#FFD600',
    borderHex: '#F59E0B',
    bgHex: '#382B0C',
    glowHex: 'rgba(255,214,0,0.5)',
    rankOrder: 4,
    diffRange: '難度 51–68',
  },
  holo: {
    labelZh: '全息傳奇',
    shortZh: '全息',
    colorHex: '#38F9D7',
    borderHex: '#FF2E93',
    bgHex: '#1D1838',
    glowHex: 'rgba(56,249,215,0.58)',
    rankOrder: 5,
    diffRange: '難度 69–85',
  },
  mythic: {
    labelZh: '終極神話',
    shortZh: '神話',
    colorHex: '#FFE45E',
    borderHex: '#FF3B8B',
    bgHex: '#1A0F2E',
    glowHex: 'rgba(255,228,94,0.75)',
    rankOrder: 6,
    diffRange: '難度 86–100',
  },
};

export const BADGE_CATEGORY_META: Record<BadgeCategory, { labelZh: string }> = {
  weapon: { labelZh: '武器熟練' },
  special: { labelZh: '特殊武器' },
  salmon: { labelZh: '鮭魚跑打工' },
  battle: { labelZh: '對戰 / X比賽' },
  story: { labelZh: '英雄 / 秩序篇' },
  lifestyle: { labelZh: '商店 / 品牌 / 占地鬥士' },
};

function getStarsForTier(tier: BadgeTier, difficulty: number): number {
  switch (tier) {
    case 'rookie':
      return 1;
    case 'bronze':
      return 2;
    case 'silver':
      return 3;
    case 'gold':
      return 4;
    case 'holo':
      return 5;
    case 'mythic':
      return difficulty >= 99 ? 6 : 5;
  }
}

/**
 * All 1,549 official Splatoon 3 v12.0.0 badges sorted strictly from easiest to hardest
 * according to their actual in-game acquisition requirements.
 */
export const BADGES: readonly BadgeDef[] = RAW_SPLAT3_BADGES_V1200.map(
  ([id, imgStem, nameZh, reqZh, category, difficulty, tier, weaponRowId], idx) => {
    const level = idx + 1;
    const meta = BADGE_TIER_META[tier];
    return {
      level,
      id,
      imgUrl: `./assets/badges/${imgStem}.webp`,
      nameZh,
      subtitleZh: reqZh,
      category,
      difficulty,
      tier,
      tierLabelZh: meta.labelZh,
      accentHex: meta.colorHex,
      bgHex: meta.bgHex,
      stars: getStarsForTier(tier, difficulty),
      weaponRowId: weaponRowId || undefined,
    };
  },
);

export const TOTAL_BADGES = BADGES.length;

export const BADGE_TIER_RANGES: Record<BadgeTier, { start: number; end: number; count: number }> = (() => {
  const tiers: BadgeTier[] = ['rookie', 'bronze', 'silver', 'gold', 'holo', 'mythic'];
  const out = {} as Record<BadgeTier, { start: number; end: number; count: number }>;
  for (const t of tiers) {
    const items = BADGES.filter((b) => b.tier === t);
    out[t] = {
      start: items[0]?.level ?? 1,
      end: items[items.length - 1]?.level ?? 1,
      count: items.length,
    };
  }
  return out;
})();

export function getBadgeForLevel(level: number): BadgeDef {
  const clamped = Math.max(1, Math.min(BADGES.length, Math.floor(level)));
  return BADGES[clamped - 1];
}
