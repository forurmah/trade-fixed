import { useState, useCallback } from 'react';
import { Decision, CreateDecisionInput, UpdateDecisionInput } from './types';
import {
  getDecisionsFromStorage,
  createAndStoreDecision,
  updateAndStoreDecision,
  deleteAndStoreDecision,
  clearDecisionsFromStorage,
  StorageLoadResult,
} from './decisionStorage';

export type NewDecisionInput = CreateDecisionInput;

/**
 * Custom hook to manage decisions state and sync with localStorage.
 * Uses lazy initial state (() => getDecisionsFromStorage()) so that decisions
 * and storage load status are synchronously populated during initial mount.
 * Distinguishes between "no saved decisions" and "saved decisions couldn't be loaded".
 */
export function useDecisions() {
  const [loadResult, setLoadResult] = useState<StorageLoadResult>(() => {
    try {
      return getDecisionsFromStorage();
    } catch (error) {
      console.error('Failed to load decisions during initialization:', error);
      return {
        decisions: [],
        loadError:
          'Saved decisions couldn’t be loaded due to an unexpected storage access error. Original stored data was preserved.',
      };
    }
  });

  /**
   * Re-reads from localStorage to retry loading if an error previously occurred.
   */
  const reloadDecisions = useCallback(() => {
    try {
      const result = getDecisionsFromStorage();
      setLoadResult(result);
    } catch (error) {
      console.error('Failed to reload decisions from storage:', error);
      setLoadResult((prev) => ({
        decisions: prev.decisions,
        loadError:
          'Saved decisions couldn’t be loaded due to an unexpected storage access error. Original stored data was preserved.',
      }));
    }
  }, []);

  /**
   * Adds a decision:
   * 1. Fetches current decisions directly from localStorage via getItem & parse string.
   * 2. Prepends the newly created decision.
   * 3. Saves the updated array to localStorage with setItem & stringify.
   * 4. Updates React state with the resulting array and clears load error.
   */
  const addDecision = useCallback((input: NewDecisionInput): Decision => {
    try {
      // Reads with getItem and parses JSON string, prepends new decision, writes to storage
      const { newDecision, updatedDecisions } = createAndStoreDecision(input);

      // Updates React state with the pure updated value
      setLoadResult({ decisions: updatedDecisions, loadError: null });

      return newDecision;
    } catch (error) {
      console.error('Failed to add decision to storage:', error);
      throw error;
    }
  }, []);

  /**
   * Updates an existing decision:
   * 1. Updates persistent record by ID in localStorage, strictly preserving its creation date.
   * 2. Only updates React state / screen after saving succeeds.
   * 3. Throws if saving to storage fails so caller can surface the error without updating the screen.
   */
  const updateDecision = useCallback(
    (id: string, updates: UpdateDecisionInput): Decision => {
      try {
        // Save to persistent storage FIRST:
        const { updatedDecision, updatedDecisions } = updateAndStoreDecision(id, updates);

        // React state / screen is updated ONLY AFTER saving succeeds:
        setLoadResult({ decisions: updatedDecisions, loadError: null });

        return updatedDecision;
      } catch (error) {
        console.error('Failed to update decision in storage:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Deletes an existing decision by ID:
   * 1. Reads latest stored decisions and verifies no corruption.
   * 2. Deletes only the selected decision by ID from localStorage.
   * 3. Persists to storage BEFORE updating React state.
   * 4. Updates React state only after storage write succeeds.
   * 5. Throws if saving fails so caller can display an accessible error without changing screen.
   */
  const deleteDecision = useCallback(
    (id: string): void => {
      try {
        // Persist to storage FIRST:
        const { updatedDecisions } = deleteAndStoreDecision(id);

        // React state is updated ONLY AFTER persistence succeeds:
        setLoadResult({ decisions: updatedDecisions, loadError: null });
      } catch (error) {
        console.error('Failed to delete decision from storage:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Clears all decisions from state and localStorage.
   */
  const clearAllDecisions = useCallback(() => {
    try {
      clearDecisionsFromStorage();
      setLoadResult({ decisions: [], loadError: null });
    } catch (error) {
      console.error('Failed to clear decisions from storage:', error);
      throw error;
    }
  }, []);

  /**
   * Direct setter for decisions if needed.
   */
  const setDecisions = useCallback((newDecisions: Decision[] | ((prev: Decision[]) => Decision[])) => {
    setLoadResult((prev) => {
      const resolved = typeof newDecisions === 'function' ? newDecisions(prev.decisions) : newDecisions;
      return { decisions: resolved, loadError: null };
    });
  }, []);

  return {
    decisions: loadResult.decisions,
    loadError: loadResult.loadError,
    reloadDecisions,
    addDecision,
    updateDecision,
    deleteDecision,
    clearAllDecisions,
    setDecisions,
  };
}
