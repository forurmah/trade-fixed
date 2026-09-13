import React from 'react';
import { Decision } from '../types';

interface DecisionCardProps {
  decision: Decision;
  onView: (id: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, onView }) => {
  // Format the ISO timestamp into a readable date like "September 9, 2026"
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

  const chosenText = decision.chosenOption === 'A' ? decision.optionA : decision.optionB;

  return (
    <article
      id={`decision-card-${decision.id}`}
      className="bg-white border border-[#EBDDDD] rounded-[12px] p-5 sm:p-6 transition-all hover:border-[#C76C82]/50 hover:shadow-xs min-w-0 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 min-w-0">
        {/* Left info */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="font-serif-heading text-[19px] sm:text-[21px] font-semibold text-[#18233F] leading-snug break-words [overflow-wrap:anywhere]">
            {decision.title}
          </h3>

          <p className="text-[13px] font-medium text-[#4F596F]">
            {formattedDate}
          </p>

          <p className="text-[14.5px] text-[#18233F] pt-0.5 break-words [overflow-wrap:anywhere]">
            <span className="text-[#4F596F] font-normal">Chosen: </span>
            <span className="font-medium break-words [overflow-wrap:anywhere]">{chosenText}</span>
          </p>

          <div className="pt-2">
            <span
              className="inline-block px-3 py-1 rounded-full bg-[#F5EEEE] text-[#3B4659] text-[12px] font-semibold border border-[#EBDDDD]/80"
            >
              Awaiting reflection
            </span>
          </div>
        </div>

        {/* Action: View decision */}
        <div className="pt-2 sm:pt-0 sm:self-end shrink-0">
          <button
            type="button"
            id={`view-decision-${decision.id}`}
            onClick={() => onView(decision.id)}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#18233F] hover:text-[#9E2D46] transition-colors cursor-pointer py-1.5 px-2 -ml-2 sm:ml-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46]"
            aria-label={`View decision: ${decision.title}`}
          >
            <span>View decision</span>
            <span aria-hidden="true" className="text-[15px]">↗</span>
          </button>
        </div>
      </div>
    </article>
  );
};
