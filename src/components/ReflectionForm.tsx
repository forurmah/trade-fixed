import React, { useState, useRef, useEffect } from 'react';
import { Reflection, ReflectionStatus } from '../types';
import { validateReflectionForm, ReflectionFormErrors } from '../validation';
import { MAX_REFLECTION_LENGTH } from '../constants';

export interface ReflectionFormProps {
  initialReflection?: Reflection;
  decisionId: string;
  onSave: (reflection: Reflection) => void | Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const ReflectionForm: React.FC<ReflectionFormProps> = ({
  initialReflection,
  decisionId,
  onSave,
  onCancel,
  isEditing = false,
}) => {
  const [outcome, setOutcome] = useState<string>(() => initialReflection?.outcome || '');
  const [whatWouldChange, setWhatWouldChange] = useState<string>(
    () => initialReflection?.whatWouldChange || ''
  );
  const [status, setStatus] = useState<ReflectionStatus>(
    () => initialReflection?.status || 'resolved'
  );
  const [errors, setErrors] = useState<ReflectionFormErrors>({});
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const outcomeRef = useRef<HTMLTextAreaElement>(null);
  const whatWouldChangeRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize internal state if initialReflection changes
  useEffect(() => {
    setOutcome(initialReflection?.outcome || '');
    setWhatWouldChange(initialReflection?.whatWouldChange || '');
    setStatus(initialReflection?.status || 'resolved');
    setErrors({});
    setStorageError(null);
  }, [initialReflection, decisionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setStorageError(null);

    const validationErrors = validateReflectionForm(outcome, whatWouldChange, status);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.outcome) {
        outcomeRef.current?.focus();
      } else if (validationErrors.whatWouldChange) {
        whatWouldChangeRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setStorageError(null);

    try {
      await onSave({
        outcome: outcome.trim(),
        whatWouldChange: whatWouldChange.trim(),
        status,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while saving your reflection.';
      setStorageError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutcomeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_REFLECTION_LENGTH) {
      setOutcome(val);
      if (errors.outcome) {
        setErrors((prev) => ({ ...prev, outcome: undefined }));
      }
    }
  };

  const handleWhatWouldChangeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_REFLECTION_LENGTH) {
      setWhatWouldChange(val);
      if (errors.whatWouldChange) {
        setErrors((prev) => ({ ...prev, whatWouldChange: undefined }));
      }
    }
  };

  return (
    <div
      id={`reflection-form-card-${decisionId}`}
      className="bg-white border border-[#EBDDDD] rounded-[12px] p-5 sm:p-6 shadow-xs min-w-0"
    >
      <div className="space-y-1 mb-5">
        <h2
          id="reflection-form-title"
          className="font-serif-heading text-[20px] sm:text-[22px] font-semibold text-[#18233F]"
        >
          {isEditing ? 'Edit reflection' : 'Add a reflection'}
        </h2>
        <p className="text-[13.5px] text-[#5C667E]">
          Capture your learnings and what you would do differently next time.
        </p>
      </div>

      {storageError && (
        <div
          role="alert"
          id="reflection-storage-error"
          className="mb-5 p-3.5 bg-[#FDF2F2] border border-[#F8D7DA] text-[#85273C] rounded-lg text-[13.5px]"
        >
          {storageError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Outcome field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline gap-2">
            <label
              htmlFor={`reflection-outcome-${decisionId}`}
              className="block text-[13.5px] font-semibold text-[#18233F]"
            >
              What happened? <span className="text-[#9E2D46]">*</span>
            </label>
            <span
              className={`text-[12px] ${
                outcome.length >= MAX_REFLECTION_LENGTH ? 'text-[#85273C] font-semibold' : 'text-[#7D889F]'
              }`}
            >
              {outcome.length}/{MAX_REFLECTION_LENGTH}
            </span>
          </div>
          <p className="text-[12.5px] text-[#5C667E]">
            What happened after this decision was made?
          </p>
          <textarea
            ref={outcomeRef}
            id={`reflection-outcome-${decisionId}`}
            value={outcome}
            onChange={handleOutcomeChange}
            rows={3}
            placeholder="e.g., I completed the project in July. It went well, but took longer than planned..."
            aria-invalid={!!errors.outcome}
            aria-describedby={errors.outcome ? `outcome-error-${decisionId}` : undefined}
            className={`w-full px-3.5 py-2.5 bg-[#FCF8F7] border rounded-lg text-[14.5px] text-[#18233F] placeholder-[#9BA5B7] focus:outline-none focus:ring-2 focus:ring-[#18233F] transition-all resize-y ${
              errors.outcome ? 'border-[#85273C] bg-[#FFF8F8]' : 'border-[#EBDDDD] hover:border-[#C76C82]'
            }`}
          />
          {errors.outcome && (
            <p
              id={`outcome-error-${decisionId}`}
              role="alert"
              className="text-[12.5px] text-[#85273C] font-medium pt-0.5"
            >
              {errors.outcome}
            </p>
          )}
        </div>

        {/* What would change field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline gap-2">
            <label
              htmlFor={`reflection-what-would-change-${decisionId}`}
              className="block text-[13.5px] font-semibold text-[#18233F]"
            >
              What would I change? <span className="text-[#9E2D46]">*</span>
            </label>
            <span
              className={`text-[12px] ${
                whatWouldChange.length >= MAX_REFLECTION_LENGTH
                  ? 'text-[#85273C] font-semibold'
                  : 'text-[#7D889F]'
              }`}
            >
              {whatWouldChange.length}/{MAX_REFLECTION_LENGTH}
            </span>
          </div>
          <p className="text-[12.5px] text-[#5C667E]">
            What would you change if you faced this decision again?
          </p>
          <textarea
            ref={whatWouldChangeRef}
            id={`reflection-what-would-change-${decisionId}`}
            value={whatWouldChange}
            onChange={handleWhatWouldChangeChange}
            rows={3}
            placeholder="e.g., I would set clearer milestones from the start and budget more buffer..."
            aria-invalid={!!errors.whatWouldChange}
            aria-describedby={errors.whatWouldChange ? `what-would-change-error-${decisionId}` : undefined}
            className={`w-full px-3.5 py-2.5 bg-[#FCF8F7] border rounded-lg text-[14.5px] text-[#18233F] placeholder-[#9BA5B7] focus:outline-none focus:ring-2 focus:ring-[#18233F] transition-all resize-y ${
              errors.whatWouldChange
                ? 'border-[#85273C] bg-[#FFF8F8]'
                : 'border-[#EBDDDD] hover:border-[#C76C82]'
            }`}
          />
          {errors.whatWouldChange && (
            <p
              id={`what-would-change-error-${decisionId}`}
              role="alert"
              className="text-[12.5px] text-[#85273C] font-medium pt-0.5"
            >
              {errors.whatWouldChange}
            </p>
          )}
        </div>

        {/* Status dropdown (optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor={`reflection-status-${decisionId}`}
            className="block text-[13.5px] font-semibold text-[#18233F]"
          >
            Status <span className="text-[12px] font-normal text-[#5C667E]">(optional)</span>
          </label>
          <div className="relative">
            <select
              id={`reflection-status-${decisionId}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as ReflectionStatus)}
              className="w-full sm:w-64 px-3.5 py-2 bg-[#FCF8F7] border border-[#EBDDDD] hover:border-[#C76C82] rounded-lg text-[14px] text-[#18233F] focus:outline-none focus:ring-2 focus:ring-[#18233F] transition-all cursor-pointer"
            >
              <option value="resolved">Resolved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {errors.status && (
            <p role="alert" className="text-[12.5px] text-[#85273C] font-medium pt-0.5">
              {errors.status}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            id={`save-reflection-button-${decisionId}`}
            disabled={isSubmitting}
            className="bg-[#18233F] hover:bg-[#25345C] disabled:bg-[#8A94A6] text-white font-medium text-[14px] px-5 py-2.5 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F]"
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
              ? 'Update reflection'
              : 'Save reflection'}
          </button>

          {onCancel && (
            <button
              type="button"
              id={`cancel-reflection-button-${decisionId}`}
              onClick={onCancel}
              disabled={isSubmitting}
              className="border border-[#EBDDDD] bg-white hover:bg-[#FCF8F7] text-[#18233F] font-medium text-[14px] px-4 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
