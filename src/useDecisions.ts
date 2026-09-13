import { useState, useCallback } from 'react';
import { Decision, CreateDecisionInput } from './types';
import {
  loadDecisionsFromStorage,
  createAndStoreDecision,
  clearDecisionsFromStorage,
} from './decisionStorage';

export type NewDecisionInput = CreateDecisionInput;

/**
 * Custom hook to manage decisions state and sync with localStorage.
 * Uses lazy initial state (() => loadDecisionsFromStorage()) so that decisions
 * are synchronously populated during initial mount. This avoids re-rendering
 * or empty-state flashing after each page refresh.
 */
export function useDecisions() {
  // Lazy initial state reads localStorage synchronously on first render via getItem & parse
  const [decisions, setDecisions] = useState<Decision[]>(() => loadDecisionsFromStorage());

  /**
   * Adds a decision:
   * 1. Fetches current decisions directly from localStorage via getItem & parse string.
   * 2. Prepends the newly created decision.
   * 3. Saves the updated array to localStorage with setItem & stringify.
   * 4. Updates React state with the resulting array.
   *
   * By retrieving from localStorage via getItem and parsing the string outside
   * of any state updater callback:
   * - React state updaters remain strictly pure (StrictMode safe).
   * - No stale closure issues; addDecision has a stable identity ([]) across renders.
   * - Storage acts as the verified source of truth before setting React state.
   */
  const addDecision = useCallback((input: NewDecisionInput): Decision => {
    // Reads with getItem and parses JSON string, prepends new decision, writes to storage
    const { newDecision, updatedDecisions } = createAndStoreDecision(input);

    // Updates React state with the pure updated value
    setDecisions(updatedDecisions);

    return newDecision;
  }, []);

  /**
   * Clears all decisions from state and localStorage.
   */
  const clearAllDecisions = useCallback(() => {
    clearDecisionsFromStorage();
    setDecisions([]);
  }, []);

  return {
    decisions,
    addDecision,
    clearAllDecisions,
    setDecisions,
  };
}
