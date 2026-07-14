export const LIVE_PLAYER_SCALE = 0.22;
export const CAREER_PLAYER_SCALE = 1.05;
export const MATCH_MAX_DPR = 1.35;
export const DETAIL_MAX_DPR = 1.6;

export function isCompactMatchViewport(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return width < 700 || width / height < 0.78;
}
