import { Decision } from './types';

export const DECISIONS_STORAGE_KEY = 'tradeoff_decisions';

/**
 * Checks whether localStorage is available and writable in the current environment.
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__tradeoff_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads decisions from browser localStorage.
 * Returns an array of decisions or an empty array if not found or invalid.
 */
export function loadDecisionsFromStorage(): Decision[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DECISIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Failed to load decisions from localStorage:', error);
    return [];
  }
}

/**
 * Saves decisions array into localStorage as serialized JSON.
 * Throws an Error if storage is unavailable or quota is exceeded.
 */
export function saveDecisionsToStorage(decisions: Decision[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Local storage is not available in your browser environment.');
  }

  try {
    window.localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
  } catch (error: any) {
    console.error('Failed to save decisions to localStorage:', error);
    if (
      error &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014)
    ) {
      throw new Error('Storage quota exceeded. Please free up browser storage space to save new decisions.');
    }
    throw new Error('Could not persist to local storage. Storage access may be blocked or restricted.');
  }
}

/**
 * Pure factory function that creates a new Decision object with unique ID and ISO timestamp.
 * Does NOT perform any side effects or storage writes.
 */
export function createDecision(data: Omit<Decision, 'id' | 'createdAt'>): Decision {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `decision-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: data.title,
    optionA: data.optionA,
    optionB: data.optionB,
    chosenOption: data.chosenOption,
    reason: data.reason,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a new decision with unique ID and ISO timestamp.
 * Reads existing decisions from localStorage using getItem, parses the JSON string,
 * prepends the new decision, persists the updated array, and returns both.
 * Throws if saving to localStorage fails.
 */
export function createAndStoreDecision(
  data: Omit<Decision, 'id' | 'createdAt'>,
  existingDecisions?: Decision[]
): { newDecision: Decision; updatedDecisions: Decision[] } {
  // Read existing decisions: use provided array or read with getItem and parse string
  let currentList: Decision[] = [];

  if (existingDecisions !== undefined) {
    currentList = existingDecisions;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    const rawString = window.localStorage.getItem(DECISIONS_STORAGE_KEY);
    if (rawString !== null) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawString);
      } catch {
        throw new Error(
          'Your saved decisions could not be read. Nothing was overwritten. Back up your browser data before repairing it.'
        );
      }
      if (!Array.isArray(parsed)) {
        throw new Error(
          'Your saved decisions have an unexpected format. Nothing was overwritten. Back up your browser data before repairing it.'
        );
      }
      currentList = parsed;
    }
  }

  const newDecision = createDecision(data);
  const updatedDecisions = [newDecision, ...currentList];

  // Throws if localStorage write fails; will not falsely claim success
  saveDecisionsToStorage(updatedDecisions);

  return { newDecision, updatedDecisions };
}

/**
 * Clears stored decisions from localStorage.
 */
export function clearDecisionsFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Local storage is not available in your browser environment.');
  }

  try {
    window.localStorage.removeItem(DECISIONS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear decisions from localStorage:', error);
    throw error;
  }
}
