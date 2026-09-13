import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Decision } from '../types';
import { DecisionCard } from './DecisionCard';
import { DemoNotice } from './DemoNotice';

interface MyDecisionsListProps {
  decisions: Decision[];
  loadError?: string | null;
  onOpenAddDecision: () => void;
  onViewDecision: (id: string) => void;
  confirmationMessage: string | null;
  onDismissConfirmation?: () => void;
  onRetryLoad?: () => void;
}

export const MyDecisionsList: React.FC<MyDecisionsListProps> = ({
  decisions,
  loadError = null,
  onOpenAddDecision,
  onViewDecision,
  confirmationMessage,
  onDismissConfirmation,
  onRetryLoad,
}) => {
  return (
    <div className="space-y-6 min-w-0">
      {/* Accessible Confirmation Banner (Announces addition to assistive tech) */}
      {confirmationMessage && (
        <div
          role="status"
          aria-live="polite"
          className="w-full bg-[#EBF5EF] border border-[#C5E3D0] text-[#1E5631] px-4 py-3 rounded-xl flex items-center justify-between text-[14px] font-medium animate-fadeIn min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true" className="text-base shrink-0">✓</span>
            <span className="break-words [overflow-wrap:anywhere]">{confirmationMessage}</span>
          </div>
          {onDismissConfirmation && (
            <button
              type="button"
              onClick={onDismissConfirmation}
              className="text-[#1E5631] hover:text-[#11311c] text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer shrink-0 ml-2"
              aria-label="Dismiss confirmation message"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Top Header Row with Title and "+ Add decision" button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1
            id="my-decisions-heading"
            className="font-serif-heading text-[32px] sm:text-[40px] text-[#18233F] font-semibold tracking-tight leading-tight break-words [overflow-wrap:anywhere]"
          >
            My Decisions
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#5C667E] mt-1 leading-normal">
            Record your choices. Learn from what happens.
          </p>
        </div>

        <div>
          <button
            type="button"
            id="add-decision-top-button"
            onClick={onOpenAddDecision}
            className="inline-flex items-center gap-2 bg-[#18233F] hover:bg-[#25345C] active:bg-[#11192E] text-white text-[14.5px] font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] focus-visible:ring-offset-2 shrink-0"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            <span>Add decision</span>
          </button>
        </div>
      </div>

      {/* Persistent Demo Notice */}
      <DemoNotice />

      {/* Decision Cards or Empty / Error State */}
      <section aria-labelledby="my-decisions-heading" className="pt-2">
        {/* Warning banner when partial items failed to load */}
        {loadError && decisions.length > 0 && (
          <div
            role="alert"
            id="partial-decisions-load-warning"
            data-testid="loading-error-message"
            className="mb-4 w-full bg-[#FDF2F4] border border-[#F1D3D7] text-[#85273C] px-4 py-3 rounded-xl flex items-center justify-between text-[14px] font-medium min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#9E2D46]" aria-hidden="true" />
              <span className="break-words [overflow-wrap:anywhere]">{loadError}</span>
            </div>
            {onRetryLoad && (
              <button
                type="button"
                id="retry-partial-load-button"
                data-testid="retry-button"
                onClick={onRetryLoad}
                className="ml-3 shrink-0 inline-flex items-center gap-1.5 bg-[#9E2D46] hover:bg-[#7A1E33] text-white text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46]"
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {loadError && decisions.length === 0 ? (
          /* Error State: Saved decisions couldn't be loaded */
          <div
            id="decisions-load-error-state"
            data-testid="loading-error-message"
            role="alert"
            className="bg-white border border-[#F1D3D7] rounded-[12px] p-8 sm:p-12 text-center space-y-4 shadow-sm"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FDF2F4] border border-[#F1D3D7] flex items-center justify-center text-[#9E2D46]">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h2
                id="saved-decisions-couldnt-be-loaded-heading"
                className="font-serif-heading text-[20px] sm:text-[22px] font-semibold text-[#18233F]"
              >
                Saved decisions couldn’t be loaded
              </h2>
              <p className="text-[14.5px] text-[#5C667E] max-w-[460px] mx-auto leading-relaxed">
                {loadError}
              </p>
              <p
                id="data-preservation-notice"
                data-testid="data-preservation-notice"
                className="text-[13px] text-[#85273C] font-medium max-w-[440px] mx-auto pt-1"
              >
                Your original stored data was preserved and was not overwritten.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {onRetryLoad && (
                <button
                  type="button"
                  id="retry-load-decisions-button"
                  data-testid="retry-button"
                  onClick={onRetryLoad}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#18233F] hover:bg-[#25345C] active:bg-[#11192E] text-white text-[14.5px] font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] focus-visible:ring-offset-2"
                >
                  <RotateCw className="w-4 h-4" aria-hidden="true" />
                  <span>Retry</span>
                </button>
              )}
              <button
                type="button"
                id="create-decision-fallback-button"
                onClick={onOpenAddDecision}
                className="w-full sm:w-auto bg-white border border-[#D5D8E2] hover:border-[#18233F] text-[#18233F] text-[14.5px] font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] focus-visible:ring-offset-2"
              >
                + Add decision
              </button>
            </div>
          </div>
        ) : decisions.length === 0 ? (
          /* Empty State: No saved decisions */
          <div
            id="empty-decisions-state"
            className="bg-white border border-[#EBDDDD] rounded-[12px] p-8 sm:p-12 text-center space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-[#FCF8F7] border border-[#EBDDDD] flex items-center justify-center text-[#C76C82]">
              {/* Linked circles icon mark */}
              <div className="relative w-6 h-5 flex items-center" aria-hidden="true">
                <span className="absolute left-0 w-3.5 h-3.5 rounded-full bg-[#C76C82]/80" />
                <span className="absolute left-2 w-3.5 h-3.5 rounded-full border border-[#18233F] bg-transparent" />
              </div>
            </div>

            <div className="space-y-1">
              <h2
                id="no-saved-decisions-heading"
                className="font-serif-heading text-[20px] sm:text-[22px] font-semibold text-[#18233F]"
              >
                No saved decisions
              </h2>
              <p className="text-[14.5px] text-[#5C667E] max-w-[360px] mx-auto">
                Start with a real choice you’re thinking about.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="create-first-decision-button"
                onClick={onOpenAddDecision}
                className="bg-[#18233F] hover:bg-[#25345C] active:bg-[#11192E] text-white text-[14.5px] font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18233F] focus-visible:ring-offset-2"
              >
                Create your first decision
              </button>
            </div>
          </div>
        ) : (
          /* List of Decisions (Newest first) */
          <div className="space-y-4 min-w-0" id="decisions-list-container">
            {decisions.map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onView={onViewDecision}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
