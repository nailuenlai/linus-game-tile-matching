import type { ChapterDef, LevelDef, LevelGoal, WeaponId } from '../types';

export const CHAPTERS: readonly ChapterDef[] = [
  {
    id: 1,
    nameZh: '蠻頹鎮廣場',
    subtitleZh: 'Splatsville Plaza',
    themeHex: '#FFD600',
    accentHex: '#6A00FF',
    bgTopHex: '#181A28',
    bgBottomHex: '#10131F',
    startLevel: 1,
    endLevel: 10,
  },
  {
    id: 2,
    nameZh: '醋飯海洋世界',
    subtitleZh: 'Mahi-Mahi Resort',
    themeHex: '#00D4FF',
    accentHex: '#FF248C',
    bgTopHex: '#0F2233',
    bgBottomHex: '#0A1522',
    startLevel: 11,
    endLevel: 20,
  },
  {
    id: 3,
    nameZh: '魚露遺址',
    subtitleZh: 'Scorch Gorge',
    themeHex: '#FF6200',
    accentHex: '#FFD600',
    bgTopHex: '#2A1812',
    bgBottomHex: '#170E0B',
    startLevel: 21,
    endLevel: 30,
  },
  {
    id: 4,
    nameZh: '鰻鯰區',
    subtitleZh: 'Eeltail Alley',
    themeHex: '#66E800',
    accentHex: '#FF1F8F',
    bgTopHex: '#152418',
    bgBottomHex: '#0D1710',
    startLevel: 31,
    endLevel: 40,
  },
  {
    id: 5,
    nameZh: '熊先生商會・鮭魚跑',
    subtitleZh: 'Grizzco Salmon Run',
    themeHex: '#FF8C00',
    accentHex: '#00E5B0',
    bgTopHex: '#231D14',
    bgBottomHex: '#14110C',
    startLevel: 41,
    endLevel: 50,
  },
  {
    id: 6,
    nameZh: '幻界・雪原',
    subtitleZh: 'Alterna Crater',
    themeHex: '#9B4DFF',
    accentHex: '#00E5FF',
    bgTopHex: '#1D1630',
    bgBottomHex: '#100C1E',
    startLevel: 51,
    endLevel: 60,
  },
  {
    id: 7,
    nameZh: '秩序之塔',
    subtitleZh: 'Side Order Spire',
    themeHex: '#E2E8F0',
    accentHex: '#FF2E93',
    bgTopHex: '#1D222B',
    bgBottomHex: '#11151B',
    startLevel: 61,
    endLevel: 70,
  },
  {
    id: 8,
    nameZh: '祭典之夜',
    subtitleZh: 'Splatfest Night',
    themeHex: '#FF1F8F',
    accentHex: '#FFD600',
    bgTopHex: '#26112B',
    bgBottomHex: '#120A19',
    startLevel: 71,
    endLevel: 80,
  },
  {
    id: 9,
    nameZh: '真格挑戰 S+',
    subtitleZh: 'Anarchy S+ Series',
    themeHex: '#FF4B2B',
    accentHex: '#00D4FF',
    bgTopHex: '#281317',
    bgBottomHex: '#140A0D',
    startLevel: 81,
    endLevel: 90,
  },
  {
    id: 10,
    nameZh: 'X 比賽巔峰',
    subtitleZh: 'X Battle Top 500',
    themeHex: '#FFE45E',
    accentHex: '#38F9D7',
    bgTopHex: '#1A1432',
    bgBottomHex: '#0B081A',
    startLevel: 91,
    endLevel: 100,
  },
];

function createEmptyGrid(rows: number, cols: number, fill: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function applyBoardShape(mask: number[][], patternIndex: number): void {
  const rows = mask.length;
  const cols = mask[0].length;
  switch (patternIndex) {
    case 0:
      // Full open rectangle
      break;
    case 1:
      // Rounded corners cut out
      mask[0][0] = 0;
      mask[0][cols - 1] = 0;
      mask[rows - 1][0] = 0;
      mask[rows - 1][cols - 1] = 0;
      break;
    case 2:
      // Center island gap (2x2 or 1x2)
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

const STAGE_SUFFIXES = [
  '開幕暖身',
  '墨水前線',
  '狙擊長廊',
  '炸彈交鋒',
  '高台壓制',
  '中路亂鬥',
  '急速連鎖',
  '逆轉突擊',
  '最終衝刺',
  '章節頭目戰',
];

function buildLevel(levelNum: number): LevelDef {
  const chapterIdx = Math.floor((levelNum - 1) / 10);
  const chapter = CHAPTERS[chapterIdx];
  const stageInChapter = ((levelNum - 1) % 10) + 1; // 1..10
  const isBoss = stageInChapter === 10 || levelNum === 100;
  const rng = seededRand(levelNum * 7919 + 31337);

  // Board size scales gently: Lv 1-6 are 7x7, Lv 7+ are 7x7 or 8x8
  const rows = levelNum <= 6 ? 7 : levelNum % 4 === 1 && levelNum < 30 ? 7 : 8;
  const cols = rows;

  // Color count: 5 colors early for brisk combos, 6 colors gradually introduced from Ch 4+
  const weaponCount: 5 | 6 =
    levelNum <= 30 ? 5 : levelNum <= 50 ? (stageInChapter >= 6 ? 6 : 5) : 6;

  const mask = createEmptyGrid(rows, cols, 1);
  const turfMask = createEmptyGrid(rows, cols, 0);
  const blockerMask = createEmptyGrid(rows, cols, 0);

  // Apply board shape variation from level 11 onward (and boss levels)
  if (levelNum >= 11) {
    const shapeIdx = isBoss
      ? ((chapterIdx % 5) + 1)
      : stageInChapter % 3 === 0
        ? ((levelNum % 6) + 1)
        : 0;
    applyBoardShape(mask, shapeIdx);
  }

  // Collect playable cells
  const playableCells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (mask[r][c] === 1) playableCells.push({ r, c });
    }
  }

  // Determine level archetype & obstacles smoothly escalating across chapters
  const wantsTurf =
    (levelNum >= 11 && stageInChapter % 3 === 2) ||
    (levelNum >= 61 && stageInChapter % 2 === 0) ||
    levelNum === 100;

  const wantsCrates =
    (levelNum >= 21 && (stageInChapter % 3 === 0 || isBoss)) ||
    (levelNum >= 41 && stageInChapter % 2 === 1);

  const wantsOoze =
    (levelNum >= 51 && (stageInChapter === 4 || stageInChapter === 8 || isBoss)) ||
    levelNum === 100;

  // Populate blockers symmetrically where possible so boards feel handcrafted
  let crateTargetCount = 0;
  if (wantsCrates) {
    const baseCrates = Math.min(14, 4 + Math.floor(levelNum / 10) + (isBoss ? 3 : 0));
    const useSteel = levelNum >= 41;
    let placed = 0;
    for (let attempt = 0; attempt < 80 && placed < baseCrates; attempt++) {
      const r = 1 + Math.floor(rng() * (rows - 2));
      const c = Math.floor(rng() * Math.ceil(cols / 2));
      const mirrorC = cols - 1 - c;
      if (mask[r][c] === 1 && blockerMask[r][c] === 0) {
        const val = useSteel && (rng() < 0.45 || isBoss) ? 2 : 1;
        blockerMask[r][c] = val;
        placed++;
        crateTargetCount++;
        if (mirrorC !== c && mask[r][mirrorC] === 1 && blockerMask[r][mirrorC] === 0 && placed < baseCrates) {
          blockerMask[r][mirrorC] = val;
          placed++;
          crateTargetCount++;
        }
      }
    }
  }

  if (wantsOoze) {
    const oozeCount = Math.min(10, 3 + Math.floor((levelNum - 45) / 10) + (isBoss ? 2 : 0));
    let placed = 0;
    for (let attempt = 0; attempt < 60 && placed < oozeCount; attempt++) {
      const idx = Math.floor(rng() * playableCells.length);
      const { r, c } = playableCells[idx];
      if (blockerMask[r][c] === 0) {
        blockerMask[r][c] = 3; // Fuzzy Ooze coating
        placed++;
        crateTargetCount++;
      }
    }
  }

  let turfCount = 0;
  if (wantsTurf) {
    const desiredTurf = Math.min(
      Math.floor(playableCells.length * 0.55),
      10 + Math.floor(levelNum / 5) + (isBoss ? 4 : 0),
    );
    // Create contiguous central turf patch
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

  // Move budget: generous early, tactical later, always fair & solvable
  const baseMoves =
    levelNum <= 5
      ? 22
      : levelNum <= 15
        ? 23
        : levelNum <= 40
          ? 24
          : levelNum <= 70
            ? 25
            : 26;
  const bossBonus = isBoss ? 4 : 0;
  const moves = Math.max(18, baseMoves + bossBonus - Math.floor((stageInChapter - 1) / 4));

  // Goals construction
  const goals: LevelGoal[] = [];

  if (crateTargetCount > 0) {
    goals.push({ type: 'crate', target: crateTargetCount });
  }
  if (turfCount > 0) {
    goals.push({ type: 'turf', target: turfCount });
  }

  // Add weapon collection or score goal so every stage feels varied
  if (goals.length === 0) {
    if (levelNum === 1) {
      // Friendly tutorial level 1: modest score goal
      goals.push({ type: 'score', target: 1500 });
    } else if (stageInChapter % 2 === 0) {
      // Collect 1 or 2 specific weapons
      const w1 = ((levelNum - 1) % weaponCount) as WeaponId;
      const qty1 = Math.min(36, 12 + Math.floor(levelNum / 4) + (isBoss ? 6 : 0));
      goals.push({ type: 'weapon', weaponId: w1, target: qty1 });
      if (levelNum >= 14) {
        const w2 = ((levelNum + 2) % weaponCount) as WeaponId;
        const qty2 = Math.min(32, 10 + Math.floor(levelNum / 5));
        goals.push({ type: 'weapon', weaponId: w2, target: qty2 });
      }
    } else {
      // Score target
      const scoreTarget = 1600 + levelNum * 115 + (isBoss ? 900 : 0);
      goals.push({ type: 'score', target: Math.round(scoreTarget / 100) * 100 });
    }
  } else if (goals.length === 1 && (isBoss || stageInChapter >= 7)) {
    // Pair obstacle goal with a secondary weapon quota on climax levels
    const w = ((levelNum * 3) % weaponCount) as WeaponId;
    const qty = Math.min(28, 10 + Math.floor(levelNum / 6));
    goals.push({ type: 'weapon', weaponId: w, target: qty });
  }

  const star1 = Math.round((1400 + levelNum * 95) / 100) * 100;
  const star2 = Math.round((star1 * 1.55) / 100) * 100;
  const star3 = Math.round((star1 * 2.2) / 100) * 100;

  const nameZh =
    levelNum === 100
      ? '最終祭典傳說'
      : `${chapter.nameZh}・${STAGE_SUFFIXES[stageInChapter - 1]}`;

  return {
    level: levelNum,
    chapterId: chapter.id,
    nameZh,
    rows,
    cols,
    weaponCount,
    moves,
    starScores: [star1, star2, star3],
    goals,
    mask,
    turfMask,
    blockerMask,
    seed: levelNum * 1337 + 42,
  };
}

export const LEVELS: readonly LevelDef[] = Array.from({ length: 100 }, (_, i) =>
  buildLevel(i + 1),
);

export function getLevelDef(level: number): LevelDef {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  return LEVELS[clamped - 1];
}

export function getChapterForLevel(level: number): ChapterDef {
  const idx = Math.max(0, Math.min(CHAPTERS.length - 1, Math.floor((level - 1) / 10)));
  return CHAPTERS[idx];
}
