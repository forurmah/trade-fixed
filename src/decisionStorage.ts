import { Decision, Reflection } from './types';
import { isValidStoredDecision, validateStoredDecision } from './validation';

export { isValidStoredDecision, validateStoredDecision };

export const DECISIONS_STORAGE_KEY = 'tradeoff_decisions';

/**
 * Checks whether localStorage is available and writable in the current environment.
 * All storage access and probing are encapsulated in error handling.
 */
export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    const storage = window.localStorage;
    if (!storage) {
      return false;
    }
    const testKey = '__tradeoff_storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('Storage availability check failed:', error);
    return false;
  }
}

export interface StorageLoadResult {
  decisions: Decision[];
  loadError: string | null;
}

/**
 * Safely retrieves the browser's localStorage object inside error handling.
 * Prevents uncaught SecurityError / DOMException when storage access is denied.
 */
export function getSafeLocalStorage(): { storage: Storage | null; error: Error | null } {
  try {
    if (typeof window === 'undefined') {
      return { storage: null, error: null };
    }
    const storage = window.localStorage;
    if (!storage) {
      return {
        storage: null,
        error: new Error('Local storage is not supported or is disabled in your browser.'),
      };
    }
    return { storage, error: null };
  } catch (error: any) {
    console.error('Failed to access window.localStorage:', error);
    return {
      storage: null,
      error:
        error instanceof Error
          ? error
          : new Error('Browser storage access was blocked or denied due to security restrictions.'),
    };
  }
}

/**
 * Reads decisions from browser localStorage and validates their integrity.
 * All storage reads and JSON parsing are wrapped inside try-catch error handling.
 * Distinguishes between legitimate absence of data ("no saved decisions")
 * and error/corruption states ("saved decisions couldn’t be loaded").
 */
export function getDecisionsFromStorage(): StorageLoadResult {
  let raw: string | null = null;

  try {
    if (typeof window === 'undefined') {
      return { decisions: [], loadError: null };
    }

    const { storage, error: accessError } = getSafeLocalStorage();
    if (accessError || !storage) {
      return {
        decisions: [],
        loadError: accessError
          ? `${accessError.message} Original stored data was preserved.`
          : 'Saved decisions couldn’t be loaded because local storage is not supported or is disabled.',
      };
    }

    try {
      raw = storage.getItem(DECISIONS_STORAGE_KEY);
    } catch (storageError) {
      console.error('Failed to read from localStorage:', storageError);
      return {
        decisions: [],
        loadError: 'Saved decisions couldn’t be loaded due to a browser storage permission error. Original stored data was preserved.',
      };
    }
  } catch (unexpectedError) {
    console.error('Unexpected error while accessing localStorage:', unexpectedError);
    return {
      decisions: [],
      loadError: 'Saved decisions couldn’t be loaded due to an unexpected storage access error. Original stored data was preserved.',
    };
  }

  // Legitimate empty state: key is null or empty string
  if (raw === null || raw.trim() === '') {
    return { decisions: [], loadError: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse decisions from localStorage:', error);
    return {
      decisions: [],
      loadError: 'Saved decisions couldn’t be loaded because the stored data is unreadable or corrupted. Original stored data was preserved.',
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      decisions: [],
      loadError: 'Saved decisions couldn’t be loaded because the stored data has an unexpected format. Original stored data was preserved.',
    };
  }

  // Legitimate empty array: user has 0 saved decisions
  if (parsed.length === 0) {
    return { decisions: [], loadError: null };
  }

  // Validate each stored decision's required fields, chosen option, and date
  const validDecisions: Decision[] = [];
  let invalidCount = 0;

  for (const item of parsed) {
    if (isValidStoredDecision(item)) {
      validDecisions.push(item);
    } else {
      invalidCount++;
    }
  }

  if (invalidCount > 0 && validDecisions.length === 0) {
    return {
      decisions: [],
      loadError: 'Saved decisions couldn’t be loaded because the stored records failed validation. Original stored data was preserved.',
    };
  }

  if (invalidCount > 0) {
    return {
      decisions: validDecisions,
      loadError: `${invalidCount} saved decision(s) couldn’t be loaded because their format was invalid. Original stored data was preserved.`,
    };
  }

  return { decisions: validDecisions, loadError: null };
}

/**
 * Loads decisions from browser localStorage.
 * Returns an array of decisions or an empty array if not found or invalid.
 * Never modifies or erases stored data on read failure.
 */
export function loadDecisionsFromStorage(): Decision[] {
  try {
    return getDecisionsFromStorage().decisions;
  } catch (error) {
    console.error('loadDecisionsFromStorage caught error:', error);
    return [];
  }
}

/**
 * Returns raw unparsed stored string from localStorage without modifying it.
 * Entire operation is encapsulated inside error handling.
 */
export function getRawStoredDecisions(): string | null {
  try {
    const { storage } = getSafeLocalStorage();
    if (!storage) {
      return null;
    }
    return storage.getItem(DECISIONS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to read raw stored decisions:', error);
    return null;
  }
}

/**
 * Saves decisions array into localStorage as serialized JSON.
 * Validates each decision's required fields, chosen option, and date before writing.
 * All storage operations and rollbacks are protected with error handling.
 * Preserves the original stored data if an error occurs during validation or writing.
 * Throws an Error if storage is unavailable or quota is exceeded.
 */
export function saveDecisionsToStorage(decisions: Decision[]): void {
  const { storage, error: accessError } = getSafeLocalStorage();
  if (accessError || !storage) {
    throw new Error(
      accessError
        ? `${accessError.message} Original stored data was preserved.`
        : 'Local storage is not available in your browser environment. Original stored data was preserved.'
    );
  }

  // Preserve original stored data before any write attempt
  let originalStoredData: string | null = null;
  let hasReadOriginal = false;
  try {
    originalStoredData = storage.getItem(DECISIONS_STORAGE_KEY);
    hasReadOriginal = true;
  } catch (readErr) {
    console.warn('Could not read existing storage before saving:', readErr);
  }

  // Validate each decision to guarantee valid data structure before writing
  if (!Array.isArray(decisions) || !decisions.every(isValidStoredDecision)) {
    throw new Error(
      'Cannot save decisions: one or more records failed validation of required fields, chosen option, or date. Original stored data was preserved.'
    );
  }

  try {
    storage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
  } catch (error: any) {
    // PRESERVE ORIGINAL STORED DATA ON FAILURE:
    // If writing fails for any reason (e.g. QuotaExceededError), roll back to original data
    if (hasReadOriginal) {
      try {
        if (originalStoredData !== null) {
          storage.setItem(DECISIONS_STORAGE_KEY, originalStoredData);
        } else {
          storage.removeItem(DECISIONS_STORAGE_KEY);
        }
      } catch (rollbackError) {
        console.error('Rollback of stored data failed:', rollbackError);
      }
    }

    console.error('Failed to save decisions to localStorage:', error);
    if (
      error &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014)
    ) {
      throw new Error('Storage quota exceeded. Please free up browser storage space. Original stored data was preserved.');
    }
    throw new Error('Could not persist to local storage. Storage access may be blocked or restricted. Original stored data was preserved.');
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
 * Reads existing decisions from localStorage inside error handling,
 * prepends the new decision, persists the updated array, and returns both.
 * Throws if saving to localStorage fails.
 */
export function createAndStoreDecision(
  data: Omit<Decision, 'id' | 'createdAt'>,
  existingDecisions?: Decision[]
): { newDecision: Decision; updatedDecisions: Decision[] } {
  // Validate incoming decision inputs first so failure doesn't touch storage
  if (
    !data ||
    typeof data.title !== 'string' ||
    !data.title.trim() ||
    typeof data.optionA !== 'string' ||
    !data.optionA.trim() ||
    typeof data.optionB !== 'string' ||
    !data.optionB.trim() ||
    (data.chosenOption !== 'A' && data.chosenOption !== 'B') ||
    typeof data.reason !== 'string' ||
    !data.reason.trim()
  ) {
    throw new Error('Invalid decision input. Original stored data was preserved.');
  }

  // Read existing decisions: use provided array or read with getItem inside error handling
  let currentList: Decision[] = [];

  if (existingDecisions !== undefined) {
    if (!Array.isArray(existingDecisions) || !existingDecisions.every(isValidStoredDecision)) {
      throw new Error(
        'Your saved decisions have an unexpected format. Original stored data was preserved. Nothing was overwritten.'
      );
    }
    // Also protect existing localStorage data: verify it is valid before overwriting
    try {
      const { storage } = getSafeLocalStorage();
      if (storage) {
        let rawString: string | null = null;
        try {
          rawString = storage.getItem(DECISIONS_STORAGE_KEY);
        } catch {
          // storage read error handled
        }
        if (rawString !== null && rawString.trim() !== '') {
          try {
            const parsed = JSON.parse(rawString);
            if (!Array.isArray(parsed) || !parsed.every(isValidStoredDecision)) {
              throw new Error(
                'Your saved decisions have an unexpected format. Original stored data was preserved. Nothing was overwritten. Back up your browser data before repairing it.'
              );
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes('Original stored data was preserved')) {
              throw e;
            }
            throw new Error(
              'Your saved decisions could not be read. Original stored data was preserved. Nothing was overwritten. Back up your browser data before repairing it.'
            );
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Original stored data was preserved')) {
        throw err;
      }
      // Non-fatal if storage could not be probed here; saveDecisionsToStorage will handle it
    }
    currentList = existingDecisions;
  } else {
    // Read from localStorage inside error handling
    const { storage, error: accessError } = getSafeLocalStorage();
    if (accessError || !storage) {
      throw new Error(
        accessError
          ? `${accessError.message} Original stored data was preserved.`
          : 'Local storage is not available in your browser environment. Original stored data was preserved.'
      );
    }

    let rawString: string | null = null;
    try {
      rawString = storage.getItem(DECISIONS_STORAGE_KEY);
    } catch (readErr) {
      console.error('Failed to read decisions from storage:', readErr);
      throw new Error(
        'Your saved decisions could not be read due to a storage error. Original stored data was preserved. Nothing was overwritten.'
      );
    }

    if (rawString !== null && rawString.trim() !== '') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawString);
      } catch {
        throw new Error(
          'Your saved decisions could not be read. Original stored data was preserved. Nothing was overwritten. Back up your browser data before repairing it.'
        );
      }
      if (!Array.isArray(parsed) || !parsed.every(isValidStoredDecision)) {
        throw new Error(
          'Your saved decisions have an unexpected format. Original stored data was preserved. Nothing was overwritten. Back up your browser data before repairing it.'
        );
      }
      currentList = parsed;
    }
  }

  const newDecision = createDecision(data);
  const updatedDecisions = [newDecision, ...currentList];

  // Throws if localStorage write fails; rolls back and preserves original data
  saveDecisionsToStorage(updatedDecisions);

  return { newDecision, updatedDecisions };
}

/**
 * Updates an existing decision record by ID in localStorage.
 * Central requirements:
 * 1. Updates the existing record by ID.
 * 2. Preserves its creation date (createdAt) strictly unchanged.
 * 3. Throws if saving to localStorage fails so caller updates screen ONLY after saving succeeds.
 * Preserves the original stored data if an error occurs.
 */
export function updateAndStoreDecision(
  id: string,
  updates: Omit<Decision, 'id' | 'createdAt'>
): { updatedDecision: Decision; updatedDecisions: Decision[] } {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid decision ID. Original stored data was preserved.');
  }

  // Validate incoming decision inputs first so failure doesn't touch storage
  if (
    !updates ||
    typeof updates.title !== 'string' ||
    !updates.title.trim() ||
    typeof updates.optionA !== 'string' ||
    !updates.optionA.trim() ||
    typeof updates.optionB !== 'string' ||
    !updates.optionB.trim() ||
    (updates.chosenOption !== 'A' && updates.chosenOption !== 'B') ||
    typeof updates.reason !== 'string' ||
    !updates.reason.trim()
  ) {
    throw new Error('Invalid decision input. Original stored data was preserved.');
  }

  // Read existing decisions directly from storage inside error handling
  const { decisions, loadError } = getDecisionsFromStorage();
  if (loadError && decisions.length === 0) {
    throw new Error(`Cannot update decision: ${loadError}`);
  }

  const existingIndex = decisions.findIndex((d) => d.id === id);
  if (existingIndex === -1) {
    throw new Error(`Decision with ID "${id}" was not found. Original stored data was preserved.`);
  }

  const existingRecord = decisions[existingIndex];

  // CENTRAL REQUIREMENT: Update the existing record by ID and strictly PRESERVE its creation date
  const updatedDecision: Decision = {
    id: existingRecord.id,
    createdAt: existingRecord.createdAt, // STRICTLY PRESERVED
    title: updates.title.trim(),
    optionA: updates.optionA.trim(),
    optionB: updates.optionB.trim(),
    chosenOption: updates.chosenOption,
    reason: updates.reason.trim(),
    ...(updates.reflection !== undefined
      ? { reflection: updates.reflection }
      : existingRecord.reflection
      ? { reflection: existingRecord.reflection }
      : {}),
  };

  const updatedDecisions = [...decisions];
  updatedDecisions[existingIndex] = updatedDecision;

  // Persist to storage inside error handling; throws and rolls back if write fails
  saveDecisionsToStorage(updatedDecisions);

  return { updatedDecision, updatedDecisions };
}

/**
 * Saves or updates a reflection on an existing decision record in localStorage.
 * Central requirements:
 * 1. Finds the decision by ID.
 * 2. Validates reflection fields (outcome, whatWouldChange, and status are required).
 * 3. Preserves all other decision fields (id, title, optionA, optionB, chosenOption, reason, createdAt).
 * 4. Persists the updated decisions array to localStorage first.
 * 5. Returns { updatedDecision, updatedDecisions }.
 * Throws if validation or saving to localStorage fails so caller updates screen ONLY after saving succeeds.
 */
export function saveReflectionToDecision(
  id: string,
  reflection: Reflection
): { updatedDecision: Decision; updatedDecisions: Decision[] } {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid decision ID. Original stored data was preserved.');
  }

  // Validate incoming reflection inputs
  if (
    !reflection ||
    typeof reflection.outcome !== 'string' ||
    !reflection.outcome.trim() ||
    typeof reflection.whatWouldChange !== 'string' ||
    !reflection.whatWouldChange.trim()
  ) {
    throw new Error('Invalid reflection input. Outcome and changes are required. Original stored data was preserved.');
  }

  if (
    reflection.status !== 'pending' &&
    reflection.status !== 'resolved'
  ) {
    throw new Error("Invalid reflection status. Must be 'pending' or 'resolved'. Original stored data was preserved.");
  }

  // Read existing decisions directly from storage inside error handling
  const { decisions, loadError } = getDecisionsFromStorage();
  if (loadError && decisions.length === 0) {
    throw new Error(`Cannot save reflection: ${loadError}`);
  }

  const existingIndex = decisions.findIndex((d) => d.id === id);
  if (existingIndex === -1) {
    throw new Error(`Decision with ID "${id}" was not found. Original stored data was preserved.`);
  }

  const existingRecord = decisions[existingIndex];

  const updatedReflection: Reflection = {
    outcome: reflection.outcome.trim(),
    whatWouldChange: reflection.whatWouldChange.trim(),
    status: reflection.status,
  };

  const updatedDecision: Decision = {
    ...existingRecord,
    reflection: updatedReflection,
  };

  const updatedDecisions = [...decisions];
  updatedDecisions[existingIndex] = updatedDecision;

  // Persist to storage inside error handling; throws and rolls back if write fails
  saveDecisionsToStorage(updatedDecisions);

  return { updatedDecision, updatedDecisions };
}

/**
 * Deletes a single decision by ID from localStorage.
 * Central requirements:
 * 1. Reads the latest stored decisions before modifying storage.
 * 2. If loading reports any error (corruption, unreadable format, invalid records),
 *    blocks deletion and preserves the original raw stored data without overwriting.
 * 3. If the selected ID is missing, throws an error rather than reporting success.
 * 4. Deletes only the selected decision by ID, preserving all other records.
 * 5. Does NOT use clearAllDecisions (or storage.removeItem) to delete one record.
 * 6. Persists the updated array (which may be [] if deleting the final record) before returning.
 * 7. If saving fails (e.g. QuotaExceededError or write error), throws and rolls back to preserve stored data.
 */
export function deleteAndStoreDecision(id: string): { deletedId: string; updatedDecisions: Decision[] } {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid decision ID. Original stored data was preserved.');
  }

  // 1. Read latest stored decisions directly from storage inside error handling
  const { decisions, loadError } = getDecisionsFromStorage();

  // 2. If loading reports ANY error (corruption, unexpected format, invalid records),
  // block deletion and preserve the original raw stored data untouched
  if (loadError) {
    throw new Error(`Cannot delete decision: ${loadError}`);
  }

  // 3. Check if the selected ID exists
  const existingIndex = decisions.findIndex((d) => d.id === id);
  if (existingIndex === -1) {
    throw new Error(`Decision with ID "${id}" was not found. Original stored data was preserved.`);
  }

  // 4. Delete only the selected decision by ID, leaving all other records untouched
  const updatedDecisions = decisions.filter((d) => d.id !== id);

  // 5. Persist the deletion to storage (using saveDecisionsToStorage, NOT clearAllDecisions)
  // Even if updatedDecisions is empty (final record), saveDecisionsToStorage saves '[]'
  saveDecisionsToStorage(updatedDecisions);

  return { deletedId: id, updatedDecisions };
}

/**
 * Clears stored decisions from localStorage.
 * Storage removal is placed inside error handling.
 */
export function clearDecisionsFromStorage(): void {
  try {
    const { storage, error: accessError } = getSafeLocalStorage();
    if (accessError || !storage) {
      throw new Error(
        accessError
          ? accessError.message
          : 'Local storage is not available in your browser environment.'
      );
    }

    storage.removeItem(DECISIONS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear decisions from localStorage:', error);
    throw error;
  }
}

