import type { PlayerAppearance } from './types';

const skinColors = ['#4a2d24', '#5c382b', '#724735', '#895942', '#a66f50', '#bd8463', '#cf9871', '#e1b18a'];
const hairColors = ['#090b0d', '#1b1210', '#2b1d17', '#42291d', '#5a3522', '#7a4a2d'];
const hairStyles: PlayerAppearance['hairStyle'][] = ['bald', 'close', 'fade', 'curls', 'mohawk', 'topknot'];
const facialHair: PlayerAppearance['facialHair'][] = ['none', 'stubble', 'goatee', 'beard'];
const faceShapes: PlayerAppearance['faceShape'][] = ['round', 'oval', 'angular', 'wide'];
const bootColors = ['#f7fbff', '#0b1118', '#d9ff2f', '#ff6a3d', '#4db8ff', '#b77cff', '#f7c948', '#ff4f91'];
const accessories: PlayerAppearance['accessory'][] = ['none', 'headband', 'left-wristband', 'right-wristband', 'arm-sleeve'];
const accessoryColors = ['#ffffff', '#101820', '#d9ff2f', '#ff6a3d', '#4db8ff', '#f7c948'];

function hashString(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createPlayerAppearance(playerId: string, seed: number): PlayerAppearance {
  const stable = Math.max(1, Math.abs(seed));
  const uniqueness = (stable % 10_000) / 10_000;
  return {
    playerId,
    skinColor: skinColors[(stable * 5 + Math.floor(stable / 7)) % skinColors.length],
    hairColor: hairColors[(stable * 7 + Math.floor(stable / 11)) % hairColors.length],
    hairStyle: hairStyles[(stable * 11 + Math.floor(stable / 13)) % hairStyles.length],
    facialHair: facialHair[(stable * 13 + Math.floor(stable / 17)) % facialHair.length],
    faceShape: faceShapes[(stable * 17 + Math.floor(stable / 19)) % faceShapes.length],
    bootColor: bootColors[(stable * 19 + Math.floor(stable / 23)) % bootColors.length],
    accessory: accessories[(stable * 23 + Math.floor(stable / 29)) % accessories.length],
    accessoryColor: accessoryColors[(stable * 29 + Math.floor(stable / 31)) % accessoryColors.length],
    heightScale: Number((0.92 + uniqueness * 0.16).toFixed(4)),
    shoulderScale: Number((0.9 + ((stable * 7) % 23) / 100).toFixed(3)),
    legScale: Number((0.92 + ((stable * 11) % 19) / 100).toFixed(3)),
    headScale: Number((0.92 + ((stable * 13) % 17) / 100).toFixed(3)),
  };
}

export function createAppearanceRange(start: number, end: number): Record<string, PlayerAppearance> {
  const records: Record<string, PlayerAppearance> = {};
  for (let index = start; index <= end; index += 1) {
    const playerId = `p${index}`;
    records[playerId] = createPlayerAppearance(playerId, index);
  }
  return records;
}

export function createFallbackAppearance(playerId: string): PlayerAppearance {
  return createPlayerAppearance(playerId, 10_000 + hashString(playerId));
}
