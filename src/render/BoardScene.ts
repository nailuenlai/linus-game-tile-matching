import * as THREE from 'three';
import type {
  BlockerType,
  CascadeStep,
  ClearEffectEvent,
  MoveResult,
  SpecialType,
  WeaponId,
} from '../types';
import { Match3Engine } from '../core/Match3Engine';
import { getWeapon } from '../data/weapons';
import { getChapterForLevel } from '../data/levels';
import { TURF_COLORS } from '../data/theme';
import { TextureLibrary } from './WeaponTextures';
import { SoundEngine } from '../core/SoundEngine';

interface VisualTile {
  uid: number;
  weaponId: WeaponId;
  special: SpecialType;
  row: number;
  col: number;
  group: THREE.Group;
  faceMat: THREE.MeshBasicMaterial;
  bodyMat: THREE.MeshStandardMaterial;
  specialBadgeMesh: THREE.Object3D | null;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetScale: number;
  velY: number;
  bobPhase: number;
}

interface PooledParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  life: number;
  vx: number;
  vy: number;
  vz: number;
  startScale: number;
}

interface ActiveFx {
  group: THREE.Group;
  age: number;
  duration: number;
  update: (t: number, dt: number) => void;
  cleanup: () => void;
}

interface TurfVisual {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  slotMesh: THREE.Mesh;
  borderMesh: THREE.Mesh | null;
  painted: boolean;
  popScale: number;
}

const CELL_STEP = 1.08;

export interface BoardSceneCallbacks {
  onSwapRequested: (r1: number, c1: number, r2: number, c2: number) => void;
  onStepVisualComplete?: (step: CascadeStep) => void;
}

export class BoardScene {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly textures: TextureLibrary;
  private readonly sound: SoundEngine;
  private readonly callbacks: BoardSceneCallbacks;

  private readonly boardRoot = new THREE.Group();
  private readonly slotsGroup = new THREE.Group();
  private readonly tilesGroup = new THREE.Group();
  private readonly blockersGroup = new THREE.Group();
  private readonly fxGroup = new THREE.Group();

  // Shared geometries (allocated once, reused everywhere for Safari GC safety)
  private readonly slotGeo = new THREE.BoxGeometry(0.98, 0.98, 0.14);
  private readonly turfSlotGeo = new THREE.BoxGeometry(1.04, 1.04, 0.16);
  private readonly turfGeo = new THREE.PlaneGeometry(1.04, 1.04);
  private readonly tileBodyGeo = new THREE.CylinderGeometry(0.41, 0.435, 0.18, 24);
  private readonly tileFaceGeo = new THREE.PlaneGeometry(0.85, 0.85);
  private readonly crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.34);
  private readonly oozeGeo = new THREE.PlaneGeometry(0.98, 0.98);
  private readonly selectRingGeo = new THREE.RingGeometry(0.44, 0.54, 32);
  private readonly hintRingGeo = new THREE.RingGeometry(0.42, 0.52, 32);
  private readonly particleGeo = new THREE.SphereGeometry(0.11, 8, 8);
  private readonly bombTetraGeo = new THREE.TetrahedronGeometry(0.32, 0);
  private readonly beamCylGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 14, 1, true);
  private readonly shockRingGeo = new THREE.RingGeometry(0.18, 0.42, 28);

  // Shared materials
  private readonly slotMatA = new THREE.MeshStandardMaterial({
    color: 0x1b2234,
    roughness: 0.75,
    metalness: 0.1,
  });
  private readonly slotMatB = new THREE.MeshStandardMaterial({
    color: 0x222b40,
    roughness: 0.75,
    metalness: 0.1,
  });
  private readonly turfUnpaintedSlotMat = new THREE.MeshStandardMaterial({
    color: TURF_COLORS.unpaintedSlotInt,
    emissive: TURF_COLORS.unpaintedEmissiveInt,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    metalness: 0.08,
  });
  private readonly turfPaintedSlotMat = new THREE.MeshStandardMaterial({
    color: TURF_COLORS.paintedSlotInt,
    emissive: TURF_COLORS.paintedEmissiveInt,
    emissiveIntensity: 0.45,
    roughness: 0.32,
    metalness: 0.1,
  });
  private readonly turfGoalBorderMat: THREE.MeshBasicMaterial;
  private readonly selectRingMat = new THREE.MeshBasicMaterial({
    color: 0xffe45e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  private readonly hintRingMat = new THREE.MeshBasicMaterial({
    color: 0x38f9d7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
  });

  private readonly selectRing: THREE.Mesh;
  private readonly hintRingA: THREE.Mesh;
  private readonly hintRingB: THREE.Mesh;

  // Dynamic level state mirrors
  private rows = 8;
  private cols = 8;
  private visualTiles = new Map<number, VisualTile>();
  private turfMeshes = new Map<string, TurfVisual>();
  private blockerMeshes = new Map<string, THREE.Mesh>();
  private slotMeshes: THREE.Mesh[] = [];
  private boardFrameMesh: THREE.Mesh | null = null;

  // Pooled ink particles & active weapon FX
  private particles: PooledParticle[] = [];
  private activeFx: ActiveFx[] = [];

  // Reusable math scratch objects (zero per-frame allocations)
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly hitPoint = new THREE.Vector3();

  // Camera shake & animation loop state
  private baseCamPos = new THREE.Vector3(0, -0.45, 11.5);
  private shakeTime = 0;
  private shakeIntensity = 0;
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private paused = false;
  private contextLost = false;
  private inputLocked = false;
  private resizeObserver: ResizeObserver;

  // Selection, Hint & Layer 4 Pointer tracking
  private selectedCell: { row: number; col: number } | null = null;
  private hintPair: [{ row: number; col: number }, { row: number; col: number }] | null = null;
  private idleSeconds = 0;
  private activePointerId: number | null = null;
  private dragStartCell: { row: number; col: number } | null = null;
  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragSwapped = false;

  // Ambient floating ink background blobs
  private bgBlobs: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number; speed: number; phase: number }> = [];
  private accentLight: THREE.PointLight;

  constructor(
    container: HTMLElement,
    textures: TextureLibrary,
    sound: SoundEngine,
    callbacks: BoardSceneCallbacks,
  ) {
    this.container = container;
    this.textures = textures;
    this.sound = sound;
    this.callbacks = callbacks;

    this.turfGoalBorderMat = new THREE.MeshBasicMaterial({
      map: this.textures.turfUnpaintedBorderTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111524);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Obey mobile thermal DPR cap <= 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.id = 'game-canvas';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Crisp 3-point Splatoon lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
    dirLight.position.set(4, 7, 10);
    this.scene.add(dirLight);

    this.accentLight = new THREE.PointLight(0xffd600, 1.8, 24);
    this.accentLight.position.set(-5, 4, 6);
    this.scene.add(this.accentLight);

    // Rotate tile body cylinder once so flat face faces camera (+Z)
    this.tileBodyGeo.rotateX(Math.PI / 2);

    this.boardRoot.add(this.slotsGroup, this.tilesGroup, this.blockersGroup, this.fxGroup);
    this.scene.add(this.boardRoot);

    // Selection & hint rings
    this.selectRing = new THREE.Mesh(this.selectRingGeo, this.selectRingMat);
    this.selectRing.position.z = 0.24;
    this.selectRing.visible = false;
    this.boardRoot.add(this.selectRing);

    this.hintRingA = new THREE.Mesh(this.hintRingGeo, this.hintRingMat);
    this.hintRingA.position.z = 0.23;
    this.hintRingA.visible = false;
    this.hintRingB = new THREE.Mesh(this.hintRingGeo, this.hintRingMat);
    this.hintRingB.position.z = 0.23;
    this.hintRingB.visible = false;
    this.boardRoot.add(this.hintRingA, this.hintRingB);

    this.initParticlePool();
    this.initAmbientInkBackground();
    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();
    this.startLoop();
  }

  private initParticlePool(): void {
    for (let i = 0; i < 120; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.visible = false;
      this.fxGroup.add(mesh);
      this.particles.push({
        mesh,
        mat,
        active: false,
        age: 0,
        life: 0.5,
        vx: 0,
        vy: 0,
        vz: 0,
        startScale: 1,
      });
    }
  }

  private initAmbientInkBackground(): void {
    const colors = [0xffd600, 0xff1f8f, 0x00d4ff, 0x66e800, 0x9b4dff, 0xff6200];
    const geo = new THREE.PlaneGeometry(3.2, 3.2);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: this.textures.inkSplatTexture,
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.085,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const bx = (Math.random() - 0.5) * 14;
      const by = (Math.random() - 0.5) * 14;
      mesh.position.set(bx, by, -2.8 - (i % 3) * 0.4);
      mesh.rotation.z = Math.random() * Math.PI * 2;
      const s = 0.7 + Math.random() * 1.1;
      mesh.scale.set(s, s, 1);
      this.scene.add(mesh);
      this.bgBlobs.push({
        mesh,
        baseX: bx,
        baseY: by,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    const stopTouch = (e: Event): void => e.preventDefault();
    canvas.addEventListener('touchstart', stopTouch, { passive: false });
    canvas.addEventListener('touchend', stopTouch, { passive: false });
    canvas.addEventListener('dblclick', stopTouch, { passive: false });

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('lostpointercapture', this.onPointerCancel);

    window.addEventListener('blur', this.resetPointerState);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  private onVisibilityChange = (): void => {
    this.paused = document.hidden;
    this.resetPointerState();
    if (!this.paused) {
      this.lastTime = performance.now();
    }
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    this.lastTime = performance.now();
  };

  public resetPointerState = (): void => {
    this.activePointerId = null;
    this.dragStartCell = null;
    this.dragSwapped = false;
  };

  public setInputLocked(locked: boolean): void {
    this.inputLocked = locked;
    if (locked) {
      this.resetPointerState();
      this.clearSelection();
    }
  }

  public setHintPair(pair: [{ row: number; col: number }, { row: number; col: number }] | null): void {
    this.hintPair = pair;
    this.idleSeconds = 0;
    this.hintRingA.visible = false;
    this.hintRingB.visible = false;
  }

  public clearSelection(): void {
    this.selectedCell = null;
    this.selectRing.visible = false;
  }

  private cellToWorld(row: number, col: number): { x: number; y: number } {
    const x = (col - (this.cols - 1) / 2) * CELL_STEP;
    const y = ((this.rows - 1) / 2 - row) * CELL_STEP;
    return { x, y };
  }

  private clientToCell(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.hitPlane, this.hitPoint)) return null;

    const col = Math.round(this.hitPoint.x / CELL_STEP + (this.cols - 1) / 2);
    const row = Math.round((this.rows - 1) / 2 - this.hitPoint.y / CELL_STEP);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return { row, col };
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.stopPropagation();
    if (this.inputLocked || this.activePointerId !== null) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const cell = this.clientToCell(e.clientX, e.clientY);
    if (!cell) {
      this.clearSelection();
      return;
    }

    this.idleSeconds = 0;
    this.hintRingA.visible = false;
    this.hintRingB.visible = false;

    this.activePointerId = e.pointerId;
    this.dragStartCell = cell;
    this.dragStartClientX = e.clientX;
    this.dragStartClientY = e.clientY;
    this.dragSwapped = false;

    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback on synthetic events
    }

    // Tap-to-swap if adjacent to already selected tile
    if (this.selectedCell) {
      const dr = Math.abs(this.selectedCell.row - cell.row);
      const dc = Math.abs(this.selectedCell.col - cell.col);
      if (dr + dc === 1) {
        const prev = this.selectedCell;
        this.clearSelection();
        this.dragSwapped = true;
        this.callbacks.onSwapRequested(prev.row, prev.col, cell.row, cell.col);
        return;
      }
      if (dr === 0 && dc === 0) {
        this.clearSelection();
        return;
      }
    }

    this.selectedCell = cell;
    const pos = this.cellToWorld(cell.row, cell.col);
    this.selectRing.position.set(pos.x, pos.y, 0.24);
    this.selectRing.visible = true;
    this.sound.playSelect();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (
      this.inputLocked ||
      this.activePointerId !== e.pointerId ||
      !this.dragStartCell ||
      this.dragSwapped
    ) {
      return;
    }

    const dx = e.clientX - this.dragStartClientX;
    const dy = e.clientY - this.dragStartClientY;
    const threshold = Math.max(18, Math.min(34, this.container.clientWidth / (this.cols * 2.6)));
    if (Math.hypot(dx, dy) < threshold) return;

    let targetRow = this.dragStartCell.row;
    let targetCol = this.dragStartCell.col;
    if (Math.abs(dx) >= Math.abs(dy)) {
      targetCol += dx > 0 ? 1 : -1;
    } else {
      targetRow += dy > 0 ? 1 : -1;
    }

    this.dragSwapped = true;
    this.clearSelection();

    if (targetRow >= 0 && targetRow < this.rows && targetCol >= 0 && targetCol < this.cols) {
      this.callbacks.onSwapRequested(
        this.dragStartCell.row,
        this.dragStartCell.col,
        targetRow,
        targetCol,
      );
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    try {
      if (this.renderer.domElement.hasPointerCapture(e.pointerId)) {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    this.resetPointerState();
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) return;
    this.resetPointerState();
  };

  public handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitCameraToBoard();
  }

  private fitCameraToBoard(): void {
    const boardW = this.cols * CELL_STEP + 1.15;
    const boardH = this.rows * CELL_STEP + 1.35;
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.max(0.45, this.camera.aspect);

    // Reserve clean visual breathing room for top HUD and bottom dock on mobile portrait
    const isPortrait = aspect < 0.85;
    const verticalFill = isPortrait ? 0.68 : 0.78;
    const horizontalFill = isPortrait ? 0.92 : 0.84;

    const distH = boardH / (2 * Math.tan(fovRad / 2) * verticalFill);
    const distW = boardW / (2 * Math.tan(fovRad / 2) * aspect * horizontalFill);
    const dist = Math.max(distH, distW, 9.2);

    // Slight vertical offset on mobile so board centers cleanly between top HUD and bottom bar
    const yOffset = isPortrait ? 0.25 : 0.1;
    this.baseCamPos.set(0, -0.35 + yOffset, dist);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(0, yOffset, 0);
  }

  public syncBoardFromEngine(engine: Match3Engine): void {
    this.clearLevelVisuals();
    this.rows = engine.rows;
    this.cols = engine.cols;

    const chapter = getChapterForLevel(engine.levelDef.level);
    this.scene.background = new THREE.Color(chapter.bgBottomHex);
    this.accentLight.color.set(chapter.themeHex);

    // Stylized Splatoon dark slate board frame behind playable grid
    const frameW = this.cols * CELL_STEP + 0.55;
    const frameH = this.rows * CELL_STEP + 0.55;
    const frameGeo = new THREE.BoxGeometry(frameW, frameH, 0.22);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f1524,
      roughness: 0.65,
      metalness: 0.25,
    });
    this.boardFrameMesh = new THREE.Mesh(frameGeo, frameMat);
    this.boardFrameMesh.position.set(0, 0, -0.22);
    this.slotsGroup.add(this.boardFrameMesh);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = engine.grid[r][c];
        if (!cell.playable) continue;

        const { x, y } = this.cellToWorld(r, c);
        const slotMesh = cell.needsTurf
          ? new THREE.Mesh(
              this.turfSlotGeo,
              cell.turfPainted ? this.turfPaintedSlotMat : this.turfUnpaintedSlotMat,
            )
          : new THREE.Mesh(
              this.slotGeo,
              (r + c) % 2 === 0 ? this.slotMatA : this.slotMatB,
            );
        slotMesh.position.set(x, y, cell.needsTurf ? -0.08 : -0.09);
        this.slotsGroup.add(slotMesh);
        this.slotMeshes.push(slotMesh);

        if (cell.needsTurf) {
          const mat = new THREE.MeshBasicMaterial({
            map: cell.turfPainted
              ? this.textures.turfPaintedTexture
              : this.textures.turfUnpaintedTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            depthWrite: false,
          });
          const turfMesh = new THREE.Mesh(this.turfGeo, mat);
          turfMesh.position.set(x, y, 0.004);
          this.slotsGroup.add(turfMesh);

          // Gently pulsing crisp white frame on unpainted turf cells (removed once painted)
          let borderMesh: THREE.Mesh | null = null;
          if (!cell.turfPainted) {
            borderMesh = new THREE.Mesh(this.turfGeo, this.turfGoalBorderMat);
            borderMesh.position.set(x, y, 0.008);
            this.slotsGroup.add(borderMesh);
          }

          this.turfMeshes.set(`${r},${c}`, {
            mesh: turfMesh,
            mat,
            slotMesh,
            borderMesh,
            painted: cell.turfPainted,
            popScale: 1,
          });
        }

        if (cell.blocker !== 'none') {
          this.spawnBlockerVisual(r, c, cell.blocker);
        }

        if (cell.tile) {
          this.createVisualTile(
            cell.tile.uid,
            cell.tile.weaponId,
            cell.tile.special,
            r,
            c,
            r - 2.2, // Gentle entrance drop!
          );
        }
      }
    }

    this.fitCameraToBoard();
    this.clearSelection();
    this.setHintPair(engine.findBestHint());
  }

  public getTurfVisualState(): { total: number; painted: number; unpaintedBorders: number } {
    let painted = 0;
    let unpaintedBorders = 0;
    for (const tm of this.turfMeshes.values()) {
      if (tm.painted) painted++;
      if (tm.borderMesh !== null) unpaintedBorders++;
    }
    return {
      total: this.turfMeshes.size,
      painted,
      unpaintedBorders,
    };
  }

  private clearLevelVisuals(): void {
    for (const vt of this.visualTiles.values()) {
      this.tilesGroup.remove(vt.group);
      vt.faceMat.dispose();
      vt.bodyMat.dispose();
    }
    this.visualTiles.clear();

    for (const tm of this.turfMeshes.values()) {
      this.slotsGroup.remove(tm.mesh);
      if (tm.borderMesh) {
        this.slotsGroup.remove(tm.borderMesh);
      }
      tm.mat.dispose();
    }
    this.turfMeshes.clear();

    for (const bm of this.blockerMeshes.values()) {
      this.blockersGroup.remove(bm);
      (bm.material as THREE.Material).dispose();
    }
    this.blockerMeshes.clear();

    while (this.slotsGroup.children.length > 0) {
      const child = this.slotsGroup.children[0];
      this.slotsGroup.remove(child);
    }
    if (this.boardFrameMesh) {
      this.boardFrameMesh.geometry.dispose();
      (this.boardFrameMesh.material as THREE.Material).dispose();
      this.boardFrameMesh = null;
    }
    this.slotMeshes = [];

    for (const fx of this.activeFx) {
      this.fxGroup.remove(fx.group);
      fx.cleanup();
    }
    this.activeFx = [];
  }

  private createVisualTile(
    uid: number,
    weaponId: WeaponId,
    special: SpecialType,
    row: number,
    col: number,
    startRow = row,
  ): VisualTile {
    const weapon = getWeapon(weaponId);
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: special === 'booyah' ? 0xffffff : weapon.colorInt,
      roughness: 0.28,
      metalness: special !== 'none' ? 0.35 : 0.12,
      emissive: special !== 'none' ? weapon.colorInt : 0x000000,
      emissiveIntensity: special !== 'none' ? 0.32 : 0,
    });
    const bodyMesh = new THREE.Mesh(this.tileBodyGeo, bodyMat);
    group.add(bodyMesh);

    const faceMat = new THREE.MeshBasicMaterial({
      map: this.textures.getTileTexture(weaponId, special),
      transparent: true,
    });
    const faceMesh = new THREE.Mesh(this.tileFaceGeo, faceMat);
    faceMesh.position.z = 0.11;
    group.add(faceMesh);

    let specialBadgeMesh: THREE.Object3D | null = null;
    if (special === 'splatbomb') {
      // Tiny spinning 3D tetrahedral Splat Bomb crest on corner of special tile!
      const bombMat = new THREE.MeshStandardMaterial({
        color: 0xff3d00,
        emissive: 0xff1744,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      });
      const bomb = new THREE.Mesh(this.bombTetraGeo, bombMat);
      bomb.scale.setScalar(0.45);
      bomb.position.set(0.32, 0.32, 0.24);
      group.add(bomb);
      specialBadgeMesh = bomb;
    } else if (special === 'eliter4k') {
      // Tiny pulsing neon cyan reticle ring accent!
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(this.selectRingGeo, ringMat);
      ring.position.z = 0.16;
      ring.scale.setScalar(0.95);
      group.add(ring);
      specialBadgeMesh = ring;
    } else if (special === 'booyah') {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffe45e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(this.selectRingGeo, ringMat);
      ring.position.z = 0.16;
      group.add(ring);
      specialBadgeMesh = ring;
    }

    const startPos = this.cellToWorld(startRow, col);
    const targetPos = this.cellToWorld(row, col);
    group.position.set(startPos.x, startPos.y, 0.08);
    this.tilesGroup.add(group);

    const vt: VisualTile = {
      uid,
      weaponId,
      special,
      row,
      col,
      group,
      faceMat,
      bodyMat,
      specialBadgeMesh,
      targetX: targetPos.x,
      targetY: targetPos.y,
      targetZ: 0.08,
      targetScale: 1,
      velY: 0,
      bobPhase: Math.random() * Math.PI * 2,
    };
    this.visualTiles.set(uid, vt);
    return vt;
  }

  private spawnBlockerVisual(row: number, col: number, blocker: BlockerType): void {
    const key = `${row},${col}`;
    const existing = this.blockerMeshes.get(key);
    if (existing) {
      this.blockersGroup.remove(existing);
      (existing.material as THREE.Material).dispose();
      this.blockerMeshes.delete(key);
    }
    if (blocker === 'none') return;

    const tex = this.textures.getBlockerTexture(blocker);
    if (!tex) return;
    const { x, y } = this.cellToWorld(row, col);

    if (blocker === 'ooze') {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.96,
      });
      const mesh = new THREE.Mesh(this.oozeGeo, mat);
      mesh.position.set(x, y, 0.25);
      this.blockersGroup.add(mesh);
      this.blockerMeshes.set(key, mesh);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: blocker === 'crate2' ? 0.45 : 0.08,
      });
      const mesh = new THREE.Mesh(this.crateGeo, mat);
      mesh.position.set(x, y, 0.1);
      this.blockersGroup.add(mesh);
      this.blockerMeshes.set(key, mesh);
    }
  }

  public async playInvalidSwap(r1: number, c1: number, r2: number, c2: number): Promise<void> {
    this.sound.playInvalidSwap();
    const vtA = this.findVisualAt(r1, c1);
    const vtB = this.findVisualAt(r2, c2);
    if (!vtA || !vtB) return;

    const pA = this.cellToWorld(r1, c1);
    const pB = this.cellToWorld(r2, c2);
    vtA.targetX = (pA.x + pB.x) * 0.5;
    vtA.targetY = (pA.y + pB.y) * 0.5;
    vtB.targetX = (pA.x + pB.x) * 0.5;
    vtB.targetY = (pA.y + pB.y) * 0.5;
    await this.wait(110);
    vtA.targetX = pA.x;
    vtA.targetY = pA.y;
    vtB.targetX = pB.x;
    vtB.targetY = pB.y;
    await this.wait(120);
  }

  public async playMoveResult(result: MoveResult): Promise<void> {
    this.setInputLocked(true);

    // 1. Animate the initial swap smoothly
    const [{ row: r1, col: c1 }, { row: r2, col: c2 }] = result.swapped;
    const vtA = this.findVisualAt(r1, c1);
    const vtB = this.findVisualAt(r2, c2);
    const pos1 = this.cellToWorld(r1, c1);
    const pos2 = this.cellToWorld(r2, c2);

    if (vtA) {
      vtA.row = r2;
      vtA.col = c2;
      vtA.targetX = pos2.x;
      vtA.targetY = pos2.y;
    }
    if (vtB) {
      vtB.row = r1;
      vtB.col = c1;
      vtB.targetX = pos1.x;
      vtB.targetY = pos1.y;
    }
    await this.wait(145);

    // 2. Play each cascade step in sequence with full 4K Sniper & Splat Bomb FX!
    for (const step of result.steps) {
      // Launch 4K Sniper beams & Splat Bomb detonations
      let played4k = false;
      let playedBomb = false;
      let playedBooyah = false;

      for (const eff of step.effects) {
        if (eff.kind === 'vertical4k' || eff.kind === 'fullColumn4k') {
          this.spawnEliter4KBeamFx(eff);
          if (!played4k) {
            this.sound.playEliter4K(eff.kind === 'fullColumn4k', step.comboIndex);
            played4k = true;
          }
        } else if (eff.kind === 'horizontalBomb' || eff.kind === 'fullRowBomb') {
          this.spawnSplatBombFx(eff);
          if (!playedBomb) {
            this.sound.playSplatBomb(eff.kind === 'fullRowBomb', step.comboIndex);
            playedBomb = true;
          }
        } else if (eff.kind === 'crossCombo') {
          this.spawnEliter4KBeamFx({ ...eff, kind: 'fullColumn4k' });
          this.spawnSplatBombFx({ ...eff, kind: 'fullRowBomb' });
          this.sound.playEliter4K(true, step.comboIndex);
          this.sound.playSplatBomb(true, step.comboIndex);
          played4k = true;
          playedBomb = true;
        } else if (eff.kind === 'booyah') {
          this.spawnBooyahFx(eff);
          if (!playedBooyah) {
            this.sound.playBooyah();
            playedBooyah = true;
          }
        }
      }

      // Brief wind-up so player sees the 4K sniper laser / Splat Bomb flash right on the tiles!
      await this.wait(115);

      // Pop cleared tiles into colorful ink bursts
      for (const ct of step.clearedTiles) {
        const vt = this.visualTiles.get(ct.uid);
        const pos = this.cellToWorld(ct.row, ct.col);
        const wColor = getWeapon(ct.weaponId).colorInt;
        this.emitInkParticles(pos.x, pos.y, wColor, 8);
        if (vt) {
          this.tilesGroup.remove(vt.group);
          vt.faceMat.dispose();
          vt.bodyMat.dispose();
          this.visualTiles.delete(ct.uid);
        }
      }

      // Update painted turf cells with unmistakable blazing emerald ink + celebratory pop
      for (const tp of step.turfPainted) {
        const tm = this.turfMeshes.get(`${tp.row},${tp.col}`);
        if (tm && !tm.painted) {
          tm.painted = true;
          tm.mat.map = this.textures.turfPaintedTexture;
          tm.mat.color.setHex(0xffffff);
          tm.mat.opacity = 1;
          tm.mat.needsUpdate = true;
          tm.slotMesh.material = this.turfPaintedSlotMat;
          if (tm.borderMesh) {
            this.slotsGroup.remove(tm.borderMesh);
            tm.borderMesh = null;
          }
          tm.popScale = 1.18;
          tm.mesh.scale.setScalar(tm.popScale);
          const pos = this.cellToWorld(tp.row, tp.col);
          this.emitInkParticles(pos.x, pos.y, TURF_COLORS.paintedParticleInt, 7);
        }
      }

      // Update damaged/destroyed blockers
      for (const bh of step.blockerHits) {
        const pos = this.cellToWorld(bh.row, bh.col);
        this.emitInkParticles(pos.x, pos.y, bh.prev === 'ooze' ? 0x9333ea : 0xfacc15, 7);
        this.spawnBlockerVisual(bh.row, bh.col, bh.next);
      }

      // Spawn newly forged special tiles (4K / Splat Bomb / Booyah)
      for (const sp of step.spawnedSpecials) {
        const vt = this.createVisualTile(sp.uid, sp.weaponId, sp.special, sp.row, sp.col, sp.row);
        vt.group.scale.setScalar(0.15);
        vt.targetScale = 1.06;
      }

      this.callbacks.onStepVisualComplete?.(step);
      await this.wait(120);

      // Apply gravity falls & refill drops
      for (const fall of step.falls) {
        const dest = this.cellToWorld(fall.toRow, fall.col);
        if (fall.isNew) {
          this.createVisualTile(
            fall.uid,
            fall.weaponId,
            fall.special,
            fall.toRow,
            fall.col,
            fall.fromRow - 0.6,
          );
        } else {
          const vt = this.visualTiles.get(fall.uid);
          if (vt) {
            vt.row = fall.toRow;
            vt.col = fall.col;
            vt.targetX = dest.x;
            vt.targetY = dest.y;
          }
        }
      }

      await this.wait(210);
    }

    this.setInputLocked(false);
  }

  /**
   * 3D E-liter 4K Sniper Rifle + Piercing Vertical Laser Beam!
   * Appears on EVERY vertical match (3+) and fires a full-column mega beam on 4K special!
   */
  private spawnEliter4KBeamFx(eff: ClearEffectEvent): void {
    const isFull = eff.kind === 'fullColumn4k';
    const minRow = isFull ? 0 : Math.min(...eff.cells.map((c) => c.row));
    const maxRow = isFull ? this.rows - 1 : Math.max(...eff.cells.map((c) => c.row));
    const col = eff.originCol;

    const topPos = this.cellToWorld(minRow, col);
    const botPos = this.cellToWorld(maxRow, col);
    const beamLen = Math.max(CELL_STEP * 2.4, Math.abs(topPos.y - botPos.y) + CELL_STEP * 1.15);
    const midY = (topPos.y + botPos.y) * 0.5;
    const x = topPos.x;

    const group = new THREE.Group();
    const color = new THREE.Color(eff.colorHex);

    // 1. Sculpted 3D E-liter 4K Sniper Rifle hovering at top of the vertical shot!
    const rifle = new THREE.Group();
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.5 });
    const scopeMat = new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x00d4ff, emissiveIntensity: 0.65 });
    const inkMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45 });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.35, 10), darkMat);
    barrel.position.set(0, -0.32, 0);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.24, 10), scopeMat);
    nozzle.position.set(0, -1.0, 0);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.46, 10), scopeMat);
    scope.position.set(0.18, -0.1, 0.08);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.52, 12), inkMat);
    tank.position.set(0, 0.32, 0);
    rifle.add(barrel, nozzle, scope, tank);
    rifle.position.set(x, topPos.y + 1.05, 0.65);
    if (isFull) rifle.scale.setScalar(1.22);
    group.add(rifle);

    // 2. Outer glowing ink laser beam
    const outerMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerBeam = new THREE.Mesh(this.beamCylGeo, outerMat);
    outerBeam.position.set(x, midY, 0.42);
    outerBeam.scale.set(isFull ? 2.4 : 1.55, beamLen, isFull ? 2.4 : 1.55);
    group.add(outerBeam);

    // 3. Pure white razor-sharp sniper core
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreBeam = new THREE.Mesh(this.beamCylGeo, coreMat);
    coreBeam.position.set(x, midY, 0.45);
    coreBeam.scale.set(isFull ? 0.95 : 0.62, beamLen, isFull ? 0.95 : 0.62);
    group.add(coreBeam);

    this.fxGroup.add(group);
    this.triggerShake(isFull ? 0.22 : 0.1, isFull ? 0.28 : 0.18);

    const duration = isFull ? 0.48 : 0.38;
    this.activeFx.push({
      group,
      age: 0,
      duration,
      update: (t) => {
        // Charge phase (0 -> 0.22) then recoil & fire (0.22 -> 1.0)
        if (t < 0.22) {
          const p = t / 0.22;
          outerBeam.scale.x = 0.25 + p * 0.2;
          coreBeam.scale.x = 0.18;
          outerMat.opacity = 0.5;
          rifle.position.y = topPos.y + 1.15 - p * 0.1;
        } else {
          const p = (t - 0.22) / 0.78;
          const width = (1 - p) * (isFull ? 2.7 : 1.75);
          outerBeam.scale.set(Math.max(0.02, width), beamLen, Math.max(0.02, width));
          coreBeam.scale.set(Math.max(0.01, width * 0.42), beamLen, Math.max(0.01, width * 0.42));
          outerMat.opacity = (1 - p) * 0.92;
          coreMat.opacity = 1 - p;
          // Crisp upward rifle recoil!
          rifle.position.y = topPos.y + 1.05 + Math.sin(p * Math.PI) * 0.42;
          rifle.scale.setScalar((isFull ? 1.22 : 1.0) * (1 - p * 0.45));
        }
      },
      cleanup: () => {
        barrel.geometry.dispose();
        nozzle.geometry.dispose();
        scope.geometry.dispose();
        tank.geometry.dispose();
        darkMat.dispose();
        scopeMat.dispose();
        inkMat.dispose();
        outerMat.dispose();
        coreMat.dispose();
      },
    });
  }

  /**
   * 3D Tetrahedral Splat Bomb + Horizontal Ink Detonation Shockwave!
   * Appears on EVERY horizontal match (3+) and blasts full-row shockwaves on Splat Bomb special!
   */
  private spawnSplatBombFx(eff: ClearEffectEvent): void {
    const isFull = eff.kind === 'fullRowBomb';
    const minCol = isFull ? 0 : Math.min(...eff.cells.map((c) => c.col));
    const maxCol = isFull ? this.cols - 1 : Math.max(...eff.cells.map((c) => c.col));
    const row = eff.originRow;

    const leftPos = this.cellToWorld(row, minCol);
    const rightPos = this.cellToWorld(row, maxCol);
    const midX = (leftPos.x + rightPos.x) * 0.5;
    const y = leftPos.y;
    const spanW = Math.max(CELL_STEP * 2.4, Math.abs(rightPos.x - leftPos.x) + CELL_STEP * 1.15);

    const group = new THREE.Group();
    const color = new THREE.Color(eff.colorHex);

    // 1. Iconic 3D Tetrahedral Splat Bomb spinning & pulsing before BOOM!
    const bombMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const bombMesh = new THREE.Mesh(this.bombTetraGeo, bombMat);
    bombMesh.position.set(midX, y, 0.75);
    bombMesh.scale.setScalar(isFull ? 1.55 : 1.25);
    group.add(bombMesh);

    // 2. Horizontal sweeping ink blast bar
    const blastMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const blastCyl = new THREE.Mesh(this.beamCylGeo, blastMat);
    blastCyl.rotation.z = Math.PI / 2;
    blastCyl.position.set(midX, y, 0.42);
    blastCyl.scale.set(0.1, spanW, 0.1);
    group.add(blastCyl);

    // 3. Expanding ink shockwave ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.shockRingGeo, ringMat);
    ring.position.set(midX, y, 0.46);
    group.add(ring);

    this.fxGroup.add(group);
    this.triggerShake(isFull ? 0.24 : 0.12, isFull ? 0.3 : 0.2);

    const duration = isFull ? 0.52 : 0.42;
    let exploded = false;

    this.activeFx.push({
      group,
      age: 0,
      duration,
      update: (t, dt) => {
        if (t < 0.3) {
          // Splat Bomb hop & urgent flashing countdown
          const p = t / 0.3;
          bombMesh.rotation.x += dt * 12;
          bombMesh.rotation.y += dt * 15;
          const pulse = (isFull ? 1.55 : 1.25) * (1 + Math.sin(p * Math.PI * 5) * 0.25);
          bombMesh.scale.setScalar(pulse);
          bombMesh.position.z = 0.75 + Math.sin(p * Math.PI) * 0.55;
        } else {
          if (!exploded) {
            exploded = true;
            bombMesh.visible = false;
            this.emitInkParticles(midX, y, color.getHex(), isFull ? 22 : 12);
          }
          const p = (t - 0.3) / 0.7;
          const thickness = (1 - p) * (isFull ? 2.8 : 1.9);
          blastCyl.scale.set(
            Math.max(0.02, thickness),
            spanW * Math.min(1, p * 2.8 + 0.35),
            Math.max(0.02, thickness),
          );
          blastMat.opacity = (1 - p) * 0.92;

          const rScale = 0.6 + p * (isFull ? 5.2 : 3.2);
          ring.scale.set(rScale, rScale * 0.55, 1);
          ringMat.opacity = (1 - p) * 0.9;
        }
      },
      cleanup: () => {
        bombMat.dispose();
        blastMat.dispose();
        ringMat.dispose();
      },
    });
  }

  private spawnBooyahFx(eff: ClearEffectEvent): void {
    const pos = this.cellToWorld(eff.originRow, eff.originCol);
    const group = new THREE.Group();
    const color = new THREE.Color(eff.colorHex);

    const sphereGeo = new THREE.SphereGeometry(0.45, 20, 20);
    const sphereMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orb = new THREE.Mesh(sphereGeo, sphereMat);
    orb.position.set(pos.x, pos.y, 0.7);
    group.add(orb);

    this.fxGroup.add(group);
    this.triggerShake(0.3, 0.36);
    this.emitInkParticles(pos.x, pos.y, color.getHex(), 28);

    this.activeFx.push({
      group,
      age: 0,
      duration: 0.55,
      update: (t) => {
        const s = 0.6 + t * 6.5;
        orb.scale.setScalar(s);
        sphereMat.opacity = (1 - t) * 0.85;
      },
      cleanup: () => {
        sphereGeo.dispose();
        sphereMat.dispose();
      },
    });
  }

  private emitInkParticles(x: number, y: number, colorInt: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.age = 0;
      p.life = 0.32 + Math.random() * 0.28;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 4.4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed + 1.1;
      p.vz = 1.4 + Math.random() * 2.2;
      p.startScale = 0.7 + Math.random() * 0.9;
      p.mat.color.setHex(colorInt);
      p.mat.opacity = 1;
      p.mesh.position.set(x, y, 0.35);
      p.mesh.scale.setScalar(p.startScale);
      p.mesh.visible = true;
      spawned++;
    }
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  private findVisualAt(row: number, col: number): VisualTile | undefined {
    for (const vt of this.visualTiles.values()) {
      if (vt.row === row && vt.col === col) return vt;
    }
    return undefined;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number): void => {
      this.rafId = window.requestAnimationFrame(tick);
      if (this.paused || this.contextLost) return;

      // Frame-rate independent delta clamped <= 50ms
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.elapsed += dt;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    const smooth = 1 - Math.exp(-16 * dt);

    // Animate tiles smoothly toward target positions + juicy selection bounce
    for (const vt of this.visualTiles.values()) {
      const meshPos = vt.group.position;
      meshPos.x += (vt.targetX - meshPos.x) * smooth;
      meshPos.y += (vt.targetY - meshPos.y) * smooth;

      const isSelected =
        this.selectedCell !== null &&
        this.selectedCell.row === vt.row &&
        this.selectedCell.col === vt.col;

      const desiredZ = isSelected ? 0.28 : vt.targetZ;
      meshPos.z += (desiredZ - meshPos.z) * smooth;

      let desiredScale = vt.targetScale;
      if (isSelected) {
        desiredScale = 1.12 + Math.sin(this.elapsed * 9) * 0.04;
      } else if (vt.special !== 'none') {
        desiredScale = 1.03 + Math.sin(this.elapsed * 6 + vt.bobPhase) * 0.045;
      }
      const nextScale = vt.group.scale.x + (desiredScale - vt.group.scale.x) * smooth;
      vt.group.scale.setScalar(nextScale);

      if (vt.specialBadgeMesh) {
        if (vt.special === 'splatbomb') {
          vt.specialBadgeMesh.rotation.x += dt * 3.5;
          vt.specialBadgeMesh.rotation.y += dt * 4.5;
        } else {
          vt.specialBadgeMesh.rotation.z += dt * 2.2;
        }
      }
    }

    // Selection ring pulse
    if (this.selectRing.visible) {
      const s = 1.0 + Math.sin(this.elapsed * 8) * 0.08;
      this.selectRing.scale.setScalar(s);
    }

    // Subtle crisp heartbeat pulse on unpainted turf cell frames + paint pop settle
    if (this.turfMeshes.size > 0) {
      this.turfGoalBorderMat.opacity = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(this.elapsed * 4.5));
      for (const tm of this.turfMeshes.values()) {
        if (tm.popScale > 1.001) {
          tm.popScale += (1 - tm.popScale) * smooth;
          if (tm.popScale < 1.002) tm.popScale = 1;
          tm.mesh.scale.setScalar(tm.popScale);
        }
      }
    }

    // Idle hint glow after 4.5 seconds of inactivity
    if (!this.inputLocked && this.hintPair) {
      this.idleSeconds += dt;
      if (this.idleSeconds > 4.5) {
        const [a, b] = this.hintPair;
        const pA = this.cellToWorld(a.row, a.col);
        const pB = this.cellToWorld(b.row, b.col);
        this.hintRingA.position.set(pA.x, pA.y, 0.23);
        this.hintRingB.position.set(pB.x, pB.y, 0.23);
        this.hintRingA.visible = true;
        this.hintRingB.visible = true;
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 7);
        this.hintRingMat.opacity = 0.35 + pulse * 0.55;
        const s = 0.96 + pulse * 0.14;
        this.hintRingA.scale.setScalar(s);
        this.hintRingB.scale.setScalar(s);
      }
    }

    // Update pooled ink particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.vy -= 11.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.startScale * (1 - t * 0.85));
      p.mat.opacity = 1 - t;
    }

    // Update active 4K / Splat Bomb / Booyah FX
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const fx = this.activeFx[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.duration);
      fx.update(t, dt);
      if (fx.age >= fx.duration) {
        this.fxGroup.remove(fx.group);
        fx.cleanup();
        this.activeFx.splice(i, 1);
      }
    }

    // Subtle ambient background drift
    for (let i = 0; i < this.bgBlobs.length; i++) {
      const b = this.bgBlobs[i];
      b.mesh.position.x = b.baseX + Math.sin(this.elapsed * b.speed + b.phase) * 0.4;
      b.mesh.position.y = b.baseY + Math.cos(this.elapsed * b.speed * 0.8 + b.phase) * 0.35;
    }

    // Camera impact shake decay
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const amt = this.shakeIntensity * (this.shakeTime / 0.3);
      this.camera.position.set(
        this.baseCamPos.x + (Math.random() - 0.5) * amt,
        this.baseCamPos.y + (Math.random() - 0.5) * amt,
        this.baseCamPos.z,
      );
      if (this.shakeTime === 0) {
        this.shakeIntensity = 0;
        this.camera.position.copy(this.baseCamPos);
      }
    }
  }

  public dispose(): void {
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    window.removeEventListener('blur', this.resetPointerState);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearLevelVisuals();
    this.slotGeo.dispose();
    this.turfSlotGeo.dispose();
    this.turfGeo.dispose();
    this.tileBodyGeo.dispose();
    this.tileFaceGeo.dispose();
    this.crateGeo.dispose();
    this.oozeGeo.dispose();
    this.selectRingGeo.dispose();
    this.hintRingGeo.dispose();
    this.particleGeo.dispose();
    this.bombTetraGeo.dispose();
    this.beamCylGeo.dispose();
    this.shockRingGeo.dispose();
    this.slotMatA.dispose();
    this.slotMatB.dispose();
    this.turfUnpaintedSlotMat.dispose();
    this.turfPaintedSlotMat.dispose();
    this.turfGoalBorderMat.dispose();
    this.selectRingMat.dispose();
    this.hintRingMat.dispose();
    for (const p of this.particles) p.mat.dispose();
    this.renderer.dispose();
  }
}
