import { Decision, DecisionFormData, FormErrors, ChosenOptionValue, Reflection, ReflectionStatus } from './types';
import {
  MAX_TITLE_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_REASON_LENGTH,
  MIN_REFLECTION_LENGTH,
  MAX_REFLECTION_LENGTH,
} from './constants';

export {
  MAX_TITLE_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_REASON_LENGTH,
  MIN_REFLECTION_LENGTH,
  MAX_REFLECTION_LENGTH,
};

/**
 * Validates the decision title field.
 */
export function validateDecisionTitle(title: string): string | undefined {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return 'Decision title is required.';
  }
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return `Decision title cannot exceed ${MAX_TITLE_LENGTH} characters.`;
  }
  return undefined;
}

/**
 * Validates an option string (Option A or Option B).
 */
export function validateOption(option: string, optionLabel: 'Option A' | 'Option B'): string | undefined {
  const trimmed = option.trim();
  if (!trimmed) {
    return `${optionLabel} is required.`;
  }
  if (trimmed.length > MAX_OPTION_LENGTH) {
    return `${optionLabel} cannot exceed ${MAX_OPTION_LENGTH} characters.`;
  }
  return undefined;
}

/**
 * Validates that Option A and Option B are distinct choices.
 */
export function validateDistinctOptions(optionA: string, optionB: string): string | undefined {
  const trimmedA = optionA.trim();
  const trimmedB = optionB.trim();
  if (trimmedA && trimmedB && trimmedA.toLowerCase() === trimmedB.toLowerCase()) {
    return 'Option A and Option B must be distinct choices.';
  }
  return undefined;
}

/**
 * Validates that a choice ('A' or 'B') has been selected.
 */
export function validateChosenOption(chosenOption: ChosenOptionValue | null): string | undefined {
  if (!chosenOption) {
    return 'Please choose either Option A or Option B.';
  }
  return undefined;
}

/**
 * Validates the explanation reason field.
 */
export function validateDecisionReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) {
    return 'Please explain why you chose this option.';
  }
  if (trimmed.length > MAX_REASON_LENGTH) {
    return `Reason cannot exceed ${MAX_REASON_LENGTH} characters.`;
  }
  return undefined;
}

/**
 * Validates the full decision form data and returns any errors.
 */
export function validateDecisionForm(data: DecisionFormData): FormErrors {
  const errors: FormErrors = {};

  // 1. Title validation
  const titleError = validateDecisionTitle(data.title);
  if (titleError) {
    errors.title = titleError;
  }

  // 2. Option A validation
  const optionAError = validateOption(data.optionA, 'Option A');
  if (optionAError) {
    errors.optionA = optionAError;
  }

  // 3. Option B validation
  const optionBError = validateOption(data.optionB, 'Option B');
  if (optionBError) {
    errors.optionB = optionBError;
  } else {
    // Check distinctness only if Option B isn't already invalid
    const distinctError = validateDistinctOptions(data.optionA, data.optionB);
    if (distinctError) {
      errors.optionB = distinctError;
    }
  }

  // 4. Chosen option validation
  const chosenError = validateChosenOption(data.chosenOption);
  if (chosenError) {
    errors.chosenOption = chosenError;
  }

  // 5. Reason validation
  const reasonError = validateDecisionReason(data.reason);
  if (reasonError) {
    errors.reason = reasonError;
  }

  return errors;
}

/**
 * Checks whether the FormErrors object has any active error keys.
 */
export function hasValidationErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export interface ReflectionFormErrors {
  outcome?: string;
  whatWouldChange?: string;
  status?: string;
}

/**
 * Validates the reflection outcome field ("What happened?").
 */
export function validateReflectionOutcome(outcome: string): string | undefined {
  const trimmed = outcome.trim();
  if (!trimmed) {
    return 'Please describe what happened after this decision.';
  }
  if (trimmed.length < MIN_REFLECTION_LENGTH) {
    return `Outcome must be at least ${MIN_REFLECTION_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_REFLECTION_LENGTH) {
    return `Outcome cannot exceed ${MAX_REFLECTION_LENGTH} characters.`;
  }
  return undefined;
}

/**
 * Validates the reflection whatWouldChange field ("What would I change?").
 */
export function validateReflectionWhatWouldChange(whatWouldChange: string): string | undefined {
  const trimmed = whatWouldChange.trim();
  if (!trimmed) {
    return 'Please explain what you would change next time.';
  }
  if (trimmed.length < MIN_REFLECTION_LENGTH) {
    return `What you would change must be at least ${MIN_REFLECTION_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_REFLECTION_LENGTH) {
    return `What you would change cannot exceed ${MAX_REFLECTION_LENGTH} characters.`;
  }
  return undefined;
}

/**
 * Validates the reflection form input.
 */
export function validateReflectionForm(
  outcome: string,
  whatWouldChange: string,
  status?: ReflectionStatus
): ReflectionFormErrors {
  const errors: ReflectionFormErrors = {};

  const outcomeError = validateReflectionOutcome(outcome);
  if (outcomeError) {
    errors.outcome = outcomeError;
  }

  const changeError = validateReflectionWhatWouldChange(whatWouldChange);
  if (changeError) {
    errors.whatWouldChange = changeError;
  }

  if (status !== 'pending' && status !== 'resolved') {
    errors.status = "Status must be either 'pending' or 'resolved'.";
  }

  return errors;
}

export interface StoredDecisionValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates each stored decision's required fields, chosen option, and date.
 * Required fields: id, title, optionA, optionB, reason
 * Chosen option: must be 'A' or 'B'
 * Date: createdAt must be a valid parseable date string
 * Reflection (optional): if present, must have valid outcome, whatWouldChange, and status ('pending' | 'resolved')
 */
export function validateStoredDecision(item: unknown): StoredDecisionValidationResult {
  const errors: string[] = [];

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      isValid: false,
      errors: ['Stored decision record must be a valid object.'],
    };
  }

  const candidate = item as Record<string, unknown>;

  // Required fields check
  if (typeof candidate.id !== 'string' || candidate.id.trim() === '') {
    errors.push('Missing or empty required field: id');
  }
  if (typeof candidate.title !== 'string' || candidate.title.trim() === '') {
    errors.push('Missing or empty required field: title');
  }
  if (typeof candidate.optionA !== 'string' || candidate.optionA.trim() === '') {
    errors.push('Missing or empty required field: optionA');
  }
  if (typeof candidate.optionB !== 'string' || candidate.optionB.trim() === '') {
    errors.push('Missing or empty required field: optionB');
  }
  if (typeof candidate.reason !== 'string' || candidate.reason.trim() === '') {
    errors.push('Missing or empty required field: reason');
  }

  // Chosen option check
  if (candidate.chosenOption !== 'A' && candidate.chosenOption !== 'B') {
    errors.push("Invalid chosenOption: must be 'A' or 'B'");
  }

  // Date check
  if (typeof candidate.createdAt !== 'string' || candidate.createdAt.trim() === '') {
    errors.push('Missing or empty required field: createdAt');
  } else {
    const timestamp = Date.parse(candidate.createdAt);
    if (Number.isNaN(timestamp)) {
      errors.push('Invalid createdAt: must be a valid date string');
    }
  }

  // Optional reflection check
  if (candidate.reflection !== undefined && candidate.reflection !== null) {
    if (typeof candidate.reflection !== 'object' || Array.isArray(candidate.reflection)) {
      errors.push('Invalid reflection: must be a valid object');
    } else {
      const refCandidate = candidate.reflection as Record<string, unknown>;
      if (typeof refCandidate.outcome !== 'string' || refCandidate.outcome.trim() === '') {
        errors.push('Invalid reflection: outcome must be a non-empty string');
      }
      if (typeof refCandidate.whatWouldChange !== 'string' || refCandidate.whatWouldChange.trim() === '') {
        errors.push('Invalid reflection: whatWouldChange must be a non-empty string');
      }
      if (
        refCandidate.status !== 'pending' &&
        refCandidate.status !== 'resolved'
      ) {
        errors.push("Invalid reflection: status must be 'pending' or 'resolved'");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard that verifies if an unknown stored item is a valid Decision.
 */
export function isValidStoredDecision(item: unknown): item is Decision {
  return validateStoredDecision(item).isValid;
}

