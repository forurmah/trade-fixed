import { Decision, DecisionFormData, FormErrors, ChosenOptionValue } from './types';
import { MAX_TITLE_LENGTH, MAX_OPTION_LENGTH, MAX_REASON_LENGTH } from './constants';

export { MAX_TITLE_LENGTH, MAX_OPTION_LENGTH, MAX_REASON_LENGTH };

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

export interface StoredDecisionValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates each stored decision's required fields, chosen option, and date.
 * Required fields: id, title, optionA, optionB, reason
 * Chosen option: must be 'A' or 'B'
 * Date: createdAt must be a valid parseable date string
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

