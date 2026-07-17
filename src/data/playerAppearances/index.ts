import { createFallbackAppearance } from './factory';
import type { PlayerAppearance } from './types';
import { appearances001_015 } from './players/players001_015';
import { appearances016_030 } from './players/players016_030';
import { appearances031_045 } from './players/players031_045';
import { appearances046_060 } from './players/players046_060';
import { appearances061_075 } from './players/players061_075';
import { appearances076_090 } from './players/players076_090';
import { appearances091_105 } from './players/players091_105';
import { appearances106_120 } from './players/players106_120';
import { appearances121_135 } from './players/players121_135';
import { appearances136_150 } from './players/players136_150';
import { appearances151_165 } from './players/players151_165';
import { appearances166_180 } from './players/players166_180';
import { appearances181_195 } from './players/players181_195';
import { appearances196_210 } from './players/players196_210';
import { appearances211_225 } from './players/players211_225';
import { appearances226_232 } from './players/players226_232';

export const PLAYER_APPEARANCE_COUNT = 232;

export const playerAppearances: Record<string, PlayerAppearance> = {
  ...appearances001_015,
  ...appearances016_030,
  ...appearances031_045,
  ...appearances046_060,
  ...appearances061_075,
  ...appearances076_090,
  ...appearances091_105,
  ...appearances106_120,
  ...appearances121_135,
  ...appearances136_150,
  ...appearances151_165,
  ...appearances166_180,
  ...appearances181_195,
  ...appearances196_210,
  ...appearances211_225,
  ...appearances226_232,
};

const fallbackCache = new Map<string, PlayerAppearance>();

export function getPlayerAppearance(playerId: string): PlayerAppearance {
  const registered = playerAppearances[playerId];
  if (registered) return registered;
  const cached = fallbackCache.get(playerId);
  if (cached) return cached;
  const fallback = createFallbackAppearance(playerId);
  fallbackCache.set(playerId, fallback);
  return fallback;
}

export type { PlayerAppearance } from './types';
