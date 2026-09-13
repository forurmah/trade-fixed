import React from 'react';
import { Decision } from '../types';
import { DecisionCard } from './DecisionCard';
import { DemoNotice } from './DemoNotice';

interface MyDecisionsListProps {
  decisions: Decision[];
  onOpenAddDecision: () => void;
  onViewDecision: (id: string) => void;
  confirmationMessage: string | null;
  onDismissConfirmation?: () => void;
}

export const MyDecisionsList: React.FC<MyDecisionsListProps> = ({
  decisions,
  onOpenAddDecision,
  onViewDecision,
  confirmationMessage,
  onDismissConfirmation,
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

      {/* Decision Cards or Empty State */}
      <section aria-labelledby="my-decisions-heading" className="pt-2">
        {decisions.length === 0 ? (
          /* Empty State */
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
              <h2 className="font-serif-heading text-[20px] sm:text-[22px] font-semibold text-[#18233F]">
                No decisions yet.
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
