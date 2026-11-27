import type { BadgeDef, BadgeTier, CascadeStep } from '../types';
import {
  DEFAULT_WEAPON_ROW_IDS,
  TOTAL_SPLAT3_WEAPONS,
  WEAPONS,
  getWeaponDisplayName,
} from '../data/weapons';
import {
  BADGES,
  BADGE_TIER_META,
  BADGE_TIER_RANGES,
  SPLAT3_VERSION,
  TOTAL_BADGES,
  getBadgeForLevel,
} from '../data/badges';
import { CHAPTERS, LEVELS_PER_CHAPTER, TOTAL_LEVELS, getLevelDef } from '../data/levels';
import { Match3Engine } from '../core/Match3Engine';
import { SaveManager } from '../core/SaveManager';
import { TextureLibrary } from '../render/WeaponTextures';
import { getBadgeImageUrl } from '../render/BadgeRenderer';
import { bindInstantTouchElement } from '../core/TouchGuard';

export interface UICallbacks {
  onSelectLevel: (level: number) => void;
  onRestartLevel: () => void;
  onRequestHint: () => void;
  onToggleSound: () => void;
  onModalStateChange: (anyOpen: boolean) => void;
}

const BADGE_PAGE_SIZE = 60;

export class UIManager {
  private readonly save: SaveManager;
  private readonly textures: TextureLibrary;
  private readonly callbacks: UICallbacks;

  private activeChapterId = 1;
  private activeBadgeTierFilter: BadgeTier | 'all' | 'earned' = 'all';
  private mapSearchQuery = '';
  private badgeSearchQuery = '';
  private badgeRenderLimit = BADGE_PAGE_SIZE;
  private inspectedBadgeLevel: number | null = null;
  private currentLevel = 1;
  private calloutTimer: number | null = null;

  // Cached DOM references
  private readonly hudBadgeThumb = document.getElementById('hud-badge-thumb') as HTMLImageElement;
  private readonly hudLevelNum = document.getElementById('hud-level-num')!;
  private readonly hudLevelName = document.getElementById('hud-level-name')!;
  private readonly hudBadgeHint = document.getElementById('hud-badge-hint')!;
  private readonly hudMovesBox = document.getElementById('hud-moves-box')!;
  private readonly hudMoves = document.getElementById('hud-moves')!;
  private readonly hudGoals = document.getElementById('hud-goals')!;
  private readonly hudScore = document.getElementById('hud-score')!;
  private readonly hudStars = document.getElementById('hud-stars')!;
  private readonly hudScoreFill = document.getElementById('hud-score-fill')!;
  private readonly dockMapLabel = document.getElementById('dock-map-label')!;
  private readonly dockBadgeCount = document.getElementById('dock-badge-count')!;
  private readonly soundIcon = document.getElementById('sound-icon')!;
  private readonly calloutBanner = document.getElementById('callout-banner')!;

  private readonly titleOverlay = document.getElementById('title-overlay')!;
  private readonly resultModal = document.getElementById('result-modal')!;
  private readonly mapModal = document.getElementById('map-modal')!;
  private readonly badgeModal = document.getElementById('badge-modal')!;

  private readonly mapSearchInput = document.getElementById('map-search-input') as HTMLInputElement;
  private readonly badgeSearchInput = document.getElementById('badge-search-input') as HTMLInputElement;
  private readonly badgeDetailBar = document.getElementById('badge-detail-bar')!;
  private readonly btnBadgeLoadMore = document.getElementById('btn-badge-load-more') as HTMLButtonElement;

  constructor(save: SaveManager, textures: TextureLibrary, callbacks: UICallbacks) {
    this.save = save;
    this.textures = textures;
    this.callbacks = callbacks;

    this.dockMapLabel.textContent = `${TOTAL_LEVELS}關`;
    const subText = document.getElementById('title-sub-text');
    if (subText) {
      subText.textContent = `斯普拉遁3 真實武器消消樂・全 ${TOTAL_BADGES.toLocaleString()} 枚官方徽章制霸`;
    }
    const teaser = document.getElementById('title-badge-teaser');
    if (teaser) {
      teaser.innerHTML = `🏅 收錄 Ver. ${SPLAT3_VERSION} 全部 <strong>${TOTAL_BADGES.toLocaleString()} 枚</strong>斯普拉遁3 原版徽章與 <strong>${TOTAL_SPLAT3_WEAPONS} 把</strong>武器！關卡難度對應徽章真實取得難易度，從 <strong>Lv.1 ${BADGES[0].nameZh}</strong> 一路挑戰至 <strong>Lv.${TOTAL_LEVELS} ${BADGES[TOTAL_LEVELS - 1].nameZh}</strong>！`;
    }
    const mapTitle = document.getElementById('map-modal-title');
    if (mapTitle) {
      mapTitle.textContent = `${TOTAL_LEVELS.toLocaleString()} 關挑戰地圖 (v${SPLAT3_VERSION})`;
    }

    this.refreshWeaponShowcase();
    this.bindHudButtons();
    this.bindModalButtons();
    this.updateSoundIcon(save.getData().muted);
    this.updateBadgeCounter();
  }

  public refreshWeaponShowcase(): void {
    const showcase = document.getElementById('title-weapon-showcase')!;
    showcase.innerHTML = '';
    for (const w of WEAPONS) {
      const div = document.createElement('div');
      div.className = 'weapon-mini';
      const img = document.createElement('img');
      img.src = this.textures.getWeaponDataUrl(w.id);
      const rowId = this.textures.getCurrentWeaponRowId(w.id) || DEFAULT_WEAPON_ROW_IDS[w.id];
      const dispName = getWeaponDisplayName(rowId, w.id);
      img.alt = dispName;
      const span = document.createElement('span');
      span.textContent = dispName.length > 6 ? dispName.slice(0, 6) : dispName;
      div.append(img, span);
      showcase.appendChild(div);
    }

    (document.getElementById('rule-img-4k') as HTMLImageElement).src =
      this.textures.specialBadgeUrls.eliter4k;
    (document.getElementById('rule-img-bomb') as HTMLImageElement).src =
      this.textures.specialBadgeUrls.splatbomb;
  }

  private bindHudButtons(): void {
    bindInstantTouchElement(document.getElementById('btn-level-pill')!, () => this.openMapModal());
    bindInstantTouchElement(document.getElementById('btn-map')!, () => this.openMapModal());
    bindInstantTouchElement(document.getElementById('btn-badges')!, () => this.openBadgeModal());
    bindInstantTouchElement(document.getElementById('btn-hint')!, () => this.callbacks.onRequestHint());
    bindInstantTouchElement(document.getElementById('btn-restart')!, () => this.callbacks.onRestartLevel());
    bindInstantTouchElement(document.getElementById('btn-sound')!, () => this.callbacks.onToggleSound());
  }

  private bindModalButtons(): void {
    document.getElementById('btn-start-play')!.addEventListener('click', () => {
      this.titleOverlay.classList.add('hidden');
      this.notifyModalChange();
    });

    document.getElementById('btn-title-map')!.addEventListener('click', () => {
      this.titleOverlay.classList.add('hidden');
      this.openMapModal();
    });

    document.getElementById('btn-close-map')!.addEventListener('click', () => {
      this.mapModal.classList.add('hidden');
      this.notifyModalChange();
    });

    document.getElementById('btn-close-badges')!.addEventListener('click', () => {
      this.badgeModal.classList.add('hidden');
      this.notifyModalChange();
    });

    document.getElementById('btn-result-next')!.addEventListener('click', () => {
      this.resultModal.classList.add('hidden');
      this.notifyModalChange();
      const nextLv = Math.min(TOTAL_LEVELS, this.currentLevel + 1);
      this.callbacks.onSelectLevel(nextLv);
    });

    document.getElementById('btn-result-retry')!.addEventListener('click', () => {
      this.resultModal.classList.add('hidden');
      this.notifyModalChange();
      this.callbacks.onRestartLevel();
    });

    document.getElementById('btn-result-badges')!.addEventListener('click', () => {
      this.resultModal.classList.add('hidden');
      this.openBadgeModal();
    });

    const sandboxCheck = document.getElementById('toggle-sandbox') as HTMLInputElement;
    sandboxCheck.checked = this.save.getData().sandboxUnlockAll;
    sandboxCheck.addEventListener('change', () => {
      this.save.setSandboxUnlockAll(sandboxCheck.checked);
      this.renderMapGrid();
    });

    // Map search & direct level jump
    this.mapSearchInput.addEventListener('input', () => {
      this.mapSearchQuery = this.mapSearchInput.value.trim();
      this.renderMapGrid();
    });

    const doMapJump = (): void => {
      const q = this.mapSearchInput.value.trim();
      const num = parseInt(q, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= TOTAL_LEVELS) {
        if (this.save.isLevelUnlocked(num)) {
          this.mapModal.classList.add('hidden');
          this.notifyModalChange();
          this.callbacks.onSelectLevel(num);
        } else {
          // Jump to that level's chapter in map view
          this.activeChapterId = Math.floor((num - 1) / LEVELS_PER_CHAPTER) + 1;
          this.mapSearchInput.value = '';
          this.mapSearchQuery = '';
          this.renderMapTabs();
          this.renderMapGrid();
        }
      }
    };
    document.getElementById('btn-map-jump')!.addEventListener('click', doMapJump);
    this.mapSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doMapJump();
    });

    // Badge locker search & pagination
    this.badgeSearchInput.addEventListener('input', () => {
      this.badgeSearchQuery = this.badgeSearchInput.value.trim();
      this.badgeRenderLimit = BADGE_PAGE_SIZE;
      this.renderBadgeGrid();
    });

    this.btnBadgeLoadMore.addEventListener('click', () => {
      this.badgeRenderLimit += BADGE_PAGE_SIZE;
      this.renderBadgeGrid();
    });
  }

  public isAnyModalOpen(): boolean {
    return (
      !this.titleOverlay.classList.contains('hidden') ||
      !this.resultModal.classList.contains('hidden') ||
      !this.mapModal.classList.contains('hidden') ||
      !this.badgeModal.classList.contains('hidden')
    );
  }

  private notifyModalChange(): void {
    this.callbacks.onModalStateChange(this.isAnyModalOpen());
  }

  public updateSoundIcon(muted: boolean): void {
    this.soundIcon.textContent = muted ? '🔇' : '🔊';
  }

  public updateBadgeCounter(): void {
    const count = this.save.getData().earnedBadges.length;
    this.dockBadgeCount.textContent = `徽章 ${count}`;
  }

  public updateHud(engine: Match3Engine): void {
    const lv = engine.levelDef;
    this.currentLevel = lv.level;
    const badge = getBadgeForLevel(lv.level);

    this.hudBadgeThumb.src = getBadgeImageUrl(badge, false);
    this.hudBadgeThumb.alt = badge.nameZh;
    this.hudLevelNum.textContent = `LV.${lv.level}`;
    this.hudLevelName.textContent = badge.nameZh;
    this.hudBadgeHint.textContent = `難度 ${badge.difficulty}/100・${badge.subtitleZh}`;

    this.hudMoves.textContent = String(engine.movesLeft);
    this.hudMovesBox.classList.toggle('low-moves', engine.movesLeft <= 5);

    this.hudScore.textContent = engine.score.toLocaleString();
    const earnedStars = engine.getEarnedStars();
    this.hudStars.textContent = '★'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars);
    const pct = Math.min(100, (engine.score / lv.starScores[2]) * 100);
    this.hudScoreFill.style.width = `${pct}%`;

    // Render goals with real Splatoon 3 weapon icons
    const goals = engine.getGoalProgress();
    this.hudGoals.innerHTML = '';
    for (const gp of goals) {
      const chip = document.createElement('div');
      chip.className = `goal-chip${gp.completed ? ' done' : ''}`;
      if (gp.goal.type === 'weapon' && gp.goal.weaponId !== undefined) {
        const img = document.createElement('img');
        img.src = this.textures.getWeaponDataUrl(gp.goal.weaponId);
        const rowId = lv.weaponRowIds[gp.goal.weaponId];
        img.alt = getWeaponDisplayName(rowId, gp.goal.weaponId);
        chip.appendChild(img);
        const txt = document.createElement('span');
        txt.textContent = gp.completed ? '✓' : `${gp.current}/${gp.goal.target}`;
        chip.appendChild(txt);
      } else if (gp.goal.type === 'score') {
        chip.textContent = gp.completed
          ? `🎯 分數 ✓`
          : `🎯 ${gp.current.toLocaleString()}/${gp.goal.target.toLocaleString()}`;
      } else if (gp.goal.type === 'turf') {
        const swatchPair = document.createElement('span');
        swatchPair.className = 'turf-swatch-pair';
        swatchPair.innerHTML =
          '<i class="turf-swatch unpainted"></i><span class="turf-arrow">→</span><i class="turf-swatch painted"></i>';
        chip.appendChild(swatchPair);
        const txt = document.createElement('span');
        txt.textContent = gp.completed
          ? `塗地 ✓`
          : `塗地 ${gp.current}/${gp.goal.target}`;
        chip.appendChild(txt);
      } else if (gp.goal.type === 'crate') {
        chip.textContent = gp.completed
          ? `📦 障礙 ✓`
          : `📦 障礙 ${gp.current}/${gp.goal.target}`;
      }
      this.hudGoals.appendChild(chip);
    }
  }

  public showCalloutForStep(step: CascadeStep): void {
    let text = '';
    let cssType = 'type-combo';

    const hasCross = step.effects.some((e) => e.kind === 'crossCombo');
    const hasBooyah = step.effects.some((e) => e.kind === 'booyah');
    const hasFull4K = step.effects.some((e) => e.kind === 'fullColumn4k');
    const hasFullBomb = step.effects.some((e) => e.kind === 'fullRowBomb');
    const hasV4K = step.effects.some((e) => e.kind === 'vertical4k');
    const hasHBomb = step.effects.some((e) => e.kind === 'horizontalBomb');

    if (hasBooyah) {
      text = '🌟 能量讚彈・全場掃蕩！';
      cssType = 'type-combo';
    } else if (hasCross) {
      text = '⚡ 公升4K × 斯普拉炸彈 十字爆破！';
      cssType = 'type-combo';
    } else if (hasFull4K) {
      text = '🎯 公升4K 狙擊槍・全列貫穿！';
      cssType = 'type-4k';
    } else if (hasFullBomb) {
      text = '💣 斯普拉炸彈・全行爆破！';
      cssType = 'type-bomb';
    } else if (step.comboIndex >= 2) {
      text = `🔥 連鎖 COMBO x${step.comboIndex}！`;
      cssType = 'type-combo';
    } else if (hasV4K && hasHBomb) {
      text = '🎯 公升4K + 💣 斯普拉炸彈！';
      cssType = 'type-combo';
    } else if (hasV4K) {
      text = '🎯 公升4K 狙擊槍！';
      cssType = 'type-4k';
    } else if (hasHBomb) {
      text = '💣 斯普拉炸彈！';
      cssType = 'type-bomb';
    }

    if (!text) return;
    this.showBanner(text, cssType);
  }

  public showBanner(text: string, cssType = 'type-combo'): void {
    this.calloutBanner.textContent = text;
    this.calloutBanner.className = `callout-banner ${cssType}`;
    if (this.calloutTimer !== null) window.clearTimeout(this.calloutTimer);
    this.calloutTimer = window.setTimeout(() => {
      this.calloutBanner.classList.add('hidden');
    }, 1050);
  }

  public showResultModal(
    won: boolean,
    level: number,
    score: number,
    stars: number,
    isNewBadge: boolean,
  ): void {
    const tag = document.getElementById('result-status-tag')!;
    const title = document.getElementById('result-title')!;
    const starsEl = document.getElementById('result-stars')!;
    const scoreLine = document.getElementById('result-score-line')!;
    const badgePanel = document.getElementById('result-badge-panel')!;
    const nextBtn = document.getElementById('btn-result-next') as HTMLButtonElement;

    if (won) {
      tag.textContent =
        level === TOTAL_LEVELS ? `ALL ${TOTAL_LEVELS} BADGES COMPLETE!!` : 'STAGE CLEAR!';
      tag.classList.remove('fail');
      title.textContent = `第 ${level} 關 塗地勝利！`;
      starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      scoreLine.textContent = `總分 ${score.toLocaleString()}`;

      const badge = getBadgeForLevel(level);
      const tierMeta = BADGE_TIER_META[badge.tier];
      badgePanel.classList.remove('hidden');
      badgePanel.style.borderColor = tierMeta.colorHex;

      const newPill = document.getElementById('result-badge-new')!;
      newPill.textContent = isNewBadge ? 'NEW BADGE!' : '已持有徽章';
      const tierPill = document.getElementById('result-badge-tier')!;
      tierPill.textContent = `${badge.tierLabelZh}・難度 ${badge.difficulty}/100`;
      tierPill.style.color = tierMeta.colorHex;

      const badgeImg = document.getElementById('result-badge-img') as HTMLImageElement;
      badgeImg.src = getBadgeImageUrl(badge, false);
      badgeImg.alt = badge.nameZh;
      document.getElementById('result-badge-name')!.textContent = badge.nameZh;
      document.getElementById('result-badge-sub')!.textContent = badge.subtitleZh;

      if (level < TOTAL_LEVELS) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = `挑戰第 ${level + 1} 關 →`;
      } else {
        nextBtn.classList.add('hidden');
      }
    } else {
      tag.textContent = 'OUT OF MOVES';
      tag.classList.add('fail');
      title.textContent = `第 ${level} 關 步數耗盡`;
      starsEl.textContent = '☆☆☆';
      scoreLine.textContent = `得分 ${score.toLocaleString()}・再試一次拿徽章！`;
      badgePanel.classList.add('hidden');
      nextBtn.classList.add('hidden');
    }

    this.updateBadgeCounter();
    this.resultModal.classList.remove('hidden');
    this.notifyModalChange();
  }

  public openMapModal(): void {
    this.activeChapterId = Math.floor((this.currentLevel - 1) / LEVELS_PER_CHAPTER) + 1;
    this.mapSearchQuery = '';
    this.mapSearchInput.value = '';
    this.renderMapTabs();
    this.renderMapGrid();
    this.mapModal.classList.remove('hidden');
    this.notifyModalChange();
  }

  private renderMapTabs(): void {
    const tabs = document.getElementById('chapter-tabs')!;
    tabs.innerHTML = '';
    for (const ch of CHAPTERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-chip${ch.id === this.activeChapterId ? ' active' : ''}`;
      btn.textContent = `Ch.${ch.id} (${ch.startLevel}-${ch.endLevel})`;
      btn.addEventListener('click', () => {
        this.activeChapterId = ch.id;
        this.mapSearchQuery = '';
        this.mapSearchInput.value = '';
        this.renderMapTabs();
        this.renderMapGrid();
      });
      tabs.appendChild(btn);
    }
  }

  private renderMapGrid(): void {
    const saveData = this.save.getData();
    const cleared = saveData.earnedBadges.length;
    const totalStars = this.save.getTotalStars();
    const maxStars = TOTAL_LEVELS * 3;
    document.getElementById('map-progress-sub')!.textContent =
      `已通關 ${cleared.toLocaleString()} / ${TOTAL_LEVELS.toLocaleString()} 關・⭐ ${totalStars.toLocaleString()} / ${maxStars.toLocaleString()}`;

    const banner = document.getElementById('chapter-banner')!;
    const grid = document.getElementById('level-grid')!;
    grid.innerHTML = '';

    let levelNums: number[] = [];
    const q = this.mapSearchQuery.toLowerCase();
    if (q.length > 0) {
      const exactNum = parseInt(q, 10);
      const matches = BADGES.filter(
        (b) =>
          (!Number.isNaN(exactNum) && b.level === exactNum) ||
          b.nameZh.toLowerCase().includes(q) ||
          b.subtitleZh.toLowerCase().includes(q) ||
          b.tierLabelZh.includes(q),
      );
      const shown = matches.slice(0, 60);
      levelNums = shown.map((b) => b.level);
      banner.style.borderLeftColor = '#38F9D7';
      banner.innerHTML = `<strong>搜尋結果：「${this.mapSearchQuery}」</strong><span>找到 ${matches.length} 個關卡${matches.length > 60 ? '（顯示前 60 筆）' : ''}</span>`;
    } else {
      const ch = CHAPTERS[this.activeChapterId - 1];
      const firstBadge = getBadgeForLevel(ch.startLevel);
      const lastBadge = getBadgeForLevel(ch.endLevel);
      banner.style.borderLeftColor = ch.themeHex;
      banner.innerHTML = `<strong>第 ${ch.id} 章：${ch.nameZh} (${ch.subtitleZh})</strong><span>Lv.${ch.startLevel} – Lv.${ch.endLevel}・徽章難度 ${firstBadge.difficulty}–${lastBadge.difficulty}/100</span>`;
      for (let lv = ch.startLevel; lv <= ch.endLevel; lv++) {
        levelNums.push(lv);
      }
    }

    const frag = document.createDocumentFragment();
    for (const lv of levelNums) {
      const levelDef = getLevelDef(lv);
      const badge = getBadgeForLevel(lv);
      const unlocked = this.save.isLevelUnlocked(lv);
      const earned = saveData.earnedBadges.includes(lv);
      const stars = saveData.levelStars[lv] ?? 0;
      const tierMeta = BADGE_TIER_META[badge.tier];

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-cell-btn${lv === this.currentLevel ? ' current' : ''}${unlocked ? '' : ' locked'}`;
      btn.disabled = !unlocked;

      const img = document.createElement('img');
      img.src = getBadgeImageUrl(badge, false);
      img.alt = badge.nameZh;
      img.loading = 'lazy';
      img.decoding = 'async';
      if (!earned && !unlocked) {
        img.className = 'badge-locked-img';
      }

      const info = document.createElement('span');
      info.className = 'level-cell-info';

      const numSpan = document.createElement('span');
      numSpan.className = 'level-cell-num';
      numSpan.innerHTML = `第 ${lv} 關${unlocked ? '' : ' 🔒'} <em class="diff-tag" style="color:${tierMeta.colorHex}">難度${badge.difficulty}</em>`;

      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'level-cell-badge';
      badgeSpan.textContent = badge.nameZh;

      const starSpan = document.createElement('span');
      starSpan.className = 'level-cell-stars';
      starSpan.textContent = earned
        ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}・${badge.tierLabelZh}`
        : `${levelDef.moves} 步・${badge.subtitleZh}`;

      info.append(numSpan, badgeSpan, starSpan);
      btn.append(img, info);

      if (unlocked) {
        btn.addEventListener('click', () => {
          this.mapModal.classList.add('hidden');
          this.notifyModalChange();
          this.callbacks.onSelectLevel(lv);
        });
      }
      frag.appendChild(btn);
    }
    grid.appendChild(frag);
  }

  public openBadgeModal(): void {
    this.badgeRenderLimit = BADGE_PAGE_SIZE;
    this.badgeSearchQuery = '';
    this.badgeSearchInput.value = '';
    this.inspectedBadgeLevel = null;
    this.badgeDetailBar.classList.add('hidden');
    this.renderSplashtag();
    this.renderBadgeTierTabs();
    this.renderBadgeGrid();
    this.badgeModal.classList.remove('hidden');
    this.notifyModalChange();
  }

  private renderSplashtag(): void {
    const saveData = this.save.getData();
    const slots = document.getElementById('splashtag-slots')!;
    slots.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'splashtag-slot';
      const lv = saveData.equippedBadges[i];
      if (lv) {
        const badge = getBadgeForLevel(lv);
        const img = document.createElement('img');
        img.src = getBadgeImageUrl(badge, false);
        img.alt = badge.nameZh;
        slot.appendChild(img);
      }
      slots.appendChild(slot);
    }
  }

  private renderBadgeTierTabs(): void {
    const container = document.getElementById('badge-tier-tabs')!;
    container.innerHTML = '';
    const earnedCount = this.save.getData().earnedBadges.length;
    const filters: Array<{ key: BadgeTier | 'all' | 'earned'; label: string }> = [
      { key: 'all', label: `全部 ${TOTAL_BADGES}` },
      { key: 'earned', label: `已獲得 (${earnedCount})` },
      { key: 'rookie', label: `入門 (${BADGE_TIER_RANGES.rookie.count})` },
      { key: 'bronze', label: `進階 (${BADGE_TIER_RANGES.bronze.count})` },
      { key: 'silver', label: `精英 (${BADGE_TIER_RANGES.silver.count})` },
      { key: 'gold', label: `純金 (${BADGE_TIER_RANGES.gold.count})` },
      { key: 'holo', label: `全息 (${BADGE_TIER_RANGES.holo.count})` },
      { key: 'mythic', label: `神話 (${BADGE_TIER_RANGES.mythic.count})` },
    ];
    for (const f of filters) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-chip${this.activeBadgeTierFilter === f.key ? ' active' : ''}`;
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        this.activeBadgeTierFilter = f.key;
        this.badgeRenderLimit = BADGE_PAGE_SIZE;
        this.renderBadgeTierTabs();
        this.renderBadgeGrid();
      });
      container.appendChild(btn);
    }
  }

  private renderBadgeDetail(badge: BadgeDef): void {
    const saveData = this.save.getData();
    const earned = saveData.earnedBadges.includes(badge.level);
    const equipped = saveData.equippedBadges.includes(badge.level);
    const unlocked = this.save.isLevelUnlocked(badge.level);
    const meta = BADGE_TIER_META[badge.tier];

    this.badgeDetailBar.classList.remove('hidden');
    this.badgeDetailBar.style.borderColor = meta.colorHex;
    this.badgeDetailBar.innerHTML = '';

    const img = document.createElement('img');
    img.src = getBadgeImageUrl(badge, false);
    img.alt = badge.nameZh;
    if (!earned) img.className = 'badge-locked-img';

    const textWrap = document.createElement('div');
    textWrap.className = 'badge-detail-text';
    textWrap.innerHTML = `<strong>Lv.${badge.level} ${badge.nameZh}</strong><span>${badge.tierLabelZh}・難度 ${badge.difficulty}/100・${badge.subtitleZh}</span>`;

    const actBtn = document.createElement('button');
    actBtn.type = 'button';
    actBtn.className = 'badge-detail-btn';
    if (earned) {
      actBtn.textContent = equipped ? '卸下名牌' : '裝備名牌';
      actBtn.addEventListener('click', () => {
        this.save.toggleEquipBadge(badge.level);
        this.renderSplashtag();
        this.renderBadgeDetail(badge);
        this.renderBadgeGrid();
      });
    } else if (unlocked) {
      actBtn.textContent = `挑戰第 ${badge.level} 關`;
      actBtn.addEventListener('click', () => {
        this.badgeModal.classList.add('hidden');
        this.notifyModalChange();
        this.callbacks.onSelectLevel(badge.level);
      });
    } else {
      actBtn.textContent = `第 ${badge.level} 關`;
      actBtn.disabled = true;
    }

    this.badgeDetailBar.append(img, textWrap, actBtn);
  }

  private renderBadgeGrid(): void {
    const saveData = this.save.getData();
    const earnedSet = new Set(saveData.earnedBadges);
    const equippedSet = new Set(saveData.equippedBadges);

    document.getElementById('badge-progress-sub')!.textContent =
      `已收集 ${saveData.earnedBadges.length.toLocaleString()} / ${TOTAL_BADGES.toLocaleString()} 枚・點擊查看條件或裝備名牌`;

    let list: readonly BadgeDef[] = BADGES;
    if (this.activeBadgeTierFilter === 'earned') {
      list = BADGES.filter((b) => earnedSet.has(b.level));
    } else if (this.activeBadgeTierFilter !== 'all') {
      list = BADGES.filter((b) => b.tier === this.activeBadgeTierFilter);
    }

    const q = this.badgeSearchQuery.toLowerCase();
    if (q.length > 0) {
      const exactNum = parseInt(q, 10);
      list = list.filter(
        (b) =>
          (!Number.isNaN(exactNum) && b.level === exactNum) ||
          b.nameZh.toLowerCase().includes(q) ||
          b.subtitleZh.toLowerCase().includes(q),
      );
    }

    const grid = document.getElementById('badge-grid')!;
    grid.innerHTML = '';

    const visible = list.slice(0, this.badgeRenderLimit);
    const frag = document.createDocumentFragment();

    for (const b of visible) {
      const earned = earnedSet.has(b.level);
      const equipped = equippedSet.has(b.level);
      const meta = BADGE_TIER_META[b.tier];

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `badge-card${earned ? ' earned' : ' locked'}${equipped ? ' equipped' : ''}${this.inspectedBadgeLevel === b.level ? ' selected' : ''}`;
      if (earned) {
        card.style.borderColor = equipped ? '#FFD600' : meta.colorHex;
      }

      const img = document.createElement('img');
      img.src = getBadgeImageUrl(b, false);
      img.alt = b.nameZh;
      img.loading = 'lazy';
      img.decoding = 'async';
      if (!earned) {
        img.className = 'badge-locked-img';
      }

      const lvTag = document.createElement('span');
      lvTag.className = 'badge-card-lv';
      lvTag.style.color = meta.colorHex;
      lvTag.textContent = equipped ? '★ 已裝備' : `Lv.${b.level}・難${b.difficulty}`;

      const name = document.createElement('span');
      name.className = 'badge-card-name';
      name.textContent = b.nameZh;

      card.append(img, lvTag, name);

      card.addEventListener('click', () => {
        this.inspectedBadgeLevel = b.level;
        if (earned) {
          this.save.toggleEquipBadge(b.level);
          this.renderSplashtag();
        }
        this.renderBadgeDetail(b);
        this.renderBadgeGrid();
      });

      frag.appendChild(card);
    }
    grid.appendChild(frag);

    const remaining = list.length - visible.length;
    if (remaining > 0) {
      this.btnBadgeLoadMore.classList.remove('hidden');
      this.btnBadgeLoadMore.textContent = `載入更多徽章（還有 ${remaining.toLocaleString()} 枚）`;
    } else {
      this.btnBadgeLoadMore.classList.add('hidden');
    }
  }
}
