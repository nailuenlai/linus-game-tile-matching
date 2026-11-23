import type { SaveData } from '../types';
import { TOTAL_LEVELS } from '../data/levels';

const STORAGE_KEY = 'splat_crush_3_save_v1200';

const DEFAULT_SAVE: SaveData = {
  highestUnlockedLevel: 1,
  levelStars: {},
  levelBestScore: {},
  earnedBadges: [],
  equippedBadges: [],
  sandboxUnlockAll: false,
  muted: false,
};

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          ...DEFAULT_SAVE,
          levelStars: {},
          levelBestScore: {},
          earnedBadges: [],
          equippedBadges: [],
        };
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        highestUnlockedLevel: Math.max(
          1,
          Math.min(TOTAL_LEVELS, parsed.highestUnlockedLevel ?? 1),
        ),
        levelStars: parsed.levelStars ?? {},
        levelBestScore: parsed.levelBestScore ?? {},
        earnedBadges: Array.isArray(parsed.earnedBadges)
          ? [...new Set(parsed.earnedBadges)].filter((n) => n >= 1 && n <= TOTAL_LEVELS)
          : [],
        equippedBadges: Array.isArray(parsed.equippedBadges)
          ? parsed.equippedBadges.filter((n) => n >= 1 && n <= TOTAL_LEVELS).slice(0, 3)
          : [],
        sandboxUnlockAll: Boolean(parsed.sandboxUnlockAll),
        muted: Boolean(parsed.muted),
      };
    } catch {
      return {
        ...DEFAULT_SAVE,
        levelStars: {},
        levelBestScore: {},
        earnedBadges: [],
        equippedBadges: [],
      };
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore private browsing quota failures cleanly
    }
  }

  public getData(): SaveData {
    return this.data;
  }

  public isLevelUnlocked(level: number): boolean {
    return this.data.sandboxUnlockAll || level <= this.data.highestUnlockedLevel;
  }

  public recordLevelClear(
    level: number,
    score: number,
    stars: number,
  ): { isNewBadge: boolean } {
    const prevStars = this.data.levelStars[level] ?? 0;
    if (stars > prevStars) {
      this.data.levelStars[level] = stars;
    }
    const prevBest = this.data.levelBestScore[level] ?? 0;
    if (score > prevBest) {
      this.data.levelBestScore[level] = score;
    }
    if (level >= this.data.highestUnlockedLevel && level < TOTAL_LEVELS) {
      this.data.highestUnlockedLevel = level + 1;
    }

    const isNewBadge = !this.data.earnedBadges.includes(level);
    if (isNewBadge) {
      this.data.earnedBadges.push(level);
      this.data.earnedBadges.sort((a, b) => a - b);
      if (this.data.equippedBadges.length < 3) {
        this.data.equippedBadges.push(level);
      }
    }

    this.persist();
    return { isNewBadge };
  }

  public toggleEquipBadge(level: number): void {
    if (!this.data.earnedBadges.includes(level)) return;
    const idx = this.data.equippedBadges.indexOf(level);
    if (idx >= 0) {
      this.data.equippedBadges.splice(idx, 1);
    } else {
      if (this.data.equippedBadges.length >= 3) {
        this.data.equippedBadges.shift();
      }
      this.data.equippedBadges.push(level);
    }
    this.persist();
  }

  public setSandboxUnlockAll(enabled: boolean): void {
    this.data.sandboxUnlockAll = enabled;
    this.persist();
  }

  public setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.persist();
  }

  public getTotalStars(): number {
    return Object.values(this.data.levelStars).reduce((acc, s) => acc + s, 0);
  }
}
