import * as THREE from 'three';
import type { BlockerType, SpecialType, WeaponId } from '../types';
import {
  DEFAULT_WEAPON_ROW_IDS,
  SPECIAL_ICON_URLS,
  WEAPONS,
  getWeaponImgUrl,
} from '../data/weapons';

const SIZE = 256;

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSplatoonTileBase(
  ctx: CanvasRenderingContext2D,
  primary: string,
  dark: string,
  rim: string,
  shape: (typeof WEAPONS)[number]['shape'],
): void {
  ctx.clearRect(0, 0, SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  ctx.save();
  ctx.beginPath();
  if (shape === 'roundedSquare') {
    drawRoundedRect(ctx, 16, 16, SIZE - 32, SIZE - 32, 46);
  } else if (shape === 'cushion') {
    drawRoundedRect(ctx, 12, 22, SIZE - 24, SIZE - 44, 64);
  } else if (shape === 'octagon') {
    const rad = 114;
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'bucketHex') {
    const rad = 114;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, 10);
    ctx.quadraticCurveTo(SIZE - 14, 42, SIZE - 10, cy);
    ctx.quadraticCurveTo(SIZE - 14, SIZE - 42, cx, SIZE - 10);
    ctx.quadraticCurveTo(14, SIZE - 42, 10, cy);
    ctx.quadraticCurveTo(14, 42, cx, 10);
    ctx.closePath();
  } else {
    ctx.moveTo(cx, 14);
    ctx.lineTo(SIZE - 24, 44);
    ctx.quadraticCurveTo(SIZE - 18, 156, cx, SIZE - 12);
    ctx.quadraticCurveTo(18, 156, 24, 44);
    ctx.closePath();
  }

  // Deep vibrant Splatoon ink badge backing
  const grad = ctx.createRadialGradient(cx - 28, cy - 36, 16, cx, cy, 128);
  grad.addColorStop(0, rim);
  grad.addColorStop(0.28, primary);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // Crisp Splatoon sticker border
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
  ctx.stroke();

  // Subtle dark inner vignette so official Splatoon 3 weapon art pops cleanly regardless of weapon color
  ctx.save();
  ctx.clip();
  const innerShade = ctx.createRadialGradient(cx, cy, 24, cx, cy, 108);
  innerShade.addColorStop(0, 'rgba(15, 23, 42, 0.24)');
  innerShade.addColorStop(0.75, 'rgba(15, 23, 42, 0.14)');
  innerShade.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = innerShade;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const gloss = ctx.createLinearGradient(0, 12, 0, 105);
  gloss.addColorStop(0, 'rgba(255,255,255,0.44)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(cx, 48, 96, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Draws a real Splatoon 3 weapon PNG/WebP with a bold dark Splatoon sticker silhouette
 * so it remains ultra-legible on every ink color background at mobile tile sizes.
 */
function drawRealWeaponSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  scale = 0.78,
  rotationRad = 0,
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const drawSize = SIZE * scale;

  ctx.save();
  ctx.translate(cx, cy);
  if (rotationRad !== 0) ctx.rotate(rotationRad);

  // Soft dark halo / shadow for unmistakable contrast
  ctx.shadowColor = 'rgba(10, 14, 24, 0.85)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

  // Second crisp pass for sharp details
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  ctx.restore();
}

function drawSpecialOverlay(
  ctx: CanvasRenderingContext2D,
  special: SpecialType,
  specialImgs: {
    eliter4k: HTMLImageElement | null;
    splatbomb: HTMLImageElement | null;
    booyah: HTMLImageElement | null;
  },
): void {
  if (special === 'none') return;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  ctx.save();
  if (special === 'eliter4k') {
    // Vertical cyan laser beam + REAL Splatoon 3 E-liter 4K (公升4K) rotated vertically!
    const vGlow = ctx.createLinearGradient(cx - 32, 0, cx + 32, 0);
    vGlow.addColorStop(0, 'rgba(0, 245, 255, 0)');
    vGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.92)');
    vGlow.addColorStop(1, 'rgba(0, 245, 255, 0)');
    ctx.fillStyle = vGlow;
    ctx.fillRect(cx - 30, 6, 60, SIZE - 12);

    // Draw real E-liter 4K image vertically!
    if (specialImgs.eliter4k && specialImgs.eliter4k.complete && specialImgs.eliter4k.naturalWidth > 0) {
      drawRealWeaponSprite(ctx, specialImgs.eliter4k, 0.84, -Math.PI / 2);
    }

    // Crisp "4K" callout tag
    ctx.save();
    ctx.translate(cx, cy + 36);
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, -30, -15, 60, 30, 9);
    ctx.fill();
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('4K', 0, 1);
    ctx.restore();

    // Vertical Up/Down laser arrows
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 6);
    ctx.lineTo(cx - 20, 30);
    ctx.lineTo(cx + 20, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, SIZE - 6);
    ctx.lineTo(cx - 20, SIZE - 30);
    ctx.lineTo(cx + 20, SIZE - 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === 'splatbomb') {
    // Horizontal shockwave glow + REAL Splatoon 3 Splat Bomb icon!
    const hGlow = ctx.createLinearGradient(0, cy - 32, 0, cy + 32);
    hGlow.addColorStop(0, 'rgba(255, 220, 0, 0)');
    hGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.92)');
    hGlow.addColorStop(1, 'rgba(255, 220, 0, 0)');
    ctx.fillStyle = hGlow;
    ctx.fillRect(6, cy - 30, SIZE - 12, 60);

    // Dark badge backing circle so official white/cyan/black Splat Bomb icon pops super clearly
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FFE45E';
    ctx.stroke();
    ctx.restore();

    if (specialImgs.splatbomb && specialImgs.splatbomb.complete && specialImgs.splatbomb.naturalWidth > 0) {
      drawRealWeaponSprite(ctx, specialImgs.splatbomb, 0.56, 0);
    }

    // Left/Right blast arrows
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(6, cy);
    ctx.lineTo(30, cy - 20);
    ctx.lineTo(30, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(SIZE - 6, cy);
    ctx.lineTo(SIZE - 30, cy - 20);
    ctx.lineTo(SIZE - 30, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === 'booyah') {
    // Radiant rainbow Booyah Bomb orb + REAL Splatoon 3 Booyah Bomb (能量讚彈) icon!
    ctx.clearRect(0, 0, SIZE, SIZE);
    const orbGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 118);
    orbGrad.addColorStop(0, '#FFFFFF');
    orbGrad.addColorStop(0.3, '#FFE45E');
    orbGrad.addColorStop(0.58, '#FF2E93');
    orbGrad.addColorStop(0.84, '#00E5FF');
    orbGrad.addColorStop(1, '#6D28D9');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    if (specialImgs.booyah && specialImgs.booyah.complete && specialImgs.booyah.naturalWidth > 0) {
      drawRealWeaponSprite(ctx, specialImgs.booyah, 0.64, 0);
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('讚!', cx, cy + 3);
    }
  }
  ctx.restore();
}

export class TextureLibrary {
  private tileCanvases = new Map<string, [HTMLCanvasElement, CanvasRenderingContext2D]>();
  private tileTextures = new Map<string, THREE.CanvasTexture>();
  private weaponDataUrls = new Map<WeaponId, string>();
  private blockerTextures = new Map<BlockerType, THREE.CanvasTexture>();
  private imageCache = new Map<string, Promise<HTMLImageElement | null>>();
  private loadedImages = new Map<string, HTMLImageElement>();
  private currentRowIds: string[] = [...DEFAULT_WEAPON_ROW_IDS];
  private loadGen = 0;

  private specialImgs: {
    eliter4k: HTMLImageElement | null;
    splatbomb: HTMLImageElement | null;
    booyah: HTMLImageElement | null;
  } = {
    eliter4k: null,
    splatbomb: null,
    booyah: null,
  };

  public readonly inkSplatTexture: THREE.CanvasTexture;
  public specialBadgeUrls: Record<'eliter4k' | 'splatbomb' | 'booyah', string>;
  public readonly ready: Promise<void>;
  private onUpdatedCallback: (() => void) | null = null;

  constructor() {
    const specials: SpecialType[] = ['none', 'eliter4k', 'splatbomb', 'booyah'];
    for (const w of WEAPONS) {
      for (const sp of specials) {
        const key = `${w.id}_${sp}`;
        const pair = makeCanvas();
        this.tileCanvases.set(key, pair);
        const tex = new THREE.CanvasTexture(pair[0]);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        this.tileTextures.set(key, tex);
      }
    }

    // Render immediate color-coded placeholders so first frame never stalls
    this.redrawAllSlots();

    this.specialBadgeUrls = {
      eliter4k: this.renderSpecialPreviewUrl('eliter4k'),
      splatbomb: this.renderSpecialPreviewUrl('splatbomb'),
      booyah: this.renderSpecialPreviewUrl('booyah'),
    };

    this.blockerTextures.set('crate1', this.createCrateTexture(false));
    this.blockerTextures.set('crate2', this.createCrateTexture(true));
    this.blockerTextures.set('ooze', this.createOozeTexture());
    this.inkSplatTexture = this.createInkSplatTexture();

    // Load official Splatoon 3 special icons + initial 6 real weapons immediately
    this.ready = this.initRealSprites();
  }

  public setOnUpdated(cb: () => void): void {
    this.onUpdatedCallback = cb;
  }

  private loadImage(url: string): Promise<HTMLImageElement | null> {
    const existing = this.imageCache.get(url);
    if (existing) return existing;

    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        this.loadedImages.set(url, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    this.imageCache.set(url, promise);
    return promise;
  }

  private async initRealSprites(): Promise<void> {
    const [e4k, sb, by] = await Promise.all([
      this.loadImage(SPECIAL_ICON_URLS.eliter4k),
      this.loadImage(SPECIAL_ICON_URLS.splatbomb),
      this.loadImage(SPECIAL_ICON_URLS.booyah),
    ]);
    this.specialImgs.eliter4k = e4k;
    this.specialImgs.splatbomb = sb;
    this.specialImgs.booyah = by;

    await this.setLevelWeapons(this.currentRowIds);
    this.specialBadgeUrls = {
      eliter4k: this.renderSpecialPreviewUrl('eliter4k'),
      splatbomb: this.renderSpecialPreviewUrl('splatbomb'),
      booyah: this.renderSpecialPreviewUrl('booyah'),
    };
    this.onUpdatedCallback?.();
  }

  /**
   * Loads the 6 real Splatoon 3 v12.0.0 weapon sprites for the current level and
   * updates all in-place Three.js CanvasTextures cleanly.
   */
  public async setLevelWeapons(rowIds: readonly string[]): Promise<void> {
    const gen = ++this.loadGen;
    this.currentRowIds = [...rowIds];
    const urls = rowIds.map((id) => getWeaponImgUrl(id));
    await Promise.all(urls.map((u) => this.loadImage(u)));
    if (gen !== this.loadGen) return;
    this.redrawAllSlots();
    this.onUpdatedCallback?.();
  }

  private redrawAllSlots(): void {
    this.weaponDataUrls.clear();
    const specials: SpecialType[] = ['none', 'eliter4k', 'splatbomb', 'booyah'];
    for (const w of WEAPONS) {
      const rowId = this.currentRowIds[w.id] ?? w.rowId;
      const weaponImg = this.loadedImages.get(getWeaponImgUrl(rowId)) ?? null;

      for (const sp of specials) {
        const key = `${w.id}_${sp}`;
        const [, ctx] = this.tileCanvases.get(key)!;
        if (sp !== 'booyah') {
          drawSplatoonTileBase(ctx, w.primaryHex, w.darkHex, w.rimHex, w.shape);
          drawRealWeaponSprite(ctx, weaponImg, sp === 'none' ? 0.8 : 0.62, 0);
        }
        drawSpecialOverlay(ctx, sp, this.specialImgs);

        const tex = this.tileTextures.get(key)!;
        tex.needsUpdate = true;
      }
    }
  }

  private renderSpecialPreviewUrl(sp: 'eliter4k' | 'splatbomb' | 'booyah'): string {
    const [canvas, ctx] = makeCanvas();
    if (sp === 'eliter4k') {
      drawSplatoonTileBase(ctx, '#00D4FF', '#005B80', '#B8F3FF', 'roundedSquare');
    } else if (sp === 'splatbomb') {
      drawSplatoonTileBase(ctx, '#FF5E00', '#9E2B00', '#FFD1A9', 'roundedSquare');
    }
    drawSpecialOverlay(ctx, sp, this.specialImgs);
    return canvas.toDataURL('image/png');
  }

  public getTileTexture(weaponId: WeaponId, special: SpecialType): THREE.CanvasTexture {
    if (special === 'booyah') {
      return this.tileTextures.get('0_booyah')!;
    }
    return this.tileTextures.get(`${weaponId}_${special}`)!;
  }

  public getWeaponDataUrl(weaponId: WeaponId): string {
    let url = this.weaponDataUrls.get(weaponId);
    if (!url) {
      const pair = this.tileCanvases.get(`${weaponId}_none`)!;
      url = pair[0].toDataURL('image/png');
      this.weaponDataUrls.set(weaponId, url);
    }
    return url;
  }

  public getCurrentWeaponRowId(weaponId: WeaponId): string {
    return this.currentRowIds[weaponId] ?? WEAPONS[weaponId].rowId;
  }

  public getBlockerTexture(blocker: BlockerType): THREE.CanvasTexture | null {
    return this.blockerTextures.get(blocker) ?? null;
  }

  private createCrateTexture(steel: boolean): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas();
    drawRoundedRect(ctx, 14, 14, SIZE - 28, SIZE - 28, 28);
    ctx.fillStyle = steel ? '#475569' : '#B4692E';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = steel ? '#CBD5E1' : '#FDE68A';
    ctx.stroke();

    ctx.strokeStyle = steel ? '#1E293B' : '#78350F';
    ctx.lineWidth = 12;
    drawRoundedRect(ctx, 36, 36, SIZE - 72, SIZE - 72, 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(42, 42);
    ctx.lineTo(SIZE - 42, SIZE - 42);
    ctx.moveTo(SIZE - 42, 42);
    ctx.lineTo(42, SIZE - 42);
    ctx.stroke();

    ctx.fillStyle = steel ? '#F59E0B' : '#FACC15';
    drawRoundedRect(ctx, 84, 84, 88, 88, 16);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(steel ? 'II' : 'I', SIZE / 2, SIZE / 2 + 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createOozeTexture(): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas();
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = '#7E22CE';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(cx, cy, 98, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const r = 92 + (i % 2 === 0 ? 12 : -4);
      ctx.fillStyle = i % 3 === 0 ? '#F59E0B' : '#9333EA';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createInkSplatTexture(): THREE.CanvasTexture {
    const [canvas, ctx] = makeCanvas();
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#FFFFFF';

    ctx.beginPath();
    const spikes = 14;
    for (let i = 0; i <= spikes * 4; i++) {
      const a = (i / (spikes * 4)) * Math.PI * 2;
      const wobble =
        78 +
        Math.sin(a * 5) * 18 +
        Math.cos(a * 7 + 1.2) * 14 +
        Math.sin(a * 3 - 0.5) * 10;
      const x = cx + Math.cos(a) * wobble;
      const y = cy + Math.sin(a) * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const drops = [
      [0.3, 110, 12],
      [1.4, 114, 9],
      [2.6, 108, 13],
      [4.1, 112, 10],
      [5.3, 106, 11],
    ];
    for (const [ang, dist, rad] of drops) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
