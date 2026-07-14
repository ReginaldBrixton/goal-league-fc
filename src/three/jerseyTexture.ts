import * as THREE from 'three';

export interface JerseyConfig {
  primary: string;
  secondary: string;
  number: number;
  isGK: boolean;
}

const cache = new Map<string, THREE.CanvasTexture>();

function cacheKey(config: JerseyConfig, teamId: string): string {
  return `${teamId}-${config.number}-${config.isGK}-${config.primary}-${config.secondary}`;
}

function readableInk(primary: string, fallback: string): string {
  const normalized = primary.replace('#', '');
  if (normalized.length !== 6) return fallback;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);
  return luminance > 168 ? '#081018' : '#f7fbff';
}

export function makeJerseyTexture(config: JerseyConfig, teamId: string): THREE.CanvasTexture {
  const key = cacheKey(config, teamId);
  const existing = cache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;

  const baseColor = config.isGK ? '#e7a719' : config.primary;
  const accentColor = config.isGK ? '#111821' : config.secondary;
  const numberColor = readableInk(baseColor, accentColor);

  const baseGradient = context.createLinearGradient(0, 0, 512, 512);
  baseGradient.addColorStop(0, baseColor);
  baseGradient.addColorStop(0.55, baseColor);
  baseGradient.addColorStop(1, accentColor);
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, 512, 512);

  context.globalAlpha = config.isGK ? 0.1 : 0.2;
  context.fillStyle = accentColor;
  for (let x = -128; x < 640; x += 96) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + 54, 0);
    context.lineTo(x + 210, 512);
    context.lineTo(x + 156, 512);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1;

  context.fillStyle = accentColor;
  context.fillRect(0, 0, 512, 30);
  context.fillRect(0, 482, 512, 30);
  context.fillRect(0, 86, 512, 12);

  context.beginPath();
  context.moveTo(206, 0);
  context.lineTo(256, 54);
  context.lineTo(306, 0);
  context.closePath();
  context.fillStyle = numberColor;
  context.fill();

  context.beginPath();
  context.arc(118, 126, 34, 0, Math.PI * 2);
  context.fillStyle = accentColor;
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = numberColor;
  context.stroke();
  context.fillStyle = numberColor;
  context.font = '900 25px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(teamId.slice(0, 2).toUpperCase(), 118, 127);

  context.font = '900 184px Arial Black, Arial, sans-serif';
  context.lineJoin = 'round';
  context.lineWidth = 18;
  context.strokeStyle = accentColor;
  context.fillStyle = numberColor;
  context.strokeText(String(config.number), 276, 305);
  context.fillText(String(config.number), 276, 305);

  context.font = '800 42px Arial, sans-serif';
  context.letterSpacing = '8px';
  context.lineWidth = 8;
  context.strokeStyle = accentColor;
  context.fillStyle = numberColor;
  context.strokeText(teamId.slice(0, 8).toUpperCase(), 256, 410);
  context.fillText(teamId.slice(0, 8).toUpperCase(), 256, 410);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

export function clearJerseyCache(): void {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
