import React, { useState, useRef, useEffect } from 'react';
import { Decision, UpdateDecisionInput, FormErrors, ChosenOptionValue } from '../types';
import {
  validateDecisionForm,
  hasValidationErrors,
  MAX_TITLE_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_REASON_LENGTH,
} from '../validation';

export interface EditDecisionFormProps {
  decision: Decision;
  onSave: (data: UpdateDecisionInput) => void;
  onCancel: () => void;
}

const getInitialFormData = (d: Decision) => ({
  title: d.title,
  optionA: d.optionA,
  optionB: d.optionB,
  chosenOption: d.chosenOption as ChosenOptionValue | null,
  reason: d.reason,
});

export const EditDecisionForm: React.FC<EditDecisionFormProps> = ({
  decision,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState(() => getInitialFormData(decision));

  const [errors, setErrors] = useState<FormErrors>({});
  const [storageError, setStorageError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize internal form state whenever the decision prop changes
  useEffect(() => {
    setFormData(getInitialFormData(decision));
    setErrors({});
    setStorageError(null);
    setHasAttemptedSubmit(false);
  }, [decision]);

  // Focus management
  const titleInputRef = useRef<HTMLInputElement>(null);
  const optionAInputRef = useRef<HTMLInputElement>(null);
  const optionBInputRef = useRef<HTMLInputElement>(null);
  const chosenOptionRadioARef = useRef<HTMLInputElement>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const focusFirstInvalidField = (validationErrors: FormErrors) => {
    if (validationErrors.title) {
      titleInputRef.current?.focus();
    } else if (validationErrors.optionA) {
      optionAInputRef.current?.focus();
    } else if (validationErrors.optionB) {
      optionBInputRef.current?.focus();
    } else if (validationErrors.chosenOption) {
      chosenOptionRadioARef.current?.focus();
    } else if (validationErrors.reason) {
      reasonTextareaRef.current?.focus();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    if (hasAttemptedSubmit) {
      setErrors(validateDecisionForm(updatedData));
    }
  };

  const handleOptionSelect = (option: ChosenOptionValue) => {
    const updatedData = { ...formData, chosenOption: option };
    setFormData(updatedData);

    if (hasAttemptedSubmit) {
      setErrors(validateDecisionForm(updatedData));
    }
  };

  const formattedOriginalDate = (() => {
    try {
      return new Date(decision.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Original date';
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    const validationErrors = validateDecisionForm(formData);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      focusFirstInvalidField(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setStorageError(null);

    try {
      // Central requirement: screen updates only after saving succeeds!
      onSave({
        title: formData.title.trim(),
        optionA: formData.optionA.trim(),
        optionB: formData.optionB.trim(),
        chosenOption: formData.chosenOption as ChosenOptionValue,
        reason: formData.reason.trim(),
      });
      // If onSave succeeded, the parent switches view and updates screen state.
    } catch (err: unknown) {
      console.error('Failed to update decision:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to update decision. Local storage may be full or disabled.';
      setStorageError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id="edit-decision-form"
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-[#EBDDDD] rounded-[12px] p-6 sm:p-8 space-y-6 min-w-0 overflow-hidden"
    >
      {/* Storage Error Alert */}
      {storageError && (
        <div
          role="alert"
          id="storage-update-error-alert"
          className="w-full bg-[#FAF0F0] border border-[#F2C6C6] text-[#9E2D46] px-4 py-3 rounded-xl flex items-start justify-between gap-3 text-[14px] font-medium animate-fadeIn min-w-0"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <span aria-hidden="true" className="text-base shrink-0 select-none">⚠️</span>
            <div className="min-w-0 break-words [overflow-wrap:anywhere]">
              <p className="font-semibold text-[#801B33]">Unable to save changes</p>
              <p className="text-[13px] text-[#9E2D46] mt-0.5">{storageError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStorageError(null)}
            className="text-[#9E2D46] hover:text-[#5C1423] text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer shrink-0"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Creation Date Badge Note */}
      <div
        id="edit-creation-date-notice"
        className="bg-[#FCF8F7] border border-[#EBDDDD] rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-[13.5px] text-[#4F596F]"
      >
        <span className="font-medium text-[#18233F]">
          Originally created on {formattedOriginalDate}
        </span>
        <span className="text-[12px] font-semibold text-[#5C667E] bg-[#F5EEEE] px-2.5 py-0.5 rounded-full border border-[#EBDDDD]/80 shrink-0">
          Creation date preserved
        </span>
      </div>

      {/* 1. Decision Title */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="edit-decision-title"
            className="block text-[14px] sm:text-[15px] font-medium text-[#18233F]"
          >
            Decision title
          </label>
          <span className="text-[12px] font-medium text-[#4F596F] shrink-0">
            {formData.title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <input
          ref={titleInputRef}
          type="text"
          id="edit-decision-title"
          name="title"
          maxLength={MAX_TITLE_LENGTH}
          value={formData.title}
          onChange={handleChange}
          placeholder="Decision title"
          aria-describedby={errors.title ? 'edit-title-error' : undefined}
          aria-invalid={Boolean(errors.title)}
          className={`w-full min-w-0 px-3.5 py-2.5 text-[15px] text-[#18233F] placeholder-[#687389] bg-white border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#9E2D46]/20 ${
            errors.title
              ? 'border-[#9E2D46] focus:border-[#9E2D46]'
              : 'border-[#EBDDDD] focus:border-[#9E2D46]'
          }`}
        />
        {errors.title && (
          <p id="edit-title-error" className="mt-1.5 text-[13px] font-medium text-[#9E2D46] break-words [overflow-wrap:anywhere]">
            {errors.title}
          </p>
        )}
      </div>

      {/* 2. Side-by-side Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        {/* Option A */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="edit-option-a"
              className="block text-[14px] sm:text-[15px] font-medium text-[#18233F]"
            >
              Option A
            </label>
            <span className="text-[12px] font-medium text-[#4F596F] shrink-0">
              {formData.optionA.length}/{MAX_OPTION_LENGTH}
            </span>
          </div>
          <input
            ref={optionAInputRef}
            type="text"
            id="edit-option-a"
            name="optionA"
            maxLength={MAX_OPTION_LENGTH}
            value={formData.optionA}
            onChange={handleChange}
            placeholder="Option A description"
            aria-describedby={errors.optionA ? 'edit-option-a-error' : undefined}
            aria-invalid={Boolean(errors.optionA)}
            className={`w-full min-w-0 px-3.5 py-2.5 text-[15px] text-[#18233F] placeholder-[#687389] bg-white border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#9E2D46]/20 ${
              errors.optionA
                ? 'border-[#9E2D46] focus:border-[#9E2D46]'
                : 'border-[#EBDDDD] focus:border-[#9E2D46]'
            }`}
          />
          {errors.optionA && (
            <p id="edit-option-a-error" className="mt-1.5 text-[13px] font-medium text-[#9E2D46] break-words [overflow-wrap:anywhere]">
              {errors.optionA}
            </p>
          )}
        </div>

        {/* Option B */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="edit-option-b"
              className="block text-[14px] sm:text-[15px] font-medium text-[#18233F]"
            >
              Option B
            </label>
            <span className="text-[12px] font-medium text-[#4F596F] shrink-0">
              {formData.optionB.length}/{MAX_OPTION_LENGTH}
            </span>
          </div>
          <input
            ref={optionBInputRef}
            type="text"
            id="edit-option-b"
            name="optionB"
            maxLength={MAX_OPTION_LENGTH}
            value={formData.optionB}
            onChange={handleChange}
            placeholder="Option B description"
            aria-describedby={errors.optionB ? 'edit-option-b-error' : undefined}
            aria-invalid={Boolean(errors.optionB)}
            className={`w-full min-w-0 px-3.5 py-2.5 text-[15px] text-[#18233F] placeholder-[#687389] bg-white border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#9E2D46]/20 ${
              errors.optionB
                ? 'border-[#9E2D46] focus:border-[#9E2D46]'
                : 'border-[#EBDDDD] focus:border-[#9E2D46]'
            }`}
          />
          {errors.optionB && (
            <p id="edit-option-b-error" className="mt-1.5 text-[13px] font-medium text-[#9E2D46] break-words [overflow-wrap:anywhere]">
              {errors.optionB}
            </p>
          )}
        </div>
      </div>

      {/* 3. Radio-button group */}
      <fieldset
        className="space-y-2.5"
        aria-describedby={errors.chosenOption ? 'edit-chosen-option-error' : undefined}
      >
        <legend className="text-[14px] sm:text-[15px] font-medium text-[#18233F]">
          Which option did you choose?
        </legend>
        <div className="space-y-2 pt-1">
          {/* Option A Radio */}
          <label
            htmlFor="edit-radio-choice-option-a"
            className="flex items-center gap-3 cursor-pointer select-none py-1 group"
          >
            <div className="relative flex items-center justify-center">
              <input
                ref={chosenOptionRadioARef}
                type="radio"
                id="edit-radio-choice-option-a"
                name="editChosenOptionGroup"
                value="A"
                checked={formData.chosenOption === 'A'}
                onChange={() => handleOptionSelect('A')}
                aria-describedby={errors.chosenOption ? 'edit-chosen-option-error' : undefined}
                aria-invalid={Boolean(errors.chosenOption)}
                className="sr-only peer"
              />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#9E2D46] ${
                  formData.chosenOption === 'A'
                    ? 'border-[#9E2D46]'
                    : 'border-[#B8A8A8] group-hover:border-[#9E2D46]'
                }`}
              >
                {formData.chosenOption === 'A' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9E2D46]" />
                )}
              </div>
            </div>
            <span className="text-[15px] text-[#18233F]">
              Option A
            </span>
          </label>

          {/* Option B Radio */}
          <label
            htmlFor="edit-radio-choice-option-b"
            className="flex items-center gap-3 cursor-pointer select-none py-1 group"
          >
            <div className="relative flex items-center justify-center">
              <input
                type="radio"
                id="edit-radio-choice-option-b"
                name="editChosenOptionGroup"
                value="B"
                checked={formData.chosenOption === 'B'}
                onChange={() => handleOptionSelect('B')}
                aria-describedby={errors.chosenOption ? 'edit-chosen-option-error' : undefined}
                aria-invalid={Boolean(errors.chosenOption)}
                className="sr-only peer"
              />
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#9E2D46] ${
                  formData.chosenOption === 'B'
                    ? 'border-[#9E2D46]'
                    : 'border-[#B8A8A8] group-hover:border-[#9E2D46]'
                }`}
              >
                {formData.chosenOption === 'B' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9E2D46]" />
                )}
              </div>
            </div>
            <span className="text-[15px] text-[#18233F]">
              Option B
            </span>
          </label>
        </div>
        {errors.chosenOption && (
          <p id="edit-chosen-option-error" className="text-[13px] font-medium text-[#9E2D46]">
            {errors.chosenOption}
          </p>
        )}
      </fieldset>

      {/* 4. Reason textarea */}
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="edit-decision-reason"
            className="block text-[14px] sm:text-[15px] font-medium text-[#18233F]"
          >
            Why did you choose this?
          </label>
          <span className="text-[12px] font-medium text-[#4F596F] shrink-0">
            {formData.reason.length}/{MAX_REASON_LENGTH}
          </span>
        </div>
        <textarea
          ref={reasonTextareaRef}
          id="edit-decision-reason"
          name="reason"
          rows={4}
          maxLength={MAX_REASON_LENGTH}
          value={formData.reason}
          onChange={handleChange}
          placeholder="Explain why you chose this option..."
          aria-describedby={
            errors.reason ? 'edit-reason-error edit-reason-help-text' : 'edit-reason-help-text'
          }
          aria-invalid={Boolean(errors.reason)}
          className={`w-full min-w-0 px-3.5 py-2.5 text-[15px] text-[#18233F] placeholder-[#687389] bg-white border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#9E2D46]/20 resize-y ${
            errors.reason
              ? 'border-[#9E2D46] focus:border-[#9E2D46]'
              : 'border-[#EBDDDD] focus:border-[#9E2D46]'
          }`}
        />
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <p id="edit-reason-help-text" className="text-[13px] text-[#4F596F]">
            A short, honest reason is enough.
          </p>
        </div>
        {errors.reason && (
          <p id="edit-reason-error" className="mt-1.5 text-[13px] font-medium text-[#9E2D46] break-words [overflow-wrap:anywhere]">
            {errors.reason}
          </p>
        )}
      </div>

      {/* 5. Action buttons */}
      <div className="pt-2 flex items-center gap-4">
        <button
          type="button"
          id="cancel-edit-decision-button"
          onClick={onCancel}
          className="text-[#18233F] hover:text-[#9E2D46] text-[15px] font-medium px-4 py-2.5 border border-[#EBDDDD] hover:border-[#9E2D46]/40 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46]"
        >
          Cancel
        </button>
        <button
          type="submit"
          id="save-edit-decision-button"
          disabled={isSubmitting}
          className="bg-[#18233F] hover:bg-[#25345C] active:bg-[#11192E] disabled:opacity-60 text-white text-[15px] font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] focus-visible:ring-offset-2"
        >
          Save changes
        </button>
      </div>
    </form>
  );
};
