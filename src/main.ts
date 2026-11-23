import './style.css';
import { getLevelDef } from './data/levels';
import { Match3Engine } from './core/Match3Engine';
import { SaveManager } from './core/SaveManager';
import { SoundEngine } from './core/SoundEngine';
import { installDocumentTouchGuard } from './core/TouchGuard';
import { TextureLibrary } from './render/WeaponTextures';
import { BoardScene } from './render/BoardScene';
import { UIManager } from './ui/UIManager';

class SplatCrushApp {
  private readonly save = new SaveManager();
  private readonly sound = new SoundEngine();
  private readonly textures = new TextureLibrary();
  private readonly boardScene: BoardScene;
  private readonly ui: UIManager;

  private engine!: Match3Engine;
  private currentLevelNum: number;
  private isBusy = false;

  constructor() {
    this.sound.setMuted(this.save.getData().muted);

    // Install Layer 3 & 4 global anti-zoom/gesture protection + first-pointerdown audio unlock
    installDocumentTouchGuard(() => {
      this.sound.unlock();
    });

    const container = document.getElementById('canvas-container')!;
    this.boardScene = new BoardScene(container, this.textures, this.sound, {
      onSwapRequested: (r1, c1, r2, c2) => {
        void this.handleSwap(r1, c1, r2, c2);
      },
      onStepVisualComplete: (step) => {
        this.ui.showCalloutForStep(step);
        this.ui.updateHud(this.engine);
      },
    });

    this.ui = new UIManager(this.save, this.textures, {
      onSelectLevel: (lv) => this.loadLevel(lv),
      onRestartLevel: () => this.loadLevel(this.currentLevelNum),
      onRequestHint: () => this.triggerHint(),
      onToggleSound: () => this.toggleSound(),
      onModalStateChange: (anyOpen) => {
        this.boardScene.resetPointerState();
        this.boardScene.setInputLocked(anyOpen || this.isBusy);
      },
    });

    this.currentLevelNum = Math.min(100, this.save.getData().highestUnlockedLevel);
    this.loadLevel(this.currentLevelNum);
    // Title screen starts open so lock canvas input until dismissed
    this.boardScene.setInputLocked(this.ui.isAnyModalOpen());

    // Expose safe debug/testing handle on window for automated Playwright verification
    (window as unknown as { __splatCrush?: SplatCrushApp }).__splatCrush = this;
  }

  public loadLevel(levelNum: number): void {
    this.isBusy = false;
    this.currentLevelNum = Math.max(1, Math.min(100, Math.floor(levelNum)));
    const def = getLevelDef(this.currentLevelNum);
    this.engine = new Match3Engine(def);
    this.boardScene.syncBoardFromEngine(this.engine);
    this.ui.updateHud(this.engine);
    this.boardScene.setInputLocked(this.ui.isAnyModalOpen());
  }

  public getEngine(): Match3Engine {
    return this.engine;
  }

  public async handleSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    if (this.isBusy || this.ui.isAnyModalOpen()) return;
    this.sound.unlock();

    const result = this.engine.trySwap(r1, c1, r2, c2);
    if (!result.valid) {
      this.isBusy = true;
      this.boardScene.setInputLocked(true);
      await this.boardScene.playInvalidSwap(r1, c1, r2, c2);
      this.isBusy = false;
      this.boardScene.setInputLocked(this.ui.isAnyModalOpen());
      return;
    }

    this.isBusy = true;
    await this.boardScene.playMoveResult(result);
    this.ui.updateHud(this.engine);

    // Check win / lose
    if (this.engine.isLevelWon()) {
      const bonusMoves = this.engine.movesLeft;
      if (bonusMoves > 0) {
        this.engine.score += bonusMoves * 120;
        this.ui.updateHud(this.engine);
      }
      const stars = this.engine.getEarnedStars();
      const { isNewBadge } = this.save.recordLevelClear(
        this.currentLevelNum,
        this.engine.score,
        stars,
      );
      this.sound.playVictory();
      this.ui.showResultModal(true, this.currentLevelNum, this.engine.score, stars, isNewBadge);
      this.isBusy = false;
      this.boardScene.setInputLocked(true);
      return;
    }

    if (this.engine.isLevelLost()) {
      this.sound.playDefeat();
      this.ui.showResultModal(false, this.currentLevelNum, this.engine.score, 0, false);
      this.isBusy = false;
      this.boardScene.setInputLocked(true);
      return;
    }

    // Deadlock check & auto-shuffle if no moves remain
    let hint = this.engine.findBestHint();
    if (!hint) {
      this.engine.shufflePlayableTiles();
      this.boardScene.syncBoardFromEngine(this.engine);
      this.ui.showBanner('🔄 墨水重新洗牌！', 'type-combo');
      hint = this.engine.findBestHint();
    }
    this.boardScene.setHintPair(hint);

    this.isBusy = false;
    this.boardScene.setInputLocked(this.ui.isAnyModalOpen());
  }

  private triggerHint(): void {
    if (this.isBusy || this.ui.isAnyModalOpen()) return;
    const hint = this.engine.findBestHint();
    if (hint) {
      this.boardScene.setHintPair(hint);
      // Force immediate hint visibility by announcing
      this.ui.showBanner('💡 試試閃爍的相鄰武器！', 'type-4k');
      // Nudge idle timer via direct hint ring highlight:
      const sceneAny = this.boardScene as unknown as { idleSeconds: number };
      sceneAny.idleSeconds = 10;
    }
  }

  private toggleSound(): void {
    const nextMuted = !this.sound.isMuted();
    this.sound.setMuted(nextMuted);
    this.save.setMuted(nextMuted);
    this.ui.updateSoundIcon(nextMuted);
  }
}

new SplatCrushApp();
