import type { Formation, FormationKey } from '../types';

export const FORMATIONS: Record<FormationKey, Formation> = {
  '4-4-2': { key: '4-4-2', name: '4-4-2', lines: { def: 4, mid: 4, fwd: 2 } },
  '4-3-3': { key: '4-3-3', name: '4-3-3', lines: { def: 4, mid: 3, fwd: 3 } },
  '3-5-2': { key: '3-5-2', name: '3-5-2', lines: { def: 3, mid: 5, fwd: 2 } },
  '5-3-2': { key: '5-3-2', name: '5-3-2', lines: { def: 5, mid: 3, fwd: 2 } },
};

export const FORMATION_LIST: Formation[] = Object.values(FORMATIONS);

// Returns normalized home positions (0..1) for the 10 outfield players + GK,
// arranged left-to-right within each line. x = depth from own goal (0) to
// opponent goal (1), y = 0 (left touchline) .. 1 (right touchline).
export function formationPositions(key: FormationKey): { x: number; y: number }[] {
  const f = FORMATIONS[key];
  const pos: { x: number; y: number }[] = [];
  // GK
  pos.push({ x: 0.05, y: 0.5 });
  const lineX: Record<'def' | 'mid' | 'fwd', number> = { def: 0.28, mid: 0.52, fwd: 0.78 };
  (['def', 'mid', 'fwd'] as const).forEach((line) => {
    const n = f.lines[line];
    for (let i = 0; i < n; i++) {
      const y = (i + 1) / (n + 1);
      pos.push({ x: lineX[line], y });
    }
  });
  return pos;
}
