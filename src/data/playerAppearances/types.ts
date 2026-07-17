export type HairStyle = 'bald' | 'close' | 'fade' | 'curls' | 'mohawk' | 'topknot';
export type FacialHair = 'none' | 'stubble' | 'goatee' | 'beard';
export type FaceShape = 'round' | 'oval' | 'angular' | 'wide';
export type PlayerAccessory = 'none' | 'headband' | 'left-wristband' | 'right-wristband' | 'arm-sleeve';

export interface PlayerAppearance {
  playerId: string;
  skinColor: string;
  hairColor: string;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  faceShape: FaceShape;
  bootColor: string;
  accessory: PlayerAccessory;
  accessoryColor: string;
  heightScale: number;
  shoulderScale: number;
  legScale: number;
  headScale: number;
}
