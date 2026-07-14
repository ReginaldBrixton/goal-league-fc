export type MatchDifficulty = 'rookie' | 'professional' | 'legend';
export type MatchCamera = 'broadcast' | 'dynamic' | 'tactical';
export type MatchGraphics = 'battery' | 'balanced' | 'ultra';

export interface MatchSettings {
  difficulty: MatchDifficulty;
  duration: 30 | 45 | 60;
  camera: MatchCamera;
  graphics: MatchGraphics;
}

export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  difficulty: 'professional',
  duration: 45,
  camera: 'broadcast',
  graphics: 'balanced',
};

export function matchSettingsKey(fixtureId: string): string {
  return `glfc:match-settings:${fixtureId}`;
}

export function readMatchSettings(fixtureId: string): MatchSettings {
  if (typeof window === 'undefined') return DEFAULT_MATCH_SETTINGS;
  try {
    const raw = window.sessionStorage.getItem(matchSettingsKey(fixtureId));
    if (!raw) return DEFAULT_MATCH_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MatchSettings>;
    return {
      difficulty: parsed.difficulty === 'rookie' || parsed.difficulty === 'legend' ? parsed.difficulty : 'professional',
      duration: parsed.duration === 30 || parsed.duration === 60 ? parsed.duration : 45,
      camera: parsed.camera === 'dynamic' || parsed.camera === 'tactical' ? parsed.camera : 'broadcast',
      graphics: parsed.graphics === 'battery' || parsed.graphics === 'ultra' ? parsed.graphics : 'balanced',
    };
  } catch {
    return DEFAULT_MATCH_SETTINGS;
  }
}

export function writeMatchSettings(fixtureId: string, settings: MatchSettings): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(matchSettingsKey(fixtureId), JSON.stringify(settings));
}
