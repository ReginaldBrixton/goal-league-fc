import * as THREE from 'three';

export interface JerseyConfig {
  primary: string;
  secondary: string;
  number: number;
  isGK: boolean;
}

const cache = new Map<string, THREE.CanvasTexture>();

function cacheKey(cfg: JerseyConfig, teamId: string): string {
  return `${teamId}-${cfg.number}-${cfg.isGK}-${cfg.primary}-${cfg.secondary}`;
}

export function makeJerseyTexture(cfg: JerseyConfig, teamId: string): THREE.CanvasTexture {
  const key = cacheKey(cfg, teamId);
  const existing = cache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseColor = cfg.isGK ? '#f0a500' : cfg.primary;
  const accentColor = cfg.isGK ? '#1a1a1a' : cfg.secondary;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  if (!cfg.isGK) {
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 256; i += 32) {
      ctx.fillRect(i, 0, 16, 256);
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 256, 20);
  ctx.fillRect(0, 236, 256, 20);

  ctx.fillStyle = accentColor;
  ctx.fillRect(96, 40, 64, 8);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cfg.number), 128, 140);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeText(String(cfg.number), 128, 140);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

export function clearJerseyCache(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
