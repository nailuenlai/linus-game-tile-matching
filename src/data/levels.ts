import type { BadgeTier, ChapterDef, LevelDef, LevelGoal, WeaponId } from '../types';
import { BADGES, TOTAL_BADGES, getBadgeForLevel } from './badges';
import { getLevelWeaponLoadout } from './weapons';

export const TOTAL_LEVELS = TOTAL_BADGES;
export const LEVELS_PER_CHAPTER = 50;

interface ChapterThemePreset {
  nameZh: string;
  subtitleZh: string;
  themeHex: string;
  accentHex: string;
  bgTopHex: string;
  bgBottomHex: string;
}

const CHAPTER_THEMES: readonly ChapterThemePreset[] = [
  { nameZh: '蠻頹鎮廣場', subtitleZh: 'Splatsville Plaza', themeHex: '#FFD600', accentHex: '#6A00FF', bgTopHex: '#181A28', bgBottomHex: '#10131F' },
  { nameZh: '幻界・入口峽谷', subtitleZh: 'Alterna Crater', themeHex: '#00D4FF', accentHex: '#FF248C', bgTopHex: '#0F2233', bgBottomHex: '#0A1522' },
  { nameZh: '鰻鯰區', subtitleZh: 'Eeltail Alley', themeHex: '#66E800', accentHex: '#FF1F8F', bgTopHex: '#152418', bgBottomHex: '#0D1710' },
  { nameZh: '魚露遺址', subtitleZh: 'Scorch Gorge', themeHex: '#FF6200', accentHex: '#FFD600', bgTopHex: '#2A1812', bgBottomHex: '#170E0B' },
  { nameZh: '竹蟶疏洪道', subtitleZh: 'Undertow Spillway', themeHex: '#38BDF8', accentHex: '#FACC15', bgTopHex: '#10212D', bgBottomHex: '#0A151E' },
  { nameZh: '醋飯海洋世界', subtitleZh: 'Mahi-Mahi Resort', themeHex: '#00E5FF', accentHex: '#FF4081', bgTopHex: '#0F2536', bgBottomHex: '#0A1724' },
  { nameZh: '新卷鮭造船廠', subtitleZh: 'Mincemeat Metalworks', themeHex: '#F97316', accentHex: '#22D3EE', bgTopHex: '#251B14', bgBottomHex: '#140F0B' },
  { nameZh: '金眼鯛美術館', subtitleZh: 'Museum d\'Alfonsino', themeHex: '#A855F7', accentHex: '#FDE047', bgTopHex: '#1E1530', bgBottomHex: '#120D1F' },
  { nameZh: '海女美術大學', subtitleZh: 'Inkblot Art Academy', themeHex: '#EC4899', accentHex: '#38F9D7', bgTopHex: '#261428', bgBottomHex: '#140B16' },
  { nameZh: '座頭購物中心', subtitleZh: 'MakoMart', themeHex: '#22C55E', accentHex: '#FF6200', bgTopHex: '#12241A', bgBottomHex: '#0B1610' },
  { nameZh: '溫泉花大峽谷', subtitleZh: 'Brinewater Springs', themeHex: '#F43F5E', accentHex: '#FFD600', bgTopHex: '#29141C', bgBottomHex: '#160B10' },
  { nameZh: '臭魚乾溫泉', subtitleZh: 'Flounder Heights', themeHex: '#F59E0B', accentHex: '#38BDF8', bgTopHex: '#281E12', bgBottomHex: '#15100A' },
  { nameZh: '昆布賽道', subtitleZh: 'Humpback Pump Track', themeHex: '#84CC16', accentHex: '#A855F7', bgTopHex: '#1B2512', bgBottomHex: '#10160B' },
  { nameZh: '魚肉碎金屬', subtitleZh: 'Barnacle & Dime', themeHex: '#06B6D4', accentHex: '#FF2E93', bgTopHex: '#10242C', bgBottomHex: '#0A161B' },
  { nameZh: '熊先生商會・鮭壩', subtitleZh: 'Spawning Grounds', themeHex: '#FF8C00', accentHex: '#00E5B0', bgTopHex: '#231D14', bgBottomHex: '#14110C' },
  { nameZh: '麥年海洋發電所', subtitleZh: 'Gone Fission Hydroplant', themeHex: '#10B981', accentHex: '#FACC15', bgTopHex: '#10251F', bgBottomHex: '#0A1613' },
  { nameZh: '漂浮落難船', subtitleZh: 'Marooner\'s Bay', themeHex: '#EAB308', accentHex: '#F97316', bgTopHex: '#251F12', bgBottomHex: '#14110A' },
  { nameZh: '生筋子系統交流道', subtitleZh: 'Jammin\' Salmon Junction', themeHex: '#FB7185', accentHex: '#38F9D7', bgTopHex: '#27151C', bgBottomHex: '#150B0F' },
  { nameZh: '鮭魚心臟鬥技場', subtitleZh: 'Bonerattle Arena', themeHex: '#F97316', accentHex: '#FFD600', bgTopHex: '#2A1911', bgBottomHex: '#160D09' },
  { nameZh: '秩序之塔・蒼白尖塔', subtitleZh: 'Side Order Spire', themeHex: '#E2E8F0', accentHex: '#FF2E93', bgTopHex: '#1D222B', bgBottomHex: '#11151B' },
  { nameZh: '尚興市・懷舊廣場', subtitleZh: 'Inkopolis Plaza', themeHex: '#84CC16', accentHex: '#FF1F8F', bgTopHex: '#172515', bgBottomHex: '#0E170D' },
  { nameZh: '尚興廣場・星光大道', subtitleZh: 'Inkopolis Square', themeHex: '#F472B6', accentHex: '#00F5FF', bgTopHex: '#261428', bgBottomHex: '#140B17' },
  { nameZh: '塔拉波特購物公園', subtitleZh: 'Um\'ami Ruins', themeHex: '#FBBF24', accentHex: '#8B5CF6', bgTopHex: '#261F12', bgBottomHex: '#14100A' },
  { nameZh: '高腳經濟特區', subtitleZh: 'Crableg Capital', themeHex: '#38BDF8', accentHex: '#F43F5E', bgTopHex: '#102130', bgBottomHex: '#0A141E' },
  { nameZh: '鬼頭刀SPA渡假區', subtitleZh: 'Shipshape Cargo Co.', themeHex: '#00F5D4', accentHex: '#FF6200', bgTopHex: '#0F2526', bgBottomHex: '#091618' },
  { nameZh: '藍鰭煤礦場', subtitleZh: 'Bluefin Depot', themeHex: '#3B82F6', accentHex: '#FFD600', bgTopHex: '#111D33', bgBottomHex: '#0A111F' },
  { nameZh: '祭典之夜・三色舞台', subtitleZh: 'Grand Festival Bowl', themeHex: '#FF1F8F', accentHex: '#FFD600', bgTopHex: '#26112B', bgBottomHex: '#120A19' },
  { nameZh: '大型跑・極限防線', subtitleZh: 'Big Run Frontline', themeHex: '#FF5722', accentHex: '#38F9D7', bgTopHex: '#2A1412', bgBottomHex: '#160B0A' },
  { nameZh: '蠻頹挑戰 S+ 殿堂', subtitleZh: 'Anarchy S+ Arena', themeHex: '#FF4B2B', accentHex: '#00D4FF', bgTopHex: '#281317', bgBottomHex: '#140A0D' },
  { nameZh: 'X 比賽・艾洛眼與暇古', subtitleZh: 'X Battle Divisions', themeHex: '#38F9D7', accentHex: '#FF2E93', bgTopHex: '#12222C', bgBottomHex: '#0A141B' },
  { nameZh: 'X 比賽巔峰・最終神話', subtitleZh: 'X Battle Top 10 Summit', themeHex: '#FFE45E', accentHex: '#FF2E93', bgTopHex: '#1E1436', bgBottomHex: '#0B081A' },
];

export const CHAPTERS: readonly ChapterDef[] = Array.from(
  { length: Math.ceil(TOTAL_LEVELS / LEVELS_PER_CHAPTER) },
  (_, idx) => {
    const startLevel = idx * LEVELS_PER_CHAPTER + 1;
    const endLevel = Math.min(TOTAL_LEVELS, (idx + 1) * LEVELS_PER_CHAPTER);
    const midLevel = Math.floor((startLevel + endLevel) / 2);
    const midBadge = BADGES[midLevel - 1];
    const theme = CHAPTER_THEMES[idx % CHAPTER_THEMES.length];
    return {
      id: idx + 1,
      nameZh: theme.nameZh,
      subtitleZh: theme.subtitleZh,
      tier: midBadge.tier as BadgeTier,
      themeHex: theme.themeHex,
      accentHex: theme.accentHex,
      bgTopHex: theme.bgTopHex,
      bgBottomHex: theme.bgBottomHex,
      startLevel,
      endLevel,
    };
  },
);

function createEmptyGrid(rows: number, cols: number, fill: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function applyBoardShape(mask: number[][], patternIndex: number): void {
  const rows = mask.length;
  const cols = mask[0].length;
  switch (patternIndex) {
    case 0:
      break;
    case 1:
      // Rounded corners cut out
      mask[0][0] = 0;
      mask[0][cols - 1] = 0;
      mask[rows - 1][0] = 0;
      mask[rows - 1][cols - 1] = 0;
      break;
    case 2:
      // Center island gap
      if (rows >= 8 && cols >= 8) {
        mask[3][3] = 0;
        mask[3][4] = 0;
        mask[4][3] = 0;
        mask[4][4] = 0;
      } else {
        mask[Math.floor(rows / 2)][Math.floor(cols / 2)] = 0;
      }
      break;
    case 3:
      // Twin side notches
      mask[Math.floor(rows / 2)][0] = 0;
      mask[Math.floor(rows / 2)][cols - 1] = 0;
      if (rows >= 8) {
        mask[Math.floor(rows / 2) - 1][0] = 0;
        mask[Math.floor(rows / 2) - 1][cols - 1] = 0;
      }
      break;
    case 4:
      // Diagonal steps corners
      mask[0][0] = 0;
      mask[0][1] = 0;
      mask[1][0] = 0;
      mask[rows - 1][cols - 1] = 0;
      mask[rows - 1][cols - 2] = 0;
      mask[rows - 2][cols - 1] = 0;
      break;
    case 5:
      // Hourglass / bridge
      mask[0][Math.floor(cols / 2)] = 0;
      mask[rows - 1][Math.floor(cols / 2)] = 0;
      if (cols >= 8) {
        mask[0][Math.floor(cols / 2) - 1] = 0;
        mask[rows - 1][Math.floor(cols / 2) - 1] = 0;
      }
      break;
    case 6:
      // Four symmetrical pillars
      mask[2][2] = 0;
      mask[2][cols - 3] = 0;
      mask[rows - 3][2] = 0;
      mask[rows - 3][cols - 3] = 0;
      break;
  }
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Builds a deterministic, fair, solvable Match-3 level whose difficulty maps
 * directly to the corresponding Splatoon 3 v12.0.0 badge's acquisition difficulty (1..100).
 */
function buildLevel(levelNum: number): LevelDef {
  const badge = getBadgeForLevel(levelNum);
  const diff = badge.difficulty; // 1..100 directly from real Splatoon 3 badge difficulty!
  const chapterIdx = Math.floor((levelNum - 1) / LEVELS_PER_CHAPTER);
  const chapter = CHAPTERS[chapterIdx];
  const stageInChapter = ((levelNum - 1) % LEVELS_PER_CHAPTER) + 1;
  const isBoss =
    levelNum === TOTAL_LEVELS ||
    diff >= 99 ||
    stageInChapter === LEVELS_PER_CHAPTER ||
    levelNum % 25 === 0;
  const rng = seededRand(levelNum * 7919 + diff * 1013 + 31337);

  // Board size directly follows badge difficulty: 7x7 early (diff <= 18), 8x8 mid-to-mythic
  const rows = diff <= 14 ? 7 : diff <= 24 && levelNum % 3 === 1 ? 7 : 8;
  const cols = rows;

  // Color count directly follows badge difficulty:
  // diff 1..32 -> 5 weapons (brisk combos), diff 33..45 -> mixed 5/6, diff 46..100 -> 6 weapons
  const weaponCount: 5 | 6 =
    diff <= 32 ? 5 : diff <= 45 ? (levelNum % 2 === 0 ? 6 : 5) : 6;

  const mask = createEmptyGrid(rows, cols, 1);
  const turfMask = createEmptyGrid(rows, cols, 0);
  const blockerMask = createEmptyGrid(rows, cols, 0);

  // Board shape variation unlocks at diff >= 16 (Bronze+)
  if (diff >= 16) {
    const shapeChance = diff >= 70 ? 2 : 3;
    const shapeIdx = isBoss
      ? ((levelNum % 6) + 1)
      : levelNum % shapeChance === 0
        ? ((levelNum % 6) + 1)
        : 0;
    applyBoardShape(mask, shapeIdx);
  }

  const playableCells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r][c] === 1) playableCells.push({ r, c });
    }
  }

  // Obstacles scale strictly with Splatoon 3 badge difficulty (diff 1..100)
  const wantsTurf =
    (diff >= 10 && levelNum % 3 === 2) ||
    (diff >= 55 && levelNum % 2 === 0) ||
    diff >= 88;

  const wantsCrates =
    (diff >= 18 && (levelNum % 3 === 0 || isBoss)) ||
    (diff >= 42 && levelNum % 2 === 1) ||
    diff >= 78;

  const wantsOoze =
    (diff >= 52 && (levelNum % 4 === 0 || isBoss)) ||
    (diff >= 75 && levelNum % 2 === 0) ||
    diff >= 90;

  let crateTargetCount = 0;
  if (wantsCrates) {
    const baseCrates = Math.min(16, 4 + Math.floor(diff / 9) + (isBoss ? 2 : 0));
    const useSteel = diff >= 36;
    const steelProb = Math.min(0.85, Math.max(0.25, (diff - 30) / 75));
    let placed = 0;
    for (let attempt = 0; attempt < 90 && placed < baseCrates; attempt++) {
      const r = 1 + Math.floor(rng() * (rows - 2));
      const c = Math.floor(rng() * Math.ceil(cols / 2));
      const mirrorC = cols - 1 - c;
      if (mask[r][c] === 1 && blockerMask[r][c] === 0) {
        const val = useSteel && (rng() < steelProb || isBoss) ? 2 : 1;
        blockerMask[r][c] = val;
        placed++;
        crateTargetCount++;
        if (
          mirrorC !== c &&
          mask[r][mirrorC] === 1 &&
          blockerMask[r][mirrorC] === 0 &&
          placed < baseCrates
        ) {
          blockerMask[r][mirrorC] = val;
          placed++;
          crateTargetCount++;
        }
      }
    }
  }

  if (wantsOoze) {
    const oozeCount = Math.min(12, 3 + Math.floor((diff - 48) / 7) + (isBoss ? 2 : 0));
    let placed = 0;
    for (let attempt = 0; attempt < 70 && placed < oozeCount; attempt++) {
      const idx = Math.floor(rng() * playableCells.length);
      const { r, c } = playableCells[idx];
      if (blockerMask[r][c] === 0) {
        blockerMask[r][c] = 3;
        placed++;
        crateTargetCount++;
      }
    }
  }

  let turfCount = 0;
  if (wantsTurf) {
    const desiredTurf = Math.min(
      Math.floor(playableCells.length * 0.6),
      8 + Math.floor(diff / 4) + (isBoss ? 4 : 0),
    );
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const sorted = [...playableCells]
      .filter(({ r, c }) => blockerMask[r][c] === 0 || blockerMask[r][c] === 3)
      .sort((a, b) => {
        const da = Math.abs(a.r - centerR) + Math.abs(a.c - centerC);
        const db = Math.abs(b.r - centerR) + Math.abs(b.c - centerC);
        return da - db;
      });
    for (let i = 0; i < Math.min(desiredTurf, sorted.length); i++) {
      const { r, c } = sorted[i];
      turfMask[r][c] = 1;
      turfCount++;
    }
  }

  // Move budget scales with badge difficulty: generous for easy badges, tight tactical puzzles for mythic badges!
  let baseMoves: number;
  if (diff <= 15) baseMoves = 25;
  else if (diff <= 32) baseMoves = 24;
  else if (diff <= 50) baseMoves = 23;
  else if (diff <= 68) baseMoves = 22;
  else if (diff <= 85) baseMoves = 21;
  else baseMoves = 20;

  const bossBonus = isBoss ? 3 : 0;
  const moves = Math.max(17, baseMoves + bossBonus - (levelNum % 3 === 0 ? 1 : 0));

  // Goals construction
  const goals: LevelGoal[] = [];
  if (crateTargetCount > 0) {
    goals.push({ type: 'crate', target: crateTargetCount });
  }
  if (turfCount > 0) {
    goals.push({ type: 'turf', target: turfCount });
  }

  if (goals.length === 0) {
    if (levelNum === 1) {
      goals.push({ type: 'score', target: 1500 });
    } else if (levelNum % 2 === 0 || badge.weaponRowId) {
      // Weapon collection quota — when it's a weapon badge, collect that weapon's slot!
      const w1 = ((levelNum - 1) % weaponCount) as WeaponId;
      const qty1 = Math.min(42, 12 + Math.floor(diff * 0.28) + (isBoss ? 5 : 0));
      goals.push({ type: 'weapon', weaponId: w1, target: qty1 });
      if (diff >= 20) {
        const w2 = ((levelNum + 2) % weaponCount) as WeaponId;
        const qty2 = Math.min(36, 10 + Math.floor(diff * 0.24));
        goals.push({ type: 'weapon', weaponId: w2, target: qty2 });
      }
    } else {
      const scoreTarget = 1500 + diff * 125 + (isBoss ? 900 : 0);
      goals.push({ type: 'score', target: Math.round(scoreTarget / 100) * 100 });
    }
  } else if (goals.length === 1 && (diff >= 45 || isBoss)) {
    const w = ((levelNum * 3) % weaponCount) as WeaponId;
    const qty = Math.min(32, 10 + Math.floor(diff * 0.2));
    goals.push({ type: 'weapon', weaponId: w, target: qty });
  }

  const star1 = Math.round((1400 + diff * 105) / 100) * 100;
  const star2 = Math.round((star1 * 1.55) / 100) * 100;
  const star3 = Math.round((star1 * 2.2) / 100) * 100;

  const weaponRowIds = getLevelWeaponLoadout(levelNum, badge.weaponRowId);

  return {
    level: levelNum,
    chapterId: chapter.id,
    difficulty: diff,
    nameZh: badge.nameZh,
    weaponRowIds,
    rows,
    cols,
    weaponCount,
    moves,
    starScores: [star1, star2, star3],
    goals,
    mask,
    turfMask,
    blockerMask,
    seed: levelNum * 1337 + diff * 97 + 42,
  };
}

// Lazy cache so all 1,549 levels instantiate on-demand with zero startup latency!
const levelCache = new Map<number, LevelDef>();

export function getLevelDef(level: number): LevelDef {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  let cached = levelCache.get(clamped);
  if (!cached) {
    cached = buildLevel(clamped);
    levelCache.set(clamped, cached);
  }
  return cached;
}

export function getChapterForLevel(level: number): ChapterDef {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const idx = Math.max(
    0,
    Math.min(CHAPTERS.length - 1, Math.floor((clamped - 1) / LEVELS_PER_CHAPTER)),
  );
  return CHAPTERS[idx];
}
