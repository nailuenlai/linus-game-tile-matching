import * as THREE from 'three';
import type { BlockerType, SpecialType, WeaponId } from '../types';
import { WEAPONS } from '../data/weapons';

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
  // Distinct outer badge silhouette per weapon for instant shape+color recognition
  ctx.beginPath();
  if (shape === 'roundedSquare') {
    drawRoundedRect(ctx, 18, 18, SIZE - 36, SIZE - 36, 48);
  } else if (shape === 'cushion') {
    drawRoundedRect(ctx, 14, 24, SIZE - 28, SIZE - 48, 66);
  } else if (shape === 'octagon') {
    const rad = 112;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 8) + (i * Math.PI) / 4;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'bucketHex') {
    const rad = 112;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, 12);
    ctx.quadraticCurveTo(SIZE - 16, 44, SIZE - 12, cy);
    ctx.quadraticCurveTo(SIZE - 16, SIZE - 44, cx, SIZE - 12);
    ctx.quadraticCurveTo(16, SIZE - 44, 12, cy);
    ctx.quadraticCurveTo(16, 44, cx, 12);
    ctx.closePath();
  } else {
    // Shield
    ctx.moveTo(cx, 16);
    ctx.lineTo(SIZE - 26, 46);
    ctx.quadraticCurveTo(SIZE - 20, 155, cx, SIZE - 14);
    ctx.quadraticCurveTo(20, 155, 26, 46);
    ctx.closePath();
  }

  // Deep drop ink gradient
  const grad = ctx.createRadialGradient(cx - 28, cy - 36, 18, cx, cy, 125);
  grad.addColorStop(0, rim);
  grad.addColorStop(0.28, primary);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // Bold Splatoon sticker white+ink outline
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.stroke();

  // Glossy top candy/ink reflection
  ctx.save();
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, 14, 0, 118);
  gloss.addColorStop(0, 'rgba(255,255,255,0.52)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(cx, 54, 96, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle halftone ink dots at bottom
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 36; x < SIZE - 28; x += 22) {
    ctx.beginPath();
    ctx.arc(x, SIZE - 44, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawWeaponIllustration(ctx: CanvasRenderingContext2D, weaponId: WeaponId): void {
  ctx.save();
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Crisp dark drop shadow under weapon icon for high readability
  ctx.shadowColor = 'rgba(10, 14, 24, 0.55)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;

  switch (weaponId) {
    case 0: {
      // Splattershot (斯普拉射擊槍) — iconic yellow/blue shooter
      ctx.rotate(-0.22);
      // Grip
      ctx.fillStyle = '#1E293B';
      drawRoundedRect(ctx, -40, 12, 24, 48, 8);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Main barrel body
      ctx.fillStyle = '#FFFDF5';
      drawRoundedRect(ctx, -64, -18, 122, 42, 16);
      ctx.fill();
      ctx.stroke();

      // Blue ink stripe & nozzle
      ctx.fillStyle = '#0091FF';
      drawRoundedRect(ctx, 44, -14, 28, 34, 8);
      ctx.fill();
      ctx.stroke();

      // Top transparent/blue ink tank bottle
      ctx.fillStyle = '#00B4FF';
      drawRoundedRect(ctx, -38, -56, 62, 34, 14);
      ctx.fill();
      ctx.stroke();

      // Highlight on tank
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      drawRoundedRect(ctx, -28, -48, 38, 9, 4);
      ctx.fill();

      // Bright yellow accent band
      ctx.fillStyle = '#FFD600';
      drawRoundedRect(ctx, -22, -8, 44, 18, 6);
      ctx.fill();
      break;
    }

    case 1: {
      // Splat Roller (斯普拉滾筒) — wide ink roller + diagonal handle
      ctx.rotate(-0.35);
      // Handle shaft
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(0, 68);
      ctx.lineTo(0, -14);
      ctx.stroke();

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(0, 66);
      ctx.lineTo(0, -14);
      ctx.stroke();

      // Cyan fork bracket
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-48, -14);
      ctx.lineTo(48, -14);
      ctx.lineTo(48, -32);
      ctx.moveTo(-48, -14);
      ctx.lineTo(-48, -32);
      ctx.stroke();

      // Big roller sponge cylinder dripping neon pink
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, -66, -64, 132, 42, 18);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#FF2E93';
      drawRoundedRect(ctx, -56, -56, 112, 26, 12);
      ctx.fill();

      // Ink drips
      ctx.fillStyle = '#FFE4F2';
      ctx.beginPath();
      ctx.arc(-30, -45, 7, 0, Math.PI * 2);
      ctx.arc(8, -45, 5, 0, Math.PI * 2);
      ctx.arc(34, -42, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 2: {
      // Splat Dualies (斯普拉機動槍) — twin crossed compact ink pistols
      const drawSingleDualie = (flip: number): void => {
        ctx.save();
        ctx.scale(flip, 1);
        ctx.translate(-14, 4);
        ctx.rotate(-0.38);

        ctx.fillStyle = '#102A6B';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        // Handle
        drawRoundedRect(ctx, -28, 6, 18, 36, 6);
        ctx.fill();
        ctx.stroke();
        // Sleek body
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(ctx, -40, -18, 76, 28, 11);
        ctx.fill();
        ctx.stroke();
        // Twin cyan nozzle
        ctx.fillStyle = '#00E5FF';
        drawRoundedRect(ctx, 26, -15, 22, 22, 6);
        ctx.fill();
        ctx.stroke();
        // Top mini tank
        ctx.fillStyle = '#1D4ED8';
        drawRoundedRect(ctx, -26, -34, 34, 16, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      drawSingleDualie(-1);
      drawSingleDualie(1);
      break;
    }

    case 3: {
      // Slosher (飛濺潑桶) — tilted paint bucket with sloshing wave
      ctx.rotate(-0.18);
      // Carry handle arch
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, -24, 44, Math.PI, 0);
      ctx.stroke();

      // Ink splash wave leaping out
      ctx.fillStyle = '#FFF5C0';
      ctx.beginPath();
      ctx.moveTo(-46, -24);
      ctx.quadraticCurveTo(-18, -68, 12, -46);
      ctx.quadraticCurveTo(38, -72, 54, -24);
      ctx.closePath();
      ctx.fill();

      // Bucket body trapezoid
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-54, -24);
      ctx.lineTo(54, -24);
      ctx.lineTo(40, 56);
      ctx.lineTo(-40, 56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bold orange racing stripe on bucket
      ctx.fillStyle = '#FF5500';
      ctx.beginPath();
      ctx.moveTo(-46, 0);
      ctx.lineTo(46, 0);
      ctx.lineTo(42, 28);
      ctx.lineTo(-42, 28);
      ctx.closePath();
      ctx.fill();

      // Top rim
      ctx.fillStyle = '#FFE066';
      drawRoundedRect(ctx, -60, -34, 120, 18, 9);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 4: {
      // Splatana Wiper (雨刷刮水刀) — diagonal katana wiper blade
      ctx.rotate(-0.75);
      // Long sleek wiper blade
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-76, -12);
      ctx.lineTo(44, -18);
      ctx.lineTo(78, 0);
      ctx.lineTo(44, 16);
      ctx.lineTo(-76, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Neon acid-lime wiper rubber edge
      ctx.fillStyle = '#7CFF00';
      ctx.beginPath();
      ctx.moveTo(-52, -12);
      ctx.lineTo(46, -16);
      ctx.lineTo(70, -2);
      ctx.lineTo(-52, -2);
      ctx.closePath();
      ctx.fill();

      // Guard (Tsuba)
      ctx.fillStyle = '#1E293B';
      drawRoundedRect(ctx, -44, -28, 16, 56, 6);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Hilt
      ctx.fillStyle = '#334155';
      drawRoundedRect(ctx, -84, -10, 40, 20, 8);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 5: {
      // Tri-Stringer (三發獵魚弓) — curved bow + 3 golden arrows
      ctx.rotate(-0.35);
      // Bowstring
      ctx.strokeStyle = '#E9D5FF';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-26, -68);
      ctx.lineTo(-50, 0);
      ctx.lineTo(-26, 68);
      ctx.stroke();

      // Curved bow limbs
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(-44, 0, 74, -1.15, 1.15);
      ctx.stroke();

      ctx.strokeStyle = '#6D28D9';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(-44, 0, 74, -1.15, 1.15);
      ctx.stroke();

      // Three glowing arrows fanning forward!
      const angles = [-0.24, 0, 0.24];
      for (const a of angles) {
        ctx.save();
        ctx.rotate(a);
        ctx.strokeStyle = '#FFE66D';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-46, 0);
        ctx.lineTo(54, 0);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(72, 0);
        ctx.lineTo(44, -11);
        ctx.lineTo(44, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }

  ctx.restore();
}

function drawSpecialOverlay(ctx: CanvasRenderingContext2D, special: SpecialType): void {
  if (special === 'none') return;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  ctx.save();
  if (special === 'eliter4k') {
    // Bold vertical targeting glow + E-liter 4K Sniper Rifle emblem + Up/Down arrows!
    const vGlow = ctx.createLinearGradient(cx - 28, 0, cx + 28, 0);
    vGlow.addColorStop(0, 'rgba(0, 245, 255, 0)');
    vGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.92)');
    vGlow.addColorStop(1, 'rgba(0, 245, 255, 0)');
    ctx.fillStyle = vGlow;
    ctx.fillRect(cx - 26, 8, 52, SIZE - 16);

    // Draw E-liter 4K Sniper Rifle vertically
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 10;

    // Long sniper barrel
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, -10, -88, 20, 152, 8);
    ctx.fill();
    ctx.stroke();

    // Nozzle tip
    ctx.fillStyle = '#00F5FF';
    drawRoundedRect(ctx, -14, -98, 28, 20, 6);
    ctx.fill();
    ctx.stroke();

    // Iconic 4K Scope lens on side
    ctx.fillStyle = '#FFD600';
    drawRoundedRect(ctx, 12, -32, 24, 48, 8);
    ctx.fill();
    ctx.stroke();

    // Ink tank stock
    ctx.fillStyle = '#FF2E93';
    drawRoundedRect(ctx, -20, 26, 40, 48, 12);
    ctx.fill();
    ctx.stroke();

    // "4K" bold badge tag
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, -36, -18, 72, 36, 10);
    ctx.fill();
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('4K', 0, 1);
    ctx.restore();

    // Vertical Up/Down laser arrows
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    // Top arrow
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 20, 32);
    ctx.lineTo(cx + 20, 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Bottom arrow
    ctx.beginPath();
    ctx.moveTo(cx, SIZE - 8);
    ctx.lineTo(cx - 20, SIZE - 32);
    ctx.lineTo(cx + 20, SIZE - 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === 'splatbomb') {
    // Horizontal shockwave glow + Iconic Splatoon Tetrahedral Splat Bomb + Left/Right arrows!
    const hGlow = ctx.createLinearGradient(0, cy - 28, 0, cy + 28);
    hGlow.addColorStop(0, 'rgba(255, 220, 0, 0)');
    hGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    hGlow.addColorStop(1, 'rgba(255, 220, 0, 0)');
    ctx.fillStyle = hGlow;
    ctx.fillRect(8, cy - 26, SIZE - 16, 52);

    // Classic Splatoon Pyramid/Triangle Splat Bomb!
    ctx.save();
    ctx.translate(cx, cy + 6);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 12;

    // Outer translucent pouch triangle
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, -76);
    ctx.lineTo(74, 54);
    ctx.lineTo(-74, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner bright ink fill inside pouch
    const bombGrad = ctx.createLinearGradient(0, -50, 0, 48);
    bombGrad.addColorStop(0, '#FFF59D');
    bombGrad.addColorStop(0.45, '#FF5252');
    bombGrad.addColorStop(1, '#FF1744');
    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(54, 42);
    ctx.lineTo(-54, 42);
    ctx.closePath();
    ctx.fill();

    // Center warning ring & facet seam
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(0, 42);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 6, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF1744';
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Left/Right blast arrows
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(32, cy - 20);
    ctx.lineTo(32, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(SIZE - 8, cy);
    ctx.lineTo(SIZE - 32, cy - 20);
    ctx.lineTo(SIZE - 32, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (special === 'booyah') {
    // Booyah Bomb rainbow energy orb!
    ctx.clearRect(0, 0, SIZE, SIZE);
    const orbGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 118);
    orbGrad.addColorStop(0, '#FFFFFF');
    orbGrad.addColorStop(0.28, '#FFE45E');
    orbGrad.addColorStop(0.55, '#FF2E93');
    orbGrad.addColorStop(0.82, '#00E5FF');
    orbGrad.addColorStop(1, '#6D28D9');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Starburst rays
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      ctx.lineTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
      ctx.stroke();
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('讚!', cx, cy + 3);
  }
  ctx.restore();
}

export class TextureLibrary {
  private tileTextures = new Map<string, THREE.CanvasTexture>();
  private weaponDataUrls = new Map<WeaponId, string>();
  private blockerTextures = new Map<BlockerType, THREE.CanvasTexture>();
  public readonly inkSplatTexture: THREE.CanvasTexture;
  public readonly specialBadgeUrls: Record<'eliter4k' | 'splatbomb' | 'booyah', string>;

  constructor() {
    // Pre-generate crisp textures for all 6 weapons x 4 special variants
    const specials: SpecialType[] = ['none', 'eliter4k', 'splatbomb', 'booyah'];
    for (const w of WEAPONS) {
      for (const sp of specials) {
        const [canvas, ctx] = makeCanvas();
        if (sp !== 'booyah') {
          drawSplatoonTileBase(ctx, w.primaryHex, w.darkHex, w.rimHex, w.shape);
          drawWeaponIllustration(ctx, w.id);
        }
        drawSpecialOverlay(ctx, sp);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        this.tileTextures.set(`${w.id}_${sp}`, tex);

        if (sp === 'none') {
          this.weaponDataUrls.set(w.id, canvas.toDataURL('image/png'));
        }
      }
    }

    // Special icon URLs for tutorial legend & HUD
    this.specialBadgeUrls = {
      eliter4k: this.renderSpecialPreviewUrl('eliter4k'),
      splatbomb: this.renderSpecialPreviewUrl('splatbomb'),
      booyah: this.renderSpecialPreviewUrl('booyah'),
    };

    // Blocker textures
    this.blockerTextures.set('crate1', this.createCrateTexture(false));
    this.blockerTextures.set('crate2', this.createCrateTexture(true));
    this.blockerTextures.set('ooze', this.createOozeTexture());

    // Ink splat decal texture for turf cells & burst splatters
    this.inkSplatTexture = this.createInkSplatTexture();
  }

  private renderSpecialPreviewUrl(sp: 'eliter4k' | 'splatbomb' | 'booyah'): string {
    const [canvas, ctx] = makeCanvas();
    if (sp === 'eliter4k') {
      drawSplatoonTileBase(ctx, '#00D4FF', '#005B80', '#B8F3FF', 'roundedSquare');
    } else if (sp === 'splatbomb') {
      drawSplatoonTileBase(ctx, '#FF5E00', '#9E2B00', '#FFD1A9', 'roundedSquare');
    }
    drawSpecialOverlay(ctx, sp);
    return canvas.toDataURL('image/png');
  }

  public getTileTexture(weaponId: WeaponId, special: SpecialType): THREE.CanvasTexture {
    if (special === 'booyah') {
      return this.tileTextures.get(`0_booyah`)!;
    }
    return this.tileTextures.get(`${weaponId}_${special}`)!;
  }

  public getWeaponDataUrl(weaponId: WeaponId): string {
    return this.weaponDataUrls.get(weaponId)!;
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

    // Inner planks or steel frame
    ctx.strokeStyle = steel ? '#1E293B' : '#78350F';
    ctx.lineWidth = 12;
    drawRoundedRect(ctx, 36, 36, SIZE - 72, SIZE - 72, 14);
    ctx.stroke();

    // Diagonal brace
    ctx.beginPath();
    ctx.moveTo(42, 42);
    ctx.lineTo(SIZE - 42, SIZE - 42);
    ctx.moveTo(SIZE - 42, 42);
    ctx.lineTo(42, SIZE - 42);
    ctx.stroke();

    // Grizzco caution stripe / badge in center
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

    // Fuzzy Alterna ooze frame covering edges so underlying weapon still peeks through!
    ctx.strokeStyle = '#7E22CE';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(cx, cy, 98, 0, Math.PI * 2);
    ctx.stroke();

    // Hairy amber/violet blobs around ring
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

    // Organic Splatoon ink blotch
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

    // Satellite ink droplets
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

  public dispose(): void {
    for (const tex of this.tileTextures.values()) tex.dispose();
    for (const tex of this.blockerTextures.values()) tex.dispose();
    this.inkSplatTexture.dispose();
    this.tileTextures.clear();
    this.blockerTextures.clear();
  }
}
