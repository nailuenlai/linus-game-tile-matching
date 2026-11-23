import type { WeaponDef, WeaponId } from '../types';

/**
 * 6 iconic Splatoon 3 weapons with maximally separated hues and distinct silhouettes
 * for instant mobile readability on an 8x8 board.
 */
export const WEAPONS: readonly WeaponDef[] = [
  {
    id: 0,
    nameZh: '斯普拉射擊槍',
    nameEn: 'Splattershot',
    shortZh: '射擊槍',
    primaryHex: '#FFD600',
    secondaryHex: '#0091FF',
    darkHex: '#A67C00',
    rimHex: '#FFF4A3',
    colorInt: 0xffd600,
    shape: 'roundedSquare',
  },
  {
    id: 1,
    nameZh: '斯普拉滾筒',
    nameEn: 'Splat Roller',
    shortZh: '滾筒',
    primaryHex: '#FF1F8F',
    secondaryHex: '#00F0FF',
    darkHex: '#9E004F',
    rimHex: '#FFA8D5',
    colorInt: 0xff1f8f,
    shape: 'cushion',
  },
  {
    id: 2,
    nameZh: '斯普拉機動槍',
    nameEn: 'Splat Dualies',
    shortZh: '雙槍',
    primaryHex: '#00D4FF',
    secondaryHex: '#1836B2',
    darkHex: '#007399',
    rimHex: '#B8F3FF',
    colorInt: 0x00d4ff,
    shape: 'octagon',
  },
  {
    id: 3,
    nameZh: '飛濺潑桶',
    nameEn: 'Slosher',
    shortZh: '潑桶',
    primaryHex: '#FF6200',
    secondaryHex: '#FFF2B2',
    darkHex: '#A83200',
    rimHex: '#FFC299',
    colorInt: 0xff6200,
    shape: 'bucketHex',
  },
  {
    id: 4,
    nameZh: '雨刷刮水刀',
    nameEn: 'Splatana Wiper',
    shortZh: '刮水刀',
    primaryHex: '#66E800',
    secondaryHex: '#1E293B',
    darkHex: '#2F7D00',
    rimHex: '#CCFF99',
    colorInt: 0x66e800,
    shape: 'diamond',
  },
  {
    id: 5,
    nameZh: '三發獵魚弓',
    nameEn: 'Tri-Stringer',
    shortZh: '獵魚弓',
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
