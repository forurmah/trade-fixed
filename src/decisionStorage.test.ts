import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DECISIONS_STORAGE_KEY,
  getDecisionsFromStorage,
  loadDecisionsFromStorage,
  getRawStoredDecisions,
  saveDecisionsToStorage,
  createAndStoreDecision,
  updateAndStoreDecision,
  clearDecisionsFromStorage,
  isLocalStorageAvailable,
  getSafeLocalStorage,
} from './decisionStorage';
import type { Decision } from './types';

// Helper mock storage factory
function createMockStorage(initialData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initialData };
  return {
    store,
    getItem(key: string): string | null {
      return key in store ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      for (const k in store) {
        delete store[k];
      }
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
  };
}

const sampleValidDecision: Decision = {
  id: 'decision-123',
  title: 'Adopt TypeScript for backend',
  optionA: 'Node with TS',
  optionB: 'Pure JavaScript',
  chosenOption: 'A',
  reason: 'Type safety and compile-time verification minimize runtime bugs.',
  createdAt: new Date().toISOString(),
};

describe('Focused Storage Tests', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    // Default global window environment
    (global as any).window = {
      localStorage: mockStorage,
    };
  });

  // =========================================================================
  // 1. MALFORMED JSON TESTS
  // =========================================================================
  describe('Malformed JSON', () => {
    it('detects truncated/syntax-error JSON and returns loadError without throwing', () => {
      const corruptPayload = '{"id": "123", "title": "Incomplete';
      mockStorage.store[DECISIONS_STORAGE_KEY] = corruptPayload;

      const result = getDecisionsFromStorage();

      assert.equal(result.decisions.length, 0);
      assert.ok(result.loadError !== null, 'Expected loadError to be present');
      assert.match(
        result.loadError!,
        /unreadable or corrupted/i,
        'Expected error message to explain corruption'
      );
    });

    it('preserves the original malformed stored data on read failure', () => {
      const corruptPayload = '<<<BAD_JSON>>>';
      mockStorage.store[DECISIONS_STORAGE_KEY] = corruptPayload;

      getDecisionsFromStorage();
      assert.equal(
        mockStorage.getItem(DECISIONS_STORAGE_KEY),
        corruptPayload,
        'Original malformed data must not be erased by getDecisionsFromStorage'
      );

      const decisions = loadDecisionsFromStorage();
      assert.deepEqual(decisions, []);
      assert.equal(
        mockStorage.getItem(DECISIONS_STORAGE_KEY),
        corruptPayload,
        'Original malformed data must not be erased by loadDecisionsFromStorage'
      );
    });

    it('allows retrieving raw unparsed data without alteration via getRawStoredDecisions', () => {
      const malformed = '{"unexpected: broken token';
      mockStorage.store[DECISIONS_STORAGE_KEY] = malformed;

      const raw = getRawStoredDecisions();
      assert.equal(raw, malformed);
    });

    it('refuses to overwrite corrupted storage when adding a new decision, preserving data', () => {
      const corruptPayload = '{ broken: json [';
      mockStorage.store[DECISIONS_STORAGE_KEY] = corruptPayload;

      assert.throws(
        () => {
          createAndStoreDecision({
            title: 'Try Add',
            optionA: 'Option A',
            optionB: 'Option B',
            chosenOption: 'A',
            reason: 'Valid reason here',
          });
        },
        (error: any) => {
          assert.match(error.message, /could not be read/i);
          assert.match(error.message, /Original stored data was preserved/i);
          return true;
        }
      );

      // Verify original corrupted data was NOT overwritten
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), corruptPayload);
    });
  });

  // =========================================================================
  // 2. INVALID RECORDS TESTS
  // =========================================================================
  describe('Invalid Records', () => {
    it('returns loadError when stored JSON is not an array (e.g. object, number, boolean, string)', () => {
      const testCases = [
        JSON.stringify({ title: 'A single object, not array' }),
        JSON.stringify(42),
        JSON.stringify(true),
        JSON.stringify('a plain string'),
      ];

      for (const nonArrayJson of testCases) {
        mockStorage.store[DECISIONS_STORAGE_KEY] = nonArrayJson;

        const result = getDecisionsFromStorage();
        assert.equal(result.decisions.length, 0);
        assert.ok(result.loadError !== null);
        assert.match(result.loadError!, /unexpected format/i);
        // Original data preserved
        assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), nonArrayJson);
      }
    });

    it('rejects records missing required fields or having wrong types', () => {
      const invalidRecords = [
        // Missing id
        {
          title: 'T',
          optionA: 'A',
          optionB: 'B',
          chosenOption: 'A',
          reason: 'R',
          createdAt: new Date().toISOString(),
        },
        // Missing title
        {
          id: '1',
          optionA: 'A',
          optionB: 'B',
          chosenOption: 'A',
          reason: 'R',
          createdAt: new Date().toISOString(),
        },
        // Empty/whitespace title
        {
          id: '1',
          title: '   ',
          optionA: 'A',
          optionB: 'B',
          chosenOption: 'A',
          reason: 'R',
          createdAt: new Date().toISOString(),
        },
        // Invalid chosenOption ('C' instead of 'A' | 'B')
        {
          id: '1',
          title: 'T',
          optionA: 'A',
          optionB: 'B',
          chosenOption: 'C',
          reason: 'R',
          createdAt: new Date().toISOString(),
        },
        // Invalid date string
        {
          id: '1',
          title: 'T',
          optionA: 'A',
          optionB: 'B',
          chosenOption: 'A',
          reason: 'R',
          createdAt: 'not-a-valid-date',
        },
        // null or non-object item
        null,
        'string-item',
      ];

      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify(invalidRecords);

      const result = getDecisionsFromStorage();
      assert.equal(result.decisions.length, 0);
      assert.ok(result.loadError !== null);
      assert.match(result.loadError!, /failed validation/i);
      // Preserved
      assert.ok(mockStorage.getItem(DECISIONS_STORAGE_KEY) !== null);
    });

    it('handles mixed valid and invalid records gracefully while reporting invalid items', () => {
      const mixed = [
        sampleValidDecision,
        { id: 'bad-1', title: 'Missing required options' },
      ];
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify(mixed);

      const result = getDecisionsFromStorage();
      assert.equal(result.decisions.length, 1);
      assert.equal(result.decisions[0].id, sampleValidDecision.id);
      assert.ok(result.loadError !== null);
      assert.match(result.loadError!, /1 saved decision\(s\) couldn’t be loaded/i);
      assert.match(result.loadError!, /Original stored data was preserved/i);
    });

    it('saveDecisionsToStorage throws and prevents write if any record is invalid', () => {
      const originalPayload = JSON.stringify([sampleValidDecision]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      const badRecordList: any[] = [
        sampleValidDecision,
        { id: '2', title: '', optionA: 'A', optionB: 'B', chosenOption: 'A', reason: 'R' },
      ];

      assert.throws(
        () => saveDecisionsToStorage(badRecordList),
        (error: any) => {
          assert.match(error.message, /failed validation/i);
          assert.match(error.message, /Original stored data was preserved/i);
          return true;
        }
      );

      // Storage remains the original payload
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });

    it('createAndStoreDecision validates inputs before attempting to modify storage', () => {
      const originalPayload = JSON.stringify([sampleValidDecision]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      // Empty title input
      assert.throws(
        () =>
          createAndStoreDecision({
            title: '   ',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'A',
            reason: 'R',
          }),
        /Invalid decision input/i
      );

      // Invalid chosenOption
      assert.throws(
        () =>
          createAndStoreDecision({
            title: 'Valid title',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'Invalid' as any,
            reason: 'R',
          }),
        /Invalid decision input/i
      );

      // Storage remains intact
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });
  });

  // =========================================================================
  // 3. BLOCKED STORAGE TESTS
  // =========================================================================
  describe('Blocked Storage', () => {
    it('handles window.localStorage getter throwing SecurityError (e.g. privacy settings / sandbox)', () => {
      // Simulate access denied on window.localStorage getter
      const restrictedWindow = {
        get localStorage(): Storage {
          const err = new Error('SecurityError: The operation is insecure or blocked.');
          err.name = 'SecurityError';
          throw err;
        },
      };
      (global as any).window = restrictedWindow;

      // isLocalStorageAvailable must not crash, must return false
      assert.equal(isLocalStorageAvailable(), false);

      // getSafeLocalStorage must return null storage and the error
      const safe = getSafeLocalStorage();
      assert.equal(safe.storage, null);
      assert.ok(safe.error !== null);
      assert.equal(safe.error!.name, 'SecurityError');

      // getDecisionsFromStorage must return graceful error without throwing
      const result = getDecisionsFromStorage();
      assert.deepEqual(result.decisions, []);
      assert.ok(result.loadError !== null);
      assert.match(result.loadError!, /Original stored data was preserved/i);

      // loadDecisionsFromStorage returns empty array without throwing
      const loaded = loadDecisionsFromStorage();
      assert.deepEqual(loaded, []);

      // getRawStoredDecisions returns null safely without throwing
      const raw = getRawStoredDecisions();
      assert.equal(raw, null);

      // saveDecisionsToStorage throws descriptive error with preservation notice
      assert.throws(
        () => saveDecisionsToStorage([sampleValidDecision]),
        /Original stored data was preserved/i
      );

      // createAndStoreDecision throws descriptive error with preservation notice
      assert.throws(
        () =>
          createAndStoreDecision({
            title: 'Test Decision',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'A',
            reason: 'Valid reason',
          }),
        /Original stored data was preserved/i
      );

      // clearDecisionsFromStorage handles restriction gracefully by throwing descriptive error
      assert.throws(() => clearDecisionsFromStorage());
    });

    it('handles storage.getItem throwing DOMException or permission error', () => {
      const throwingGetStorage = {
        ...createMockStorage(),
        getItem() {
          const error = new Error('Storage read permission denied');
          error.name = 'SecurityError';
          throw error;
        },
      };
      (global as any).window = { localStorage: throwingGetStorage };

      const result = getDecisionsFromStorage();
      assert.deepEqual(result.decisions, []);
      assert.ok(result.loadError !== null);
      assert.match(result.loadError!, /permission error/i);
    });

    it('rolls back and preserves previous stored data when setItem throws QuotaExceededError', () => {
      const originalSaved = JSON.stringify([sampleValidDecision]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalSaved;

      let setItemAttemptCount = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);

      mockStorage.setItem = (k: string, v: string) => {
        setItemAttemptCount++;
        // First setItem attempt throws quota error
        if (setItemAttemptCount === 1) {
          const quotaErr = new Error('Quota exceeded');
          quotaErr.name = 'QuotaExceededError';
          (quotaErr as any).code = 22;
          throw quotaErr;
        }
        // Subsequent setItem calls (e.g. rollback) succeed
        originalSetItem(k, v);
      };

      assert.throws(
        () => {
          saveDecisionsToStorage([
            {
              ...sampleValidDecision,
              id: 'new-id-2',
              title: 'A new decision that triggers quota',
            },
          ]);
        },
        (err: any) => {
          assert.match(err.message, /Storage quota exceeded/i);
          assert.match(err.message, /Original stored data was preserved/i);
          return true;
        }
      );

      // Rollback must have restored originalSaved
      assert.equal(
        mockStorage.getItem(DECISIONS_STORAGE_KEY),
        originalSaved,
        'Original data must be restored on setItem failure'
      );
    });

    it('handles null/undefined window environment (SSR / non-browser)', () => {
      (global as any).window = undefined;

      assert.equal(isLocalStorageAvailable(), false);

      const safe = getSafeLocalStorage();
      assert.equal(safe.storage, null);
      assert.equal(safe.error, null);

      const result = getDecisionsFromStorage();
      assert.deepEqual(result.decisions, []);
      assert.equal(result.loadError, null);

      const raw = getRawStoredDecisions();
      assert.equal(raw, null);

      assert.throws(
        () => saveDecisionsToStorage([sampleValidDecision]),
        /Local storage is not available/i
      );
    });
  });

  // =========================================================================
  // 4. EDITING DECISIONS TESTS
  // =========================================================================
  describe('Editing Decisions', () => {
    it('updates the existing record by ID and strictly preserves its creation date', () => {
      const fixedCreatedAt = '2026-09-01T10:00:00.000Z';
      const initialRecord: Decision = {
        id: 'decision-edit-1',
        title: 'Original Title',
        optionA: 'Original A',
        optionB: 'Original B',
        chosenOption: 'A',
        reason: 'Original reason for choice',
        createdAt: fixedCreatedAt,
      };

      const otherRecord: Decision = {
        id: 'decision-other-2',
        title: 'Other Title',
        optionA: 'Option X',
        optionB: 'Option Y',
        chosenOption: 'B',
        reason: 'Other reason',
        createdAt: '2026-09-02T12:00:00.000Z',
      };

      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([initialRecord, otherRecord]);

      // Perform update on decision-edit-1
      const updatePayload = {
        title: 'Updated Decision Title',
        optionA: 'Updated Option A',
        optionB: 'Updated Option B',
        chosenOption: 'B' as const,
        reason: 'New and revised reason for choosing B',
      };

      const { updatedDecision, updatedDecisions } = updateAndStoreDecision(
        'decision-edit-1',
        updatePayload
      );

      // Verify updated record properties
      assert.equal(updatedDecision.id, 'decision-edit-1');
      assert.equal(updatedDecision.title, 'Updated Decision Title');
      assert.equal(updatedDecision.optionA, 'Updated Option A');
      assert.equal(updatedDecision.optionB, 'Updated Option B');
      assert.equal(updatedDecision.chosenOption, 'B');
      assert.equal(updatedDecision.reason, 'New and revised reason for choosing B');

      // CENTRAL REQUIREMENT: creation date is strictly preserved!
      assert.equal(
        updatedDecision.createdAt,
        fixedCreatedAt,
        'Creation date must be strictly preserved on edit'
      );

      // Verify storage was updated with the new record while preserving the other record
      const stored = JSON.parse(mockStorage.getItem(DECISIONS_STORAGE_KEY)!);
      assert.equal(stored.length, 2);
      const foundInStorage = stored.find((d: Decision) => d.id === 'decision-edit-1');
      assert.ok(foundInStorage);
      assert.equal(foundInStorage.title, 'Updated Decision Title');
      assert.equal(foundInStorage.createdAt, fixedCreatedAt);

      // Other record untouched
      const foundOther = stored.find((d: Decision) => d.id === 'decision-other-2');
      assert.ok(foundOther);
      assert.equal(foundOther.title, 'Other Title');
    });

    it('throws when updating a non-existent decision ID and preserves storage', () => {
      const initialRecord = { ...sampleValidDecision };
      const originalPayload = JSON.stringify([initialRecord]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      assert.throws(
        () =>
          updateAndStoreDecision('non-existent-id', {
            title: 'New Title',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'A',
            reason: 'Reason',
          }),
        (err: any) => {
          assert.match(err.message, /was not found/i);
          assert.match(err.message, /Original stored data was preserved/i);
          return true;
        }
      );

      // Storage untouched
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });

    it('rejects invalid inputs on edit and preserves storage', () => {
      const initialRecord = { ...sampleValidDecision };
      const originalPayload = JSON.stringify([initialRecord]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      // Empty title
      assert.throws(
        () =>
          updateAndStoreDecision(initialRecord.id, {
            title: '   ',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'A',
            reason: 'R',
          }),
        /Invalid decision input/i
      );

      // Invalid option selection
      assert.throws(
        () =>
          updateAndStoreDecision(initialRecord.id, {
            title: 'Valid title',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'InvalidOption' as any,
            reason: 'R',
          }),
        /Invalid decision input/i
      );

      // Storage remains original
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });

    it('rolls back and preserves storage if storage write fails during edit', () => {
      const initialRecord = { ...sampleValidDecision };
      const originalPayload = JSON.stringify([initialRecord]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      let callCount = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (k: string, v: string) => {
        callCount++;
        if (callCount === 1) {
          const quotaErr = new Error('Storage write failed (quota exceeded)');
          quotaErr.name = 'QuotaExceededError';
          (quotaErr as any).code = 22;
          throw quotaErr;
        }
        originalSetItem(k, v);
      };

      assert.throws(
        () =>
          updateAndStoreDecision(initialRecord.id, {
            title: 'New Title That Fails Save',
            optionA: 'A',
            optionB: 'B',
            chosenOption: 'B',
            reason: 'New reason',
          }),
        (err: any) => {
          assert.match(err.message, /Storage quota exceeded/i);
          assert.match(err.message, /Original stored data was preserved/i);
          return true;
        }
      );

      // Must roll back to original
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });
  });
});
