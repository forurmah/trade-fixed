import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DECISIONS_STORAGE_KEY,
  getDecisionsFromStorage,
  loadDecisionsFromStorage,
  createAndStoreDecision,
  updateAndStoreDecision,
  deleteAndStoreDecision,
  saveReflectionToDecision,
} from './decisionStorage';
import {
  validateReflectionOutcome,
  validateReflectionWhatWouldChange,
  validateReflectionForm,
  validateStoredDecision,
} from './validation';
import type { Decision, Reflection } from './types';

// Mock localStorage factory
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

describe('Reflection Feature Lifecycle & Persistence Tests', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    (global as any).window = {
      localStorage: mockStorage,
    };
  });

  // Checklist 1-6: Create, refresh, add reflection, refresh, verify persistence
  it('implements full checklist: create -> refresh -> add reflection -> refresh -> reflection persists', () => {
    // 1. Create a decision
    const { newDecision: created } = createAndStoreDecision({
      title: 'Should I take the freelance project?',
      optionA: 'Accept the freelance client',
      optionB: 'Focus exclusively on full-time role',
      chosenOption: 'A',
      reason: 'Great portfolio piece and valuable client relationship.',
    });

    assert.ok(created.id);
    assert.equal(created.reflection, undefined);

    // 2. Refresh browser (re-read from storage)
    let reloaded = loadDecisionsFromStorage();
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].id, created.id);
    assert.equal(reloaded[0].reflection, undefined);

    // 3 & 4. Open decision and add reflection
    const reflectionInput: Reflection = {
      outcome: 'Completed the freelance contract in July. It went really well and delivered on time.',
      whatWouldChange: 'I would establish clearer milestones and set upfront boundaries.',
      status: 'resolved',
    };

    const { updatedDecision } = saveReflectionToDecision(created.id, reflectionInput);
    assert.equal(updatedDecision.id, created.id);
    assert.equal(updatedDecision.createdAt, created.createdAt, 'Original createdAt must be strictly preserved');
    assert.deepEqual(updatedDecision.reflection, reflectionInput);

    // 5 & 6. Refresh browser: verify reflection still exists and persisted
    reloaded = loadDecisionsFromStorage();
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].id, created.id);
    assert.ok(reloaded[0].reflection, 'Reflection must persist across reload');
    assert.equal(reloaded[0].reflection?.outcome, reflectionInput.outcome);
    assert.equal(reloaded[0].reflection?.whatWouldChange, reflectionInput.whatWouldChange);
    assert.equal(reloaded[0].reflection?.status, 'resolved');
  });

  // Checklist 7-8: Edit reflection -> refresh -> verify edited reflection survives
  it('implements checklist 7-8: edit reflection -> refresh -> updated reflection survives reload', () => {
    const { newDecision: decision } = createAndStoreDecision({
      title: 'Buy an electric standing desk',
      optionA: 'Get motorized bamboo standing desk',
      optionB: 'Keep current fixed desk with riser',
      chosenOption: 'A',
      reason: 'Better ergonomics for prolonged daily writing.',
    });

    // Initial reflection
    saveReflectionToDecision(decision.id, {
      outcome: 'Initial outcome: assembled the desk.',
      whatWouldChange: 'Initial note: nothing yet.',
      status: 'pending',
    });

    // 7. Edit reflection
    const revisedReflection: Reflection = {
      outcome: 'After 3 months: back pain decreased significantly and posture improved.',
      whatWouldChange: 'I would buy the cable management tray right away rather than later.',
      status: 'resolved',
    };

    const { updatedDecision } = saveReflectionToDecision(decision.id, revisedReflection);
    assert.deepEqual(updatedDecision.reflection, revisedReflection);

    // 8. Refresh browser: verify updated reflection persisted
    const reloaded = loadDecisionsFromStorage();
    assert.equal(reloaded.length, 1);
    assert.deepEqual(reloaded[0].reflection, revisedReflection);
  });

  // Checklist 9: Existing decisions without reflections still work alongside ones with reflections
  it('implements checklist 9: existing decisions without reflections continue to load and validate properly', () => {
    // Seed raw legacy decision without reflection into localStorage
    const legacyDecision = {
      id: 'legacy-dec-1',
      title: 'Legacy decision before reflection feature existed',
      optionA: 'Old choice A',
      optionB: 'Old choice B',
      chosenOption: 'B',
      reason: 'Historical rationale saved months ago.',
      createdAt: '2025-01-15T12:00:00.000Z',
    };

    mockStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify([legacyDecision]));

    const { decisions, loadError } = getDecisionsFromStorage();
    assert.equal(loadError, null, 'Must load legacy records without error');
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].id, 'legacy-dec-1');
    assert.equal(decisions[0].reflection, undefined);

    // Now create a new decision with reflection
    const { newDecision: newDec } = createAndStoreDecision({
      title: 'New decision',
      optionA: 'A',
      optionB: 'B',
      chosenOption: 'A',
      reason: 'Reasoning.',
    });

    saveReflectionToDecision(newDec.id, {
      outcome: 'Outcome of new decision.',
      whatWouldChange: 'What I would change.',
      status: 'pending',
    });

    // Both legacy (without reflection) and new (with reflection) coexist seamlessly
    const allDecisions = loadDecisionsFromStorage();
    assert.equal(allDecisions.length, 2);
    const foundLegacy = allDecisions.find((d) => d.id === 'legacy-dec-1');
    const foundNew = allDecisions.find((d) => d.id === newDec.id);
    assert.ok(foundLegacy);
    assert.equal(foundLegacy.reflection, undefined);
    assert.ok(foundNew);
    assert.equal(foundNew.reflection?.status, 'pending');
  });

  // Checklist 10: Delete decision with reflection and confirm it is removed cleanly
  it('implements checklist 10: deletes decision with reflection and confirms clean removal', () => {
    const { newDecision: dec1 } = createAndStoreDecision({
      title: 'First decision to delete',
      optionA: 'A1',
      optionB: 'B1',
      chosenOption: 'A',
      reason: 'Reason 1',
    });

    const { newDecision: dec2 } = createAndStoreDecision({
      title: 'Second decision to keep',
      optionA: 'A2',
      optionB: 'B2',
      chosenOption: 'B',
      reason: 'Reason 2',
    });

    saveReflectionToDecision(dec1.id, {
      outcome: 'Reflected outcome for decision 1.',
      whatWouldChange: 'What I would change for decision 1.',
      status: 'resolved',
    });

    // Delete decision 1
    const { updatedDecisions } = deleteAndStoreDecision(dec1.id);
    assert.equal(updatedDecisions.length, 1);
    assert.equal(updatedDecisions[0].id, dec2.id);

    // Reload from storage
    const reloaded = loadDecisionsFromStorage();
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].id, dec2.id);
    assert.equal(reloaded.find((d) => d.id === dec1.id), undefined);
  });

  // Storage failure scenario: storage write fails during reflection save
  it('rolls back and preserves existing decision data when storage write fails during reflection save', () => {
    const { newDecision: decision } = createAndStoreDecision({
      title: 'Decision with failing reflection save',
      optionA: 'Option A text',
      optionB: 'Option B text',
      chosenOption: 'A',
      reason: 'Sound reasoning',
    });

    const originalPayload = mockStorage.getItem(DECISIONS_STORAGE_KEY);
    assert.ok(originalPayload !== null, 'Initial decision must be stored');

    // Intercept mockStorage.setItem to fail on the first save attempt
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
      // Subsequent write (the rollback) succeeds
      originalSetItem(k, v);
    };

    // Save operation must fail safely and throw informative error
    assert.throws(
      () =>
        saveReflectionToDecision(decision.id, {
          outcome: 'This reflection should fail to persist.',
          whatWouldChange: 'I would avoid running out of storage.',
          status: 'resolved',
        }),
      (err: any) => {
        assert.match(err.message, /Storage quota exceeded/i);
        assert.match(err.message, /Original stored data was preserved/i);
        return true;
      }
    );

    // Existing stored raw data must remain completely unchanged
    assert.equal(
      mockStorage.getItem(DECISIONS_STORAGE_KEY),
      originalPayload,
      'Raw storage must match the exact original payload before the failed save'
    );

    // Application data must not be partially updated or corrupted upon reloading
    const reloaded = loadDecisionsFromStorage();
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].id, decision.id);
    assert.equal(reloaded[0].title, 'Decision with failing reflection save');
    assert.equal(reloaded[0].reflection, undefined, 'Decision must not contain partial or unsaved reflection data');
  });

  // Validation rules
  describe('Reflection Validation', () => {
    it('validates outcome is required and has minimum length', () => {
      assert.ok(validateReflectionOutcome(''));
      assert.ok(validateReflectionOutcome('   '));
      assert.ok(validateReflectionOutcome('ab')); // < 3 characters
      assert.equal(validateReflectionOutcome('abc'), undefined);
      assert.equal(validateReflectionOutcome('It went really well!'), undefined);
    });

    it('validates whatWouldChange is required and has minimum length', () => {
      assert.ok(validateReflectionWhatWouldChange(''));
      assert.ok(validateReflectionWhatWouldChange('   '));
      assert.ok(validateReflectionWhatWouldChange('no')); // < 3 characters
      assert.equal(validateReflectionWhatWouldChange('yes'), undefined);
      assert.equal(validateReflectionWhatWouldChange('I would start earlier next time.'), undefined);
    });

    it('validates entire reflection form and blocks empty submission', () => {
      const emptyFormErrors = validateReflectionForm('', '');
      assert.ok(emptyFormErrors.outcome, 'Outcome must be flagged as required');
      assert.ok(emptyFormErrors.whatWouldChange, 'whatWouldChange must be flagged as required');

      const validFormErrors = validateReflectionForm(
        'What happened: Project finished successfully.',
        'What I would change: Schedule more buffers.',
        'resolved'
      );
      assert.equal(Object.keys(validFormErrors).length, 0);
    });

    it('validateStoredDecision verifies corrupted reflection schemas', () => {
      const validStored = {
        id: 'dec-ok',
        title: 'Valid title',
        optionA: 'A',
        optionB: 'B',
        chosenOption: 'A',
        reason: 'Valid reason',
        createdAt: new Date().toISOString(),
        reflection: {
          outcome: 'Valid outcome',
          whatWouldChange: 'Valid change',
          status: 'resolved',
        },
      };
      assert.equal(validateStoredDecision(validStored).isValid, true);

      // Corrupted reflection: empty outcome
      const invalidOutcome = {
        ...validStored,
        reflection: {
          outcome: '   ',
          whatWouldChange: 'Valid change',
        },
      };
      assert.equal(validateStoredDecision(invalidOutcome).isValid, false);

      // Corrupted reflection: invalid status
      const invalidStatus = {
        ...validStored,
        reflection: {
          outcome: 'Valid outcome',
          whatWouldChange: 'Valid change',
          status: 'unknown_status',
        },
      };
      assert.equal(validateStoredDecision(invalidStatus).isValid, false);
    });

    it('editing a decision via updateAndStoreDecision preserves existing reflection', () => {
      const { newDecision: decision } = createAndStoreDecision({
        title: 'Original Title',
        optionA: 'Opt A',
        optionB: 'Opt B',
        chosenOption: 'A',
        reason: 'Original reason',
      });

      saveReflectionToDecision(decision.id, {
        outcome: 'Outcome before editing decision.',
        whatWouldChange: 'Changes before editing decision.',
        status: 'resolved',
      });

      // Update the decision title & reason
      const { updatedDecision } = updateAndStoreDecision(decision.id, {
        title: 'Updated Title',
        optionA: 'Opt A',
        optionB: 'Opt B',
        chosenOption: 'A',
        reason: 'Updated reason',
      });

      assert.equal(updatedDecision.title, 'Updated Title');
      assert.ok(updatedDecision.reflection, 'Reflection must be preserved on decision edit');
      assert.equal(updatedDecision.reflection?.outcome, 'Outcome before editing decision.');

      // Reload from storage
      const reloaded = loadDecisionsFromStorage();
      assert.equal(reloaded[0].reflection?.outcome, 'Outcome before editing decision.');
    });
  });
});
