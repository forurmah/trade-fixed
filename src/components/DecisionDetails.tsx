import React, { useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Decision } from '../types';
import { DemoNotice } from './DemoNotice';

interface DecisionDetailsProps {
  decision: Decision | undefined;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  confirmationMessage?: string | null;
  onDismissConfirmation?: () => void;
}

export const DecisionDetails: React.FC<DecisionDetailsProps> = ({
  decision,
  onBack,
  onEdit,
  onDelete,
  confirmationMessage,
  onDismissConfirmation,
}) => {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConfirmedDelete = () => {
    if (!decision) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      // Persist the deletion before updating React state or navigating
      onDelete(decision.id);
    } catch (err: any) {
      console.error('Failed to delete decision:', err);
      // If saving fails, remain on details screen and show accessible error
      setDeleteError(
        err?.message ||
          'Failed to delete decision due to a storage error. Original stored data was preserved.'
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  if (!decision) {
    return (
      <div
        id="decision-not-found-state"
        className="bg-white border border-[#EBDDDD] rounded-[12px] p-8 sm:p-12 text-center space-y-4"
      >
        <h2 className="font-serif-heading text-[22px] font-semibold text-[#18233F]">
          Decision not found
        </h2>
        <p className="text-[14.5px] text-[#5C667E] max-w-[360px] mx-auto">
          This record may have been cleared when the browser refreshed or the link is invalid.
        </p>
        <div className="pt-2">
          <button
            type="button"
            id="back-from-not-found-button"
            onClick={onBack}
            className="bg-[#18233F] hover:bg-[#25345C] text-white text-[14.5px] font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F]"
          >
            ← Back to decisions
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = (() => {
    try {
      return new Date(decision.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  })();

  const isOptionAChecked = decision.chosenOption === 'A';
  const isOptionBChecked = decision.chosenOption === 'B';

  return (
    <div className="space-y-6">
      {/* Success Confirmation Announcement Banner */}
      {confirmationMessage && (
        <div
          role="status"
          aria-live="polite"
          id="detail-confirmation-banner"
          className="w-full bg-[#EBF5EF] border border-[#C5E3D0] text-[#1E5631] px-4 py-3 rounded-xl flex items-center justify-between text-[14px] font-medium animate-fadeIn min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true" className="text-base shrink-0">✓</span>
            <span className="break-words [overflow-wrap:anywhere]">{confirmationMessage}</span>
          </div>
          {onDismissConfirmation && (
            <button
              type="button"
              id="dismiss-detail-confirmation-button"
              onClick={onDismissConfirmation}
              className="text-[#1E5631] hover:text-[#11311c] text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer shrink-0 ml-2"
              aria-label="Dismiss confirmation message"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Accessible Error Banner on Delete Failure */}
      {deleteError && (
        <div
          role="alert"
          aria-live="assertive"
          id="detail-delete-error-banner"
          className="w-full bg-[#FDF2F4] border border-[#F1D3D7] text-[#85273C] px-4 py-3 rounded-xl flex items-center justify-between text-[14px] font-medium animate-fadeIn min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#9E2D46]" aria-hidden="true" />
            <span className="break-words [overflow-wrap:anywhere]">{deleteError}</span>
          </div>
          <button
            type="button"
            id="dismiss-detail-delete-error-button"
            onClick={() => setDeleteError(null)}
            className="text-[#85273C] hover:text-[#561423] text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer shrink-0 ml-2"
            aria-label="Dismiss error message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Back Link */}
      <div>
        <button
          type="button"
          id="details-back-to-decisions-link"
          onClick={onBack}
          className="text-[13.5px] sm:text-[14px] text-[#9E2D46] hover:text-[#7A1E33] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] rounded py-1 -ml-1 px-1"
        >
          <span aria-hidden="true">←</span>
          <span>My Decisions</span>
        </button>
      </div>

      {/* Main Details Panel */}
      <article
        id={`decision-detail-${decision.id}`}
        className="bg-white border border-[#EBDDDD] rounded-[12px] p-6 sm:p-8 space-y-7 min-w-0 overflow-hidden"
      >
        {/* Title and Metadata */}
        <div className="space-y-2.5 min-w-0">
          <h1 className="font-serif-heading text-[26px] sm:text-[34px] font-semibold text-[#18233F] leading-tight tracking-tight break-words [overflow-wrap:anywhere]">
            {decision.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-[#EBDDDD]/60 pb-4">
            <span className="text-[14px] font-medium text-[#4F596F]">
              {formattedDate}
            </span>

            <span
              className="px-3 py-1 rounded-full bg-[#F5EEEE] text-[#3B4659] text-[12px] font-semibold border border-[#EBDDDD]/80 shrink-0"
            >
              Awaiting reflection
            </span>
          </div>
        </div>

        {/* Options Comparison */}
        <div className="space-y-3.5 min-w-0">
          {/* Option A */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-colors min-w-0 ${
              isOptionAChecked
                ? 'bg-[#FCF5F6] border-[#9E2D46]/40'
                : 'bg-white border-[#EBDDDD]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[11.5px] font-semibold uppercase tracking-wider ${
                  isOptionAChecked ? 'text-[#9E2D46]' : 'text-[#4F596F]'
                }`}
              >
                {isOptionAChecked ? 'Option A • Chosen' : 'Option A'}
              </span>
              {isOptionAChecked && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-[#9E2D46] shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            <p className={`text-[16px] sm:text-[17px] break-words [overflow-wrap:anywhere] ${isOptionAChecked ? 'font-medium text-[#18233F]' : 'text-[#5C667E]'}`}>
              {decision.optionA}
            </p>
          </div>

          {/* Option B */}
          <div
            className={`p-4 sm:p-5 rounded-xl border transition-colors min-w-0 ${
              isOptionBChecked
                ? 'bg-[#FCF5F6] border-[#9E2D46]/40'
                : 'bg-white border-[#EBDDDD]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[11.5px] font-semibold uppercase tracking-wider ${
                  isOptionBChecked ? 'text-[#9E2D46]' : 'text-[#4F596F]'
                }`}
              >
                {isOptionBChecked ? 'Option B • Chosen' : 'Option B'}
              </span>
              {isOptionBChecked && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-[#9E2D46] shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            <p className={`text-[16px] sm:text-[17px] break-words [overflow-wrap:anywhere] ${isOptionBChecked ? 'font-medium text-[#18233F]' : 'text-[#5C667E]'}`}>
              {decision.optionB}
            </p>
          </div>
        </div>

        {/* Reason Section */}
        <div className="space-y-2 pt-2 border-t border-[#EBDDDD]/60 min-w-0">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#4F596F]">
            Why I chose this
          </h2>
          <div className="bg-[#FCF8F7] border border-[#EBDDDD] rounded-xl p-4 sm:p-5 min-w-0">
            <p className="text-[15.5px] text-[#18233F] leading-relaxed whitespace-pre-wrap font-normal break-words [overflow-wrap:anywhere]">
              {decision.reason}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 sm:pt-5 border-t border-[#EBDDDD]/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              id="back-to-decisions-bottom-button"
              onClick={onBack}
              disabled={isDeleting}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FCF8F7] border border-[#EBDDDD] hover:border-[#18233F]/30 text-[#18233F] text-[14.5px] sm:text-[15px] font-medium px-5 py-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span aria-hidden="true">←</span>
              <span>Back to decisions</span>
            </button>
            <button
              type="button"
              id="edit-decision-button"
              onClick={() => onEdit(decision.id)}
              disabled={isDeleting}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#18233F] hover:bg-[#25345C] text-white text-[14.5px] sm:text-[15px] font-medium px-6 py-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil className="w-4 h-4 text-white/80" aria-hidden="true" />
              <span>Edit decision</span>
            </button>
          </div>

          <button
            type="button"
            id="delete-decision-button"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm((prev) => !prev);
            }}
            disabled={isDeleting}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-transparent hover:bg-[#FDF2F4] text-[#85273C] hover:text-[#561423] border border-[#F1D3D7] hover:border-[#85273C] text-[14.5px] font-medium px-4.5 py-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#85273C] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Delete decision ${decision.title}`}
            aria-expanded={showDeleteConfirm}
          >
            <span>{isDeleting ? 'Deleting...' : 'Delete decision'}</span>
          </button>
        </div>

        {/* In-app confirmation dialog (works reliably in sandboxed iframes) */}
        {showDeleteConfirm && (
          <div
            role="region"
            aria-label="Confirm decision deletion"
            id="delete-confirmation-prompt"
            className="w-full bg-[#FFF5F6] border border-[#F1D3D7] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-fadeIn mt-2"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-[#85273C] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[14.5px] text-[#561423] font-medium break-words">
                  Are you sure you want to delete <strong className="font-semibold">"{decision.title}"</strong>?
                </p>
                <p className="text-[13px] text-[#85273C] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
              <button
                type="button"
                id="cancel-delete-button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 rounded-xl border border-[#EBDDDD] bg-white hover:bg-[#F7F2F1] text-[#18233F] text-[14px] font-medium cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-button"
                onClick={handleConfirmedDelete}
                disabled={isDeleting}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl bg-[#85273C] hover:bg-[#681E2F] text-white text-[14px] font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#85273C] disabled:opacity-50 inline-flex items-center justify-center"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Demo Notice */}
      <DemoNotice />
    </div>
  );
};
