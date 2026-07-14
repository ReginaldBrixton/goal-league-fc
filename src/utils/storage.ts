import type { SavedGame } from '../types';

const KEY = 'goal-league-fc-save-v1';

const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;

export function saveGame(save: SavedGame): boolean {
  if (!hasLocalStorage) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): SavedGame | null {
  if (!hasLocalStorage) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGame;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (!hasLocalStorage) return false;
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function deleteSave(): void {
  if (!hasLocalStorage) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
