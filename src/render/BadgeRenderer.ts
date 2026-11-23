import type { BadgeDef } from '../types';

const BADGE_SIZE = 160;
const cache = new Map<string, string>();

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawBadgeIcon(ctx: CanvasRenderingContext2D, badge: BadgeDef): void {
  const cx = BADGE_SIZE / 2;
  const cy = BADGE_SIZE / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const isRookie = badge.tier === 'rookie';
  ctx.fillStyle = isRookie ? '#CBD5E1' : '#FFFFFF';
  ctx.strokeStyle = isRookie ? '#475569' : '#0F172A';
  ctx.lineWidth = isRookie ? 3.5 : 4.5;

  switch (badge.iconKey) {
    case 'squid': {
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(28, 2);
      ctx.lineTo(14, 10);
      ctx.lineTo(18, 30);
      ctx.lineTo(6, 16);
      ctx.lineTo(0, 32);
      ctx.lineTo(-6, 16);
      ctx.lineTo(-18, 30);
      ctx.lineTo(-14, 10);
      ctx.lineTo(-28, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-8, -2, 4.5, 0, Math.PI * 2);
      ctx.arc(8, -2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sniper': {
      ctx.rotate(-0.65);
      ctx.fillStyle = badge.accentHex;
      ctx.fillRect(-38, -6, 76, 12);
      ctx.strokeRect(-38, -6, 76, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-10, -18, 24, 10);
      ctx.strokeRect(-10, -18, 24, 10);
      // Scope laser dot
      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.arc(42, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bomb': {
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(32, 24);
      ctx.lineTo(-32, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 4, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crown':
    case 'mythicCrown': {
      ctx.fillStyle = badge.iconKey === 'mythicCrown' ? '#FFE45E' : badge.accentHex;
      ctx.beginPath();
      ctx.moveTo(-34, 20);
      ctx.lineTo(-38, -16);
      ctx.lineTo(-16, 0);
      ctx.lineTo(0, -32);
      ctx.lineTo(16, 0);
      ctx.lineTo(38, -16);
      ctx.lineTo(34, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Crown gems
      ctx.fillStyle = '#FF2E93';
      ctx.beginPath();
      ctx.arc(0, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00F5FF';
      ctx.beginPath();
      ctx.arc(-18, 8, 4.5, 0, Math.PI * 2);
      ctx.arc(18, 8, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#FFB703';
      ctx.beginPath();
      ctx.arc(0, 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FF5400';
      ctx.beginPath();
      ctx.arc(-4, -2, 11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'booyah':
    case 'star': {
      ctx.fillStyle = badge.accentHex;
      drawStar(ctx, 0, 0, 32, 15, 5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'rank': {
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(30, -14);
      ctx.lineTo(24, 24);
      ctx.lineTo(0, 36);
      ctx.lineTo(-24, 24);
      ctx.lineTo(-30, -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const rankChar = badge.level >= 85 ? 'X' : badge.level >= 60 ? 'S+' : badge.level >= 50 ? 'A' : badge.level >= 40 ? 'B' : 'C';
      ctx.fillText(rankChar, 0, 2);
      break;
    }
    case 'bolt': {
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      ctx.moveTo(8, -34);
      ctx.lineTo(-22, 4);
      ctx.lineTo(0, 4);
      ctx.lineTo(-10, 34);
      ctx.lineTo(24, -4);
      ctx.lineTo(2, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'tower': {
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(20, 26);
      ctx.lineTo(-20, 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 6);
      ctx.lineTo(14, 6);
      ctx.moveTo(-10, -8);
      ctx.lineTo(10, -8);
      ctx.stroke();
      break;
    }
    case 'salmon': {
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      ctx.ellipse(-4, 0, 26, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(34, -14);
      ctx.lineTo(34, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(-14, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // Weapon / splat stylized emblem
      ctx.fillStyle = badge.accentHex;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const r = i % 2 === 0 ? 31 : 18;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Generates a crisp cached dataURL for any of the 100 Splatoon 3 badges.
 * Visual richness scales dramatically from Lv 1 Rookie peeling stickers -> Lv 100 Mythic Crown!
 */
export function getBadgeImageUrl(badge: BadgeDef, locked = false): string {
  const cacheKey = `${badge.id}_${locked ? 'locked' : 'open'}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = BADGE_SIZE;
  canvas.height = BADGE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const cx = BADGE_SIZE / 2;
  const cy = BADGE_SIZE / 2;

  if (locked) {
    ctx.fillStyle = '#1E2533';
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '900 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + 3);
    const url = canvas.toDataURL('image/png');
    cache.set(cacheKey, url);
    return url;
  }

  // Tier-specific badge silhouette & finish!
  if (badge.tier === 'rookie') {
    // Deliberately humble, slightly tilted scrap paper / cheap plastic sticker!
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.07);
    ctx.fillStyle = '#4B5563';
    ctx.beginPath();
    ctx.roundRect(-56, -56, 112, 112, 16);
    ctx.fill();
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Peeling corner dog-ear
    ctx.fillStyle = '#6B7280';
    ctx.beginPath();
    ctx.moveTo(28, -56);
    ctx.lineTo(56, -28);
    ctx.lineTo(28, -28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (badge.tier === 'bronze') {
    const grad = ctx.createLinearGradient(20, 20, 140, 140);
    grad.addColorStop(0, '#F3B483');
    grad.addColorStop(0.5, '#C9773E');
    grad.addColorStop(1, '#7C421C');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFE0C2';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#3A2314';
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
  } else if (badge.tier === 'silver') {
    // Polished 8-sided silver medal
    const grad = ctx.createLinearGradient(16, 16, 144, 144);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.45, '#CBD5E1');
    grad.addColorStop(1, '#64748B');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      const x = cx + Math.cos(a) * 69;
      const y = cy + Math.sin(a) * 69;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
  } else if (badge.tier === 'gold') {
    // Gleaming scalloped gold medallion
    const grad = ctx.createLinearGradient(14, 14, 146, 146);
    grad.addColorStop(0, '#FFF7B2');
    grad.addColorStop(0.38, '#FFD600');
    grad.addColorStop(0.75, '#D97706');
    grad.addColorStop(1, '#FFF1A8');
    ctx.fillStyle = grad;
    drawStar(ctx, cx, cy, 73, 62, 12);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    const inner = ctx.createRadialGradient(cx, cy - 12, 8, cx, cy, 54);
    inner.addColorStop(0, '#4A3308');
    inner.addColorStop(1, '#1E1505');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(cx, cy, 53, 0, Math.PI * 2);
    ctx.fill();
  } else if (badge.tier === 'holo') {
    // Iridescent holographic neon Splatoon foil!
    const grad = ctx.createLinearGradient(10, 10, 150, 150);
    grad.addColorStop(0, '#00F5FF');
    grad.addColorStop(0.32, '#FF2E93');
    grad.addColorStop(0.66, '#FFE45E');
    grad.addColorStop(1, '#38F9D7');
    ctx.fillStyle = grad;
    drawStar(ctx, cx, cy, 75, 62, 16);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    const inner = ctx.createRadialGradient(cx - 14, cy - 14, 8, cx, cy, 55);
    inner.addColorStop(0, '#312E81');
    inner.addColorStop(1, '#0F172A');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(cx, cy, 53, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal holo reflection streak
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 53, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(20, 120);
    ctx.lineTo(120, 20);
    ctx.lineTo(145, 45);
    ctx.lineTo(45, 145);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    // MYTHIC (Lv 91-100): Radiant prismatic halo + obsidian gold crest!
    const halo = ctx.createRadialGradient(cx, cy, 38, cx, cy, 79);
    halo.addColorStop(0, 'rgba(255,228,94,0.95)');
    halo.addColorStop(0.65, 'rgba(255,46,147,0.75)');
    halo.addColorStop(1, 'rgba(0,245,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.fill();

    const frame = ctx.createLinearGradient(12, 12, 148, 148);
    frame.addColorStop(0, '#FFF8B8');
    frame.addColorStop(0.28, '#FFD600');
    frame.addColorStop(0.55, '#FF2E93');
    frame.addColorStop(0.8, '#00F5FF');
    frame.addColorStop(1, '#FFE45E');
    ctx.fillStyle = frame;
    drawStar(ctx, cx, cy, 74, 58, 10);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    const core = ctx.createRadialGradient(cx, cy - 10, 6, cx, cy, 54);
    core.addColorStop(0, '#3B0764');
    core.addColorStop(1, '#090714');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw central icon
  drawBadgeIcon(ctx, badge);

  // Subtle level pill at bottom of higher-tier badges
  if (badge.tier !== 'rookie') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(cx - 26, BADGE_SIZE - 30, 52, 22, 11);
    ctx.fill();
    ctx.strokeStyle = badge.tier === 'mythic' ? '#FFE45E' : '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${badge.level}`, cx, BADGE_SIZE - 19);
  }

  const url = canvas.toDataURL('image/png');
  cache.set(cacheKey, url);
  return url;
}
