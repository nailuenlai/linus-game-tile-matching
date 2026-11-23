import type { WeaponDef, WeaponId } from '../types';
import {
  SPLAT3_WEAPONS,
  SPLAT3_WEAPON_BY_ROW_ID,
  SPLAT3_WEAPONS_BY_SLOT,
  type Splat3WeaponInfo,
} from './splat3Weapons.generated';

export { SPLAT3_WEAPONS, SPLAT3_WEAPON_BY_ROW_ID, SPLAT3_WEAPONS_BY_SLOT };
export type { Splat3WeaponInfo };

export const TOTAL_SPLAT3_WEAPONS = SPLAT3_WEAPONS.length;

export function getWeaponImgUrl(rowId: string): string {
  return `./assets/weapons/${rowId}.webp`;
}

export const SPECIAL_ICON_URLS = {
  eliter4k: './assets/weapons/Charger_Long_00.webp',
  splatbomb: './assets/weapons/special_splatbomb.webp',
  booyah: './assets/weapons/special_booyah.webp',
} as const;

export const DEFAULT_WEAPON_ROW_IDS: readonly [string, string, string, string, string, string] = [
  'Shooter_Normal_00',   // 斯普拉射擊槍
  'Roller_Normal_00',    // 斯普拉滾筒
  'Maneuver_Normal_00',  // 斯普拉機動槍
  'Slosher_Strong_00',   // 飛濺潑桶
  'Saber_Lite_00',       // 雨刷刮水刀
  'Stringer_Normal_00',  // 三發獵魚弓
] as const;

/**
 * 6 maximally separated Splatoon 3 ink slot themes (color + silhouette)
 * paired with real Splatoon 3 v12.0.0 weapon icons.
 */
export const WEAPONS: readonly WeaponDef[] = [
  {
    id: 0,
    rowId: 'Shooter_Normal_00',
    nameZh: '斯普拉射擊槍',
    nameEn: 'Splattershot',
    shortZh: '射擊槍',
    imgUrl: getWeaponImgUrl('Shooter_Normal_00'),
    primaryHex: '#FFD600',
    secondaryHex: '#0091FF',
    darkHex: '#A67C00',
    rimHex: '#FFF4A3',
    colorInt: 0xffd600,
    shape: 'roundedSquare',
  },
  {
    id: 1,
    rowId: 'Roller_Normal_00',
    nameZh: '斯普拉滾筒',
    nameEn: 'Splat Roller',
    shortZh: '滾筒',
    imgUrl: getWeaponImgUrl('Roller_Normal_00'),
    primaryHex: '#FF1F8F',
    secondaryHex: '#00F0FF',
    darkHex: '#9E004F',
    rimHex: '#FFA8D5',
    colorInt: 0xff1f8f,
    shape: 'cushion',
  },
  {
    id: 2,
    rowId: 'Maneuver_Normal_00',
    nameZh: '斯普拉機動槍',
    nameEn: 'Splat Dualies',
    shortZh: '機動槍',
    imgUrl: getWeaponImgUrl('Maneuver_Normal_00'),
    primaryHex: '#00D4FF',
    secondaryHex: '#1836B2',
    darkHex: '#007399',
    rimHex: '#B8F3FF',
    colorInt: 0x00d4ff,
    shape: 'octagon',
  },
  {
    id: 3,
    rowId: 'Slosher_Strong_00',
    nameZh: '飛濺潑桶',
    nameEn: 'Slosher',
    shortZh: '潑桶',
    imgUrl: getWeaponImgUrl('Slosher_Strong_00'),
    primaryHex: '#FF6200',
    secondaryHex: '#FFF2B2',
    darkHex: '#A83200',
    rimHex: '#FFC299',
    colorInt: 0xff6200,
    shape: 'bucketHex',
  },
  {
    id: 4,
    rowId: 'Saber_Lite_00',
    nameZh: '雨刷刮水刀',
    nameEn: 'Splatana Wiper',
    shortZh: '刮水刀',
    imgUrl: getWeaponImgUrl('Saber_Lite_00'),
    primaryHex: '#66E800',
    secondaryHex: '#1E293B',
    darkHex: '#2F7D00',
    rimHex: '#CCFF99',
    colorInt: 0x66e800,
    shape: 'diamond',
  },
  {
    id: 5,
    rowId: 'Stringer_Normal_00',
    nameZh: '三發獵魚弓',
    nameEn: 'Tri-Stringer',
    shortZh: '獵魚弓',
    imgUrl: getWeaponImgUrl('Stringer_Normal_00'),
    primaryHex: '#9B4DFF',
    secondaryHex: '#FFE66D',
    darkHex: '#4E1699',
    rimHex: '#E0C3FF',
    colorInt: 0x9b4dff,
    shape: 'shield',
  },
] as const;

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPONS[id];
}

export function getWeaponDisplayName(rowId: string, fallbackSlot: WeaponId): string {
  return SPLAT3_WEAPON_BY_ROW_ID.get(rowId)?.nameZh ?? WEAPONS[fallbackSlot].nameZh;
}

/**
 * Selects 6 real Splatoon 3 v12.0.0 weapons (one per distinct color-coded class slot)
 * for any level. Level 1 uses the iconic 6 flagship weapons; subsequent levels rotate
 * through all 174 v12.0.0 weapons, and weapon-badge levels always include that badge's exact weapon!
 */
export function getLevelWeaponLoadout(
  levelNum: number,
  featuredWeaponRowId?: string,
): readonly [string, string, string, string, string, string] {
  if (levelNum === 1 && !featuredWeaponRowId) {
    return DEFAULT_WEAPON_ROW_IDS;
  }

  const picked: [string, string, string, string, string, string] = [
    DEFAULT_WEAPON_ROW_IDS[0],
    DEFAULT_WEAPON_ROW_IDS[1],
    DEFAULT_WEAPON_ROW_IDS[2],
    DEFAULT_WEAPON_ROW_IDS[3],
    DEFAULT_WEAPON_ROW_IDS[4],
    DEFAULT_WEAPON_ROW_IDS[5],
  ];

  // Rotate cleanly through all 174 weapons across levels so players experience the entire v12.0.0 arsenal
  const step = Math.floor((levelNum - 1) / 2);
  for (let slot = 0; slot < 6; slot++) {
    const pool = SPLAT3_WEAPONS_BY_SLOT[slot];
    if (pool.length > 0 && levelNum > 1) {
      const idx = (step * (slot + 1) + levelNum * 3) % pool.length;
      picked[slot] = pool[idx].rowId;
    }
  }

  // Always guarantee the badge's exact weapon appears on the board for weapon-freshness levels!
  if (featuredWeaponRowId) {
    const info = SPLAT3_WEAPON_BY_ROW_ID.get(featuredWeaponRowId);
    if (info) {
      picked[info.slot] = info.rowId;
    }
  }

  return picked;
}
