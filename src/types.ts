export type WeaponId = 0 | 1 | 2 | 3 | 4 | 5;

export type SpecialType = 'none' | 'eliter4k' | 'splatbomb' | 'booyah';

export type BlockerType = 'none' | 'crate1' | 'crate2' | 'ooze';

export interface WeaponDef {
  id: WeaponId;
  nameZh: string;
  nameEn: string;
  shortZh: string;
  primaryHex: string;
  secondaryHex: string;
  darkHex: string;
  rimHex: string;
  colorInt: number;
  shape: 'roundedSquare' | 'cushion' | 'octagon' | 'bucketHex' | 'diamond' | 'shield';
}

export type BadgeTier = 'rookie' | 'bronze' | 'silver' | 'gold' | 'holo' | 'mythic';

export interface BadgeDef {
  level: number;
  id: string;
  nameZh: string;
  subtitleZh: string;
  tier: BadgeTier;
  tierLabelZh: string;
  iconKey: string;
  accentHex: string;
  bgHex: string;
  stars: number;
}

export interface LevelGoal {
  type: 'score' | 'weapon' | 'turf' | 'crate';
  target: number;
  weaponId?: WeaponId;
}

export interface ChapterDef {
  id: number;
  nameZh: string;
  subtitleZh: string;
  themeHex: string;
  accentHex: string;
  bgTopHex: string;
  bgBottomHex: string;
  startLevel: number;
  endLevel: number;
}

export interface LevelDef {
  level: number;
  chapterId: number;
  nameZh: string;
  rows: number;
  cols: number;
  weaponCount: 5 | 6;
  moves: number;
  starScores: [number, number, number];
  goals: LevelGoal[];
  /** 1 = playable, 0 = hole */
  mask: number[][];
  /** Initial turf cells to ink */
  turfMask: number[][];
  /** Initial blockers: 0=none, 1=crate1, 2=crate2, 3=ooze */
  blockerMask: number[][];
  seed: number;
}

export interface TileState {
  uid: number;
  weaponId: WeaponId;
  special: SpecialType;
  row: number;
  col: number;
}

export interface CellState {
  row: number;
  col: number;
  playable: boolean;
  needsTurf: boolean;
  turfPainted: boolean;
  turfColorHex: string;
  blocker: BlockerType;
  tile: TileState | null;
}

export interface ClearEffectEvent {
  kind: 'vertical4k' | 'horizontalBomb' | 'fullColumn4k' | 'fullRowBomb' | 'crossCombo' | 'booyah';
  colorHex: string;
  originRow: number;
  originCol: number;
  cells: Array<{ row: number; col: number }>;
}

export interface MoveResult {
  valid: boolean;
  swapped: [{ row: number; col: number }, { row: number; col: number }];
  steps: CascadeStep[];
  totalScoreGained: number;
}

export interface CascadeStep {
  comboIndex: number;
  clearedTiles: Array<{
    uid: number;
    row: number;
    col: number;
    weaponId: WeaponId;
    special: SpecialType;
  }>;
  spawnedSpecials: Array<{
    uid: number;
    row: number;
    col: number;
    weaponId: WeaponId;
    special: SpecialType;
  }>;
  blockerHits: Array<{
    row: number;
    col: number;
    prev: BlockerType;
    next: BlockerType;
  }>;
  turfPainted: Array<{
    row: number;
    col: number;
    colorHex: string;
  }>;
  effects: ClearEffectEvent[];
  falls: Array<{
    uid: number;
    fromRow: number;
    toRow: number;
    col: number;
    isNew: boolean;
    weaponId: WeaponId;
    special: SpecialType;
  }>;
  scoreGained: number;
}

export interface GoalProgress {
  goal: LevelGoal;
  current: number;
  completed: boolean;
}

export interface SaveData {
  highestUnlockedLevel: number;
  levelStars: Record<number, number>;
  levelBestScore: Record<number, number>;
  earnedBadges: number[];
  equippedBadges: number[];
  sandboxUnlockAll: boolean;
  muted: boolean;
}
