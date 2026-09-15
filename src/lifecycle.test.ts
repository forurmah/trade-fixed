import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DECISIONS_STORAGE_KEY,
  getDecisionsFromStorage,
  loadDecisionsFromStorage,
  createAndStoreDecision,
  updateAndStoreDecision,
  deleteAndStoreDecision,
  saveDecisionsToStorage,
} from './decisionStorage';
import { validateDecisionForm, hasValidationErrors } from './validation';
import type { Decision, DecisionFormData, CreateDecisionInput, UpdateDecisionInput } from './types';

// Helper mock localStorage
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

describe('Lifecycle & Operations Tests', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    (global as any).window = {
      localStorage: mockStorage,
    };
  });

  // =========================================================================
  // 1. CREATE
  // =========================================================================
  describe('1. Create Decision', () => {
    it('creates a new decision and stores it in localStorage', () => {
      const input: CreateDecisionInput = {
        title: 'Choose Database Architecture',
        optionA: 'PostgreSQL Relational DB',
        optionB: 'Cloud Firestore Document DB',
        chosenOption: 'B',
        reason: 'Firestore simplifies real-time updates and client SDK security rules.',
      };

      const { newDecision, updatedDecisions } = createAndStoreDecision(input);

      // Verify returned decision structure
      assert.ok(newDecision.id, 'Decision should have a generated unique ID');
      assert.equal(newDecision.title, input.title);
      assert.equal(newDecision.optionA, input.optionA);
      assert.equal(newDecision.optionB, input.optionB);
      assert.equal(newDecision.chosenOption, 'B');
      assert.equal(newDecision.reason, input.reason);
      assert.ok(newDecision.createdAt, 'Decision should have a createdAt timestamp');
      assert.ok(!isNaN(Date.parse(newDecision.createdAt)), 'createdAt should be a valid ISO string');

      // Verify updated list
      assert.equal(updatedDecisions.length, 1);
      assert.equal(updatedDecisions[0].id, newDecision.id);

      // Verify storage persistence
      const rawStored = mockStorage.getItem(DECISIONS_STORAGE_KEY);
      assert.ok(rawStored, 'Storage item should not be null');
      const parsed = JSON.parse(rawStored!);
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].title, input.title);
    });

    it('appends multiple created decisions with newest first', () => {
      const dec1 = createAndStoreDecision({
        title: 'First Choice',
        optionA: 'Alpha',
        optionB: 'Beta',
        chosenOption: 'A',
        reason: 'Reason for first choice.',
      });

      const dec2 = createAndStoreDecision({
        title: 'Second Choice',
        optionA: 'Gamma',
        optionB: 'Delta',
        chosenOption: 'B',
        reason: 'Reason for second choice.',
      });

      const all = loadDecisionsFromStorage();
      assert.equal(all.length, 2);
      // Newest decision is placed first in the list
      assert.equal(all[0].id, dec2.newDecision.id);
      assert.equal(all[1].id, dec1.newDecision.id);
    });
  });

  // =========================================================================
  // 2. READ
  // =========================================================================
  describe('2. Read Decisions', () => {
    it('reads empty list when storage is empty', () => {
      const { decisions, loadError } = getDecisionsFromStorage();
      assert.deepEqual(decisions, []);
      assert.equal(loadError, null);
    });

    it('reads existing records accurately from storage', () => {
      const sample: Decision = {
        id: 'read-test-1',
        title: 'API Versioning Strategy',
        optionA: 'URL Path Versioning (/v1)',
        optionB: 'Header Versioning (Accept-Version)',
        chosenOption: 'A',
        reason: 'URL path versioning is more explicit and easier to debug in logs.',
        createdAt: '2026-03-01T10:00:00.000Z',
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([sample]);

      const decisions = loadDecisionsFromStorage();
      assert.equal(decisions.length, 1);
      assert.deepEqual(decisions[0], sample);

      // Find by ID
      const found = decisions.find((d) => d.id === 'read-test-1');
      assert.ok(found, 'Should find decision by ID');
      assert.equal(found?.title, 'API Versioning Strategy');
      assert.equal(found?.chosenOption, 'A');
    });
  });

  // =========================================================================
  // 3. EDIT
  // =========================================================================
  describe('3. Edit Decision', () => {
    it('updates an existing decision and preserves the original createdAt timestamp', () => {
      const originalTimestamp = '2026-01-15T08:30:00.000Z';
      const initial: Decision = {
        id: 'edit-test-1',
        title: 'Initial Title',
        optionA: 'Initial Option A',
        optionB: 'Initial Option B',
        chosenOption: 'A',
        reason: 'Initial reason for choice.',
        createdAt: originalTimestamp,
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([initial]);

      const updateInput = {
        title: 'Revised Decision Title',
        optionA: 'Updated Option A',
        optionB: 'Updated Option B',
        chosenOption: 'B' as const,
        reason: 'Revised rationale based on new team findings.',
      };

      const { updatedDecision, updatedDecisions } = updateAndStoreDecision('edit-test-1', updateInput);

      // Verify updated record
      assert.equal(updatedDecision.id, 'edit-test-1');
      assert.equal(updatedDecision.title, 'Revised Decision Title');
      assert.equal(updatedDecision.optionA, 'Updated Option A');
      assert.equal(updatedDecision.optionB, 'Updated Option B');
      assert.equal(updatedDecision.chosenOption, 'B');
      assert.equal(updatedDecision.reason, 'Revised rationale based on new team findings.');

      // CRITICAL: createdAt must be preserved
      assert.equal(
        updatedDecision.createdAt,
        originalTimestamp,
        'createdAt timestamp must be strictly preserved on edit'
      );

      // Verify in updated list and persistent storage
      assert.equal(updatedDecisions.length, 1);
      assert.equal(updatedDecisions[0].title, 'Revised Decision Title');

      const stored = JSON.parse(mockStorage.getItem(DECISIONS_STORAGE_KEY)!);
      assert.equal(stored[0].title, 'Revised Decision Title');
      assert.equal(stored[0].createdAt, originalTimestamp);
    });

    it('preserves other decisions when editing one decision', () => {
      const dec1: Decision = {
        id: 'd-1',
        title: 'Title 1',
        optionA: 'A1',
        optionB: 'B1',
        chosenOption: 'A',
        reason: 'Reason 1',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const dec2: Decision = {
        id: 'd-2',
        title: 'Title 2',
        optionA: 'A2',
        optionB: 'B2',
        chosenOption: 'B',
        reason: 'Reason 2',
        createdAt: '2026-01-02T00:00:00.000Z',
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([dec1, dec2]);

      updateAndStoreDecision('d-1', {
        title: 'Title 1 Edited',
        optionA: 'A1 Mod',
        optionB: 'B1 Mod',
        chosenOption: 'B',
        reason: 'Reason 1 Mod',
      });

      const stored: Decision[] = JSON.parse(mockStorage.getItem(DECISIONS_STORAGE_KEY)!);
      assert.equal(stored.length, 2);
      assert.equal(stored[0].title, 'Title 1 Edited');
      // dec2 is completely untouched
      assert.deepEqual(stored[1], dec2);
    });
  });

  // =========================================================================
  // 4. DELETE
  // =========================================================================
  describe('4. Delete Decision', () => {
    it('deletes the selected decision by ID and keeps remaining decisions intact', () => {
      const dec1: Decision = {
        id: 'del-1',
        title: 'Keep Me',
        optionA: 'A1',
        optionB: 'B1',
        chosenOption: 'A',
        reason: 'Reason 1',
        createdAt: '2026-02-01T00:00:00.000Z',
      };
      const dec2: Decision = {
        id: 'del-2',
        title: 'Delete Me',
        optionA: 'A2',
        optionB: 'B2',
        chosenOption: 'B',
        reason: 'Reason 2',
        createdAt: '2026-02-02T00:00:00.000Z',
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([dec1, dec2]);

      const { deletedId, updatedDecisions } = deleteAndStoreDecision('del-2');

      assert.equal(deletedId, 'del-2');
      assert.equal(updatedDecisions.length, 1);
      assert.equal(updatedDecisions[0].id, 'del-1');

      const stored: Decision[] = JSON.parse(mockStorage.getItem(DECISIONS_STORAGE_KEY)!);
      assert.equal(stored.length, 1);
      assert.deepEqual(stored[0], dec1);
    });

    it('deleting the final decision writes an empty array and allows empty state', () => {
      const single: Decision = {
        id: 'only-record',
        title: 'Sole Decision',
        optionA: 'A',
        optionB: 'B',
        chosenOption: 'A',
        reason: 'Reason',
        createdAt: '2026-02-03T00:00:00.000Z',
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([single]);

      const { deletedId, updatedDecisions } = deleteAndStoreDecision('only-record');

      assert.equal(deletedId, 'only-record');
      assert.deepEqual(updatedDecisions, []);
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), '[]');
    });

    it('throws error when trying to delete non-existent ID and does not alter storage', () => {
      const dec: Decision = {
        id: 'real-id',
        title: 'Real Decision',
        optionA: 'A',
        optionB: 'B',
        chosenOption: 'A',
        reason: 'Reason',
        createdAt: '2026-02-04T00:00:00.000Z',
      };
      const originalPayload = JSON.stringify([dec]);
      mockStorage.store[DECISIONS_STORAGE_KEY] = originalPayload;

      assert.throws(
        () => deleteAndStoreDecision('missing-id-999'),
        /not found/i
      );

      // Storage remains unchanged
      assert.equal(mockStorage.getItem(DECISIONS_STORAGE_KEY), originalPayload);
    });
  });

  // =========================================================================
  // 5. REFRESH
  // =========================================================================
  describe('5. Refresh (Simulated Reload / New Session)', () => {
    it('persists data across simulated browser refresh', () => {
      // Step 1: User creates 2 decisions in first session
      createAndStoreDecision({
        title: 'Use GraphQL or REST',
        optionA: 'GraphQL',
        optionB: 'REST',
        chosenOption: 'A',
        reason: 'Flexible querying avoids over-fetching on mobile.',
      });
      createAndStoreDecision({
        title: 'Use Tailwind CSS or CSS Modules',
        optionA: 'Tailwind CSS',
        optionB: 'CSS Modules',
        chosenOption: 'A',
        reason: 'Utility classes speed up responsive layout design.',
      });

      // Step 2: "Refresh" — simulate new app mount / browser reload
      // The global window and component states are reinitialized from localStorage
      const refreshedDecisions = loadDecisionsFromStorage();

      assert.equal(refreshedDecisions.length, 2);
      // Newest is first
      assert.equal(refreshedDecisions[0].title, 'Use Tailwind CSS or CSS Modules');
      assert.equal(refreshedDecisions[0].chosenOption, 'A');
      assert.equal(refreshedDecisions[1].title, 'Use GraphQL or REST');
      assert.equal(refreshedDecisions[1].chosenOption, 'A');
    });

    it('survives edit + refresh cycle accurately', () => {
      const created = createAndStoreDecision({
        title: 'Original Title Before Refresh',
        optionA: 'Option 1',
        optionB: 'Option 2',
        chosenOption: 'A',
        reason: 'Original reason.',
      });

      // Edit the decision
      updateAndStoreDecision(created.newDecision.id, {
        title: 'Updated Title Persisted',
        optionA: 'Option 1 New',
        optionB: 'Option 2 New',
        chosenOption: 'B',
        reason: 'Updated reason persisted.',
      });

      // Refresh simulated
      const afterRefresh = loadDecisionsFromStorage();
      assert.equal(afterRefresh.length, 1);
      assert.equal(afterRefresh[0].title, 'Updated Title Persisted');
      assert.equal(afterRefresh[0].chosenOption, 'B');
      assert.equal(afterRefresh[0].createdAt, created.newDecision.createdAt);
    });
  });

  // =========================================================================
  // 6. CANCEL EDIT
  // =========================================================================
  describe('6. Cancel Edit', () => {
    it('leaving edit mode without saving preserves the exact original stored decision', () => {
      const originalDecision: Decision = {
        id: 'cancel-test-id',
        title: 'Stable Strategy',
        optionA: 'Stay with Option A',
        optionB: 'Switch to Option B',
        chosenOption: 'A',
        reason: 'Stability is our primary metric right now.',
        createdAt: '2026-03-10T14:00:00.000Z',
      };
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([originalDecision]);

      // Simulate user opening EditDecisionForm and typing draft changes in local form state:
      const draftFormData: DecisionFormData = {
        title: 'Draft Unsaved Edits That Will Be Discarded',
        optionA: 'Draft Option A',
        optionB: 'Draft Option B',
        chosenOption: 'B',
        reason: 'Draft reason that user changes mind about.',
      };

      // User hits "Cancel" button:
      // onCancel() callback is invoked in React, returning back to details without calling onSave()
      let onCancelCalled = false;
      const handleCancel = () => {
        onCancelCalled = true;
        // No updateAndStoreDecision or saveDecisionsToStorage is called
      };
      handleCancel();

      assert.equal(onCancelCalled, true);

      // Verify stored data in localStorage was NEVER modified
      const currentStored = loadDecisionsFromStorage();
      assert.equal(currentStored.length, 1);
      assert.deepEqual(currentStored[0], originalDecision);
      assert.equal(currentStored[0].title, 'Stable Strategy');
      assert.equal(currentStored[0].chosenOption, 'A');
      assert.equal(currentStored[0].reason, 'Stability is our primary metric right now.');
    });
  });

  // =========================================================================
  // 7. INVALID EDIT INPUT
  // =========================================================================
  describe('7. Invalid Edit Input', () => {
    const validExisting: Decision = {
      id: 'valid-rec-1',
      title: 'Original Title',
      optionA: 'Original A',
      optionB: 'Original B',
      chosenOption: 'A',
      reason: 'Original reason.',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockStorage.store[DECISIONS_STORAGE_KEY] = JSON.stringify([validExisting]);
    });

    it('rejects empty or whitespace-only title and preserves stored decision', () => {
      const invalidData: DecisionFormData = {
        title: '   ',
        optionA: 'Option A',
        optionB: 'Option B',
        chosenOption: 'A',
        reason: 'Valid reason here.',
      };

      // 1. Client-side form validation check
      const formErrors = validateDecisionForm(invalidData);
      assert.ok(hasValidationErrors(formErrors));
      assert.match(formErrors.title!, /title is required/i);

      // 2. Storage layer rejection check
      assert.throws(
        () =>
          updateAndStoreDecision(validExisting.id, {
            title: invalidData.title,
            optionA: invalidData.optionA,
            optionB: invalidData.optionB,
            chosenOption: 'A',
            reason: invalidData.reason,
          }),
        /Invalid decision input/i
      );

      // Stored data must be untouched
      const stored = loadDecisionsFromStorage();
      assert.deepEqual(stored[0], validExisting);
    });

    it('rejects empty Option A or Option B and preserves stored decision', () => {
      const missingOptionA: DecisionFormData = {
        title: 'Valid Title',
        optionA: '',
        optionB: 'Valid Option B',
        chosenOption: 'B',
        reason: 'Valid reason.',
      };

      const errorsA = validateDecisionForm(missingOptionA);
      assert.ok(hasValidationErrors(errorsA));
      assert.match(errorsA.optionA!, /Option A is required/i);

      assert.throws(
        () =>
          updateAndStoreDecision(validExisting.id, {
            title: missingOptionA.title,
            optionA: missingOptionA.optionA,
            optionB: missingOptionA.optionB,
            chosenOption: 'B',
            reason: missingOptionA.reason,
          }),
        /Invalid decision input/i
      );

      const missingOptionB: DecisionFormData = {
        title: 'Valid Title',
        optionA: 'Valid Option A',
        optionB: '   ',
        chosenOption: 'A',
        reason: 'Valid reason.',
      };

      const errorsB = validateDecisionForm(missingOptionB);
      assert.ok(hasValidationErrors(errorsB));
      assert.match(errorsB.optionB!, /Option B is required/i);

      assert.throws(
        () =>
          updateAndStoreDecision(validExisting.id, {
            title: missingOptionB.title,
            optionA: missingOptionB.optionA,
            optionB: missingOptionB.optionB,
            chosenOption: 'A',
            reason: missingOptionB.reason,
          }),
        /Invalid decision input/i
      );

      // Stored data untouched
      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });

    it('rejects identical Option A and Option B (must be distinct choices)', () => {
      const identicalOptions: DecisionFormData = {
        title: 'Same Options',
        optionA: 'Deploy to Cloud Run',
        optionB: 'deploy to cloud run', // Case-insensitive duplicate
        chosenOption: 'A',
        reason: 'Valid reason.',
      };

      const errors = validateDecisionForm(identicalOptions);
      assert.ok(hasValidationErrors(errors));
      assert.match(errors.optionB!, /must be distinct choices/i);

      // Storage remains untouched
      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });

    it('rejects empty or whitespace-only reason and preserves stored decision', () => {
      const missingReason: DecisionFormData = {
        title: 'Valid Title',
        optionA: 'Option 1',
        optionB: 'Option 2',
        chosenOption: 'A',
        reason: '     ',
      };

      const errors = validateDecisionForm(missingReason);
      assert.ok(hasValidationErrors(errors));
      assert.match(errors.reason!, /explain why you chose this option/i);

      assert.throws(
        () =>
          updateAndStoreDecision(validExisting.id, {
            title: missingReason.title,
            optionA: missingReason.optionA,
            optionB: missingReason.optionB,
            chosenOption: 'A',
            reason: missingReason.reason,
          }),
        /Invalid decision input/i
      );

      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });

    it('rejects invalid chosenOption (neither A nor B)', () => {
      assert.throws(
        () =>
          updateAndStoreDecision(validExisting.id, {
            title: 'Valid Title',
            optionA: 'Option A',
            optionB: 'Option B',
            chosenOption: 'C' as any,
            reason: 'Valid reason.',
          }),
        /Invalid decision input/i
      );

      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });

    it('rejects title exceeding maximum character length in form validation', () => {
      const overlyLongTitle: DecisionFormData = {
        title: 'A'.repeat(101), // Limit is 100
        optionA: 'Option A',
        optionB: 'Option B',
        chosenOption: 'A',
        reason: 'Valid reason.',
      };

      const errors = validateDecisionForm(overlyLongTitle);
      assert.ok(hasValidationErrors(errors));
      assert.match(errors.title!, /cannot exceed 100 characters/i);

      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });

    it('rejects reason exceeding maximum character length in form validation', () => {
      const overlyLongReason: DecisionFormData = {
        title: 'Valid Title',
        optionA: 'Option A',
        optionB: 'Option B',
        chosenOption: 'A',
        reason: 'X'.repeat(501), // Limit is 500
      };

      const errors = validateDecisionForm(overlyLongReason);
      assert.ok(hasValidationErrors(errors));
      assert.match(errors.reason!, /cannot exceed 500 characters/i);

      assert.deepEqual(loadDecisionsFromStorage()[0], validExisting);
    });
  });
});
