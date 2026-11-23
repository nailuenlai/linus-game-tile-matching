import type { BadgeTier, CascadeStep } from '../types';
import { WEAPONS } from '../data/weapons';
import { BADGES, BADGE_TIER_META, getBadgeForLevel } from '../data/badges';
import { CHAPTERS, LEVELS } from '../data/levels';
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

export class UIManager {
  private readonly save: SaveManager;
  private readonly textures: TextureLibrary;
  private readonly callbacks: UICallbacks;

  private activeChapterId = 1;
  private activeBadgeTierFilter: BadgeTier | 'all' = 'all';
  private currentLevel = 1;
  private calloutTimer: number | null = null;

  // Cached DOM references
  private readonly hudLevelNum = document.getElementById('hud-level-num')!;
  private readonly hudLevelName = document.getElementById('hud-level-name')!;
  private readonly hudBadgeHint = document.getElementById('hud-badge-hint')!;
  private readonly hudMovesBox = document.getElementById('hud-moves-box')!;
  private readonly hudMoves = document.getElementById('hud-moves')!;
  private readonly hudGoals = document.getElementById('hud-goals')!;
  private readonly hudScore = document.getElementById('hud-score')!;
  private readonly hudStars = document.getElementById('hud-stars')!;
  private readonly hudScoreFill = document.getElementById('hud-score-fill')!;
  private readonly dockBadgeCount = document.getElementById('dock-badge-count')!;
  private readonly soundIcon = document.getElementById('sound-icon')!;
  private readonly calloutBanner = document.getElementById('callout-banner')!;

  private readonly titleOverlay = document.getElementById('title-overlay')!;
  private readonly resultModal = document.getElementById('result-modal')!;
  private readonly mapModal = document.getElementById('map-modal')!;
  private readonly badgeModal = document.getElementById('badge-modal')!;

  constructor(save: SaveManager, textures: TextureLibrary, callbacks: UICallbacks) {
    this.save = save;
    this.textures = textures;
    this.callbacks = callbacks;

    this.populateTitleShowcase();
    this.bindHudButtons();
    this.bindModalButtons();
    this.updateSoundIcon(save.getData().muted);
    this.updateBadgeCounter();
  }

  private populateTitleShowcase(): void {
    const showcase = document.getElementById('title-weapon-showcase')!;
    showcase.innerHTML = '';
    for (const w of WEAPONS) {
      const div = document.createElement('div');
      div.className = 'weapon-mini';
      const img = document.createElement('img');
      img.src = this.textures.getWeaponDataUrl(w.id);
      img.alt = w.nameZh;
      const span = document.createElement('span');
      span.textContent = w.shortZh;
      div.append(img, span);
      showcase.appendChild(div);
    }

    (document.getElementById('rule-img-4k') as HTMLImageElement).src =
      this.textures.specialBadgeUrls.eliter4k;
    (document.getElementById('rule-img-bomb') as HTMLImageElement).src =
      this.textures.specialBadgeUrls.splatbomb;
  }

  private bindHudButtons(): void {
    // Real-time HUD buttons use instant pointerdown + touch prevention per mobile guide
    bindInstantTouchElement(document.getElementById('btn-level-pill')!, () => this.openMapModal());
    bindInstantTouchElement(document.getElementById('btn-map')!, () => this.openMapModal());
    bindInstantTouchElement(document.getElementById('btn-badges')!, () => this.openBadgeModal());
    bindInstantTouchElement(document.getElementById('btn-hint')!, () => this.callbacks.onRequestHint());
    bindInstantTouchElement(document.getElementById('btn-restart')!, () => this.callbacks.onRestartLevel());
    bindInstantTouchElement(document.getElementById('btn-sound')!, () => this.callbacks.onToggleSound());
  }

  private bindModalButtons(): void {
    // Menu / modal buttons keep standard click so they work cleanly across touch & mouse
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
      const nextLv = Math.min(100, this.currentLevel + 1);
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

    this.hudLevelNum.textContent = `LV.${lv.level}`;
    this.hudLevelName.textContent = lv.nameZh;
    this.hudBadgeHint.textContent = `通關徽章：${badge.nameZh}（${badge.tierLabelZh}）`;

    this.hudMoves.textContent = String(engine.movesLeft);
    this.hudMovesBox.classList.toggle('low-moves', engine.movesLeft <= 5);

    this.hudScore.textContent = engine.score.toLocaleString();
    const earnedStars = engine.getEarnedStars();
    this.hudStars.textContent = '★'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars);
    const pct = Math.min(100, (engine.score / lv.starScores[2]) * 100);
    this.hudScoreFill.style.width = `${pct}%`;

    // Render goals
    const goals = engine.getGoalProgress();
    this.hudGoals.innerHTML = '';
    for (const gp of goals) {
      const chip = document.createElement('div');
      chip.className = `goal-chip${gp.completed ? ' done' : ''}`;
      if (gp.goal.type === 'weapon' && gp.goal.weaponId !== undefined) {
        const img = document.createElement('img');
        img.src = this.textures.getWeaponDataUrl(gp.goal.weaponId);
        img.alt = WEAPONS[gp.goal.weaponId].shortZh;
        chip.appendChild(img);
        const txt = document.createElement('span');
        txt.textContent = gp.completed ? '✓' : `${gp.current}/${gp.goal.target}`;
        chip.appendChild(txt);
      } else if (gp.goal.type === 'score') {
        chip.textContent = gp.completed
          ? `🎯 分數 ✓`
          : `🎯 ${gp.current.toLocaleString()}/${gp.goal.target.toLocaleString()}`;
      } else if (gp.goal.type === 'turf') {
        chip.textContent = gp.completed
          ? `🎨 塗地 ✓`
          : `🎨 塗地 ${gp.current}/${gp.goal.target}`;
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
      text = '⚡ 4K狙擊 × 斯普拉炸彈 十字爆破！';
      cssType = 'type-combo';
    } else if (hasFull4K) {
      text = '🎯 4K 狙擊槍・全列貫穿！';
      cssType = 'type-4k';
    } else if (hasFullBomb) {
      text = '💣 斯普拉炸彈・全行爆破！';
      cssType = 'type-bomb';
    } else if (step.comboIndex >= 2) {
      text = `🔥 連鎖 COMBO x${step.comboIndex}！`;
      cssType = 'type-combo';
    } else if (hasV4K && hasHBomb) {
      text = '🎯 4K 狙擊 + 💣 斯普拉炸彈！';
      cssType = 'type-combo';
    } else if (hasV4K) {
      text = '🎯 4K 狙擊槍！';
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
      tag.textContent = level === 100 ? 'ALL 100 STAGES CLEAR!!' : 'STAGE CLEAR!';
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
      tierPill.textContent = `${badge.tierLabelZh}・Lv.${badge.level}`;
      tierPill.style.color = tierMeta.colorHex;

      (document.getElementById('result-badge-img') as HTMLImageElement).src =
        getBadgeImageUrl(badge, false);
      document.getElementById('result-badge-name')!.textContent = badge.nameZh;
      document.getElementById('result-badge-sub')!.textContent = badge.subtitleZh;

      if (level < 100) {
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
    this.activeChapterId = Math.floor((this.currentLevel - 1) / 10) + 1;
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
      btn.textContent = `Ch.${ch.id} ${ch.nameZh}`;
      btn.addEventListener('click', () => {
        this.activeChapterId = ch.id;
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
    document.getElementById('map-progress-sub')!.textContent =
      `已通關 ${cleared} / 100 關・⭐ ${totalStars} / 300`;

    const ch = CHAPTERS[this.activeChapterId - 1];
    const banner = document.getElementById('chapter-banner')!;
    banner.style.borderLeftColor = ch.themeHex;
    banner.innerHTML = `<strong>第 ${ch.id} 章：${ch.nameZh} (${ch.subtitleZh})</strong><span>Lv.${ch.startLevel} – Lv.${ch.endLevel}</span>`;

    const grid = document.getElementById('level-grid')!;
    grid.innerHTML = '';

    for (let lv = ch.startLevel; lv <= ch.endLevel; lv++) {
      const levelDef = LEVELS[lv - 1];
      const badge = getBadgeForLevel(lv);
      const unlocked = this.save.isLevelUnlocked(lv);
      const earned = saveData.earnedBadges.includes(lv);
      const stars = saveData.levelStars[lv] ?? 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-cell-btn${lv === this.currentLevel ? ' current' : ''}${unlocked ? '' : ' locked'}`;
      btn.disabled = !unlocked;

      const img = document.createElement('img');
      img.src = getBadgeImageUrl(badge, !earned && !unlocked);
      img.alt = badge.nameZh;

      const info = document.createElement('span');
      info.className = 'level-cell-info';
      const numSpan = document.createElement('span');
      numSpan.className = 'level-cell-num';
      numSpan.textContent = `第 ${lv} 關${unlocked ? '' : ' 🔒'}`;
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'level-cell-badge';
      badgeSpan.textContent = `${badge.tierLabelZh}・${badge.nameZh}`;
      const starSpan = document.createElement('span');
      starSpan.className = 'level-cell-stars';
      starSpan.textContent = earned ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : `${levelDef.moves} 步`;

      info.append(numSpan, badgeSpan, starSpan);
      btn.append(img, info);

      if (unlocked) {
        btn.addEventListener('click', () => {
          this.mapModal.classList.add('hidden');
          this.notifyModalChange();
          this.callbacks.onSelectLevel(lv);
        });
      }
      grid.appendChild(btn);
    }
  }

  public openBadgeModal(): void {
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
    const filters: Array<{ key: BadgeTier | 'all'; label: string }> = [
      { key: 'all', label: '全部 100' },
      { key: 'rookie', label: '菜鳥 (1-15)' },
      { key: 'bronze', label: '銅級 (16-35)' },
      { key: 'silver', label: '銀級 (36-55)' },
      { key: 'gold', label: '純金 (56-75)' },
      { key: 'holo', label: '全息 (76-90)' },
      { key: 'mythic', label: '神話 (91-100)' },
    ];
    for (const f of filters) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab-chip${this.activeBadgeTierFilter === f.key ? ' active' : ''}`;
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        this.activeBadgeTierFilter = f.key;
        this.renderBadgeTierTabs();
        this.renderBadgeGrid();
      });
      container.appendChild(btn);
    }
  }

  private renderBadgeGrid(): void {
    const saveData = this.save.getData();
    document.getElementById('badge-progress-sub')!.textContent =
      `已收集 ${saveData.earnedBadges.length} / 100 枚・點擊已解鎖徽章裝備至名牌`;

    const grid = document.getElementById('badge-grid')!;
    grid.innerHTML = '';

    const list =
      this.activeBadgeTierFilter === 'all'
        ? BADGES
        : BADGES.filter((b) => b.tier === this.activeBadgeTierFilter);

    for (const b of list) {
      const earned = saveData.earnedBadges.includes(b.level);
      const equipped = saveData.equippedBadges.includes(b.level);
      const meta = BADGE_TIER_META[b.tier];

      const card = document.createElement('button');
      card.type = 'button';
      card.className = `badge-card${earned ? ' earned' : ' locked'}${equipped ? ' equipped' : ''}`;
      if (earned) {
        card.style.borderColor = equipped ? '#FFD600' : meta.colorHex;
      }

      const img = document.createElement('img');
      img.src = getBadgeImageUrl(b, !earned);
      img.alt = earned ? b.nameZh : `第 ${b.level} 關徽章`;

      const lvTag = document.createElement('span');
      lvTag.className = 'badge-card-lv';
      lvTag.style.color = meta.colorHex;
      lvTag.textContent = equipped ? `★ 已裝備` : `Lv.${b.level} ${b.tierLabelZh}`;

      const name = document.createElement('span');
      name.className = 'badge-card-name';
      name.textContent = earned ? b.nameZh : '？？？';

      card.append(img, lvTag, name);

      if (earned) {
        card.addEventListener('click', () => {
          this.save.toggleEquipBadge(b.level);
          this.renderSplashtag();
          this.renderBadgeGrid();
        });
      }
      grid.appendChild(card);
    }
  }
}
