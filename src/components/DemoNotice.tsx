import React from 'react';

export const DemoNotice: React.FC = () => {
  return (
    <div
      role="note"
      aria-label="Demo mode notice"
      className="w-full bg-[#FCEEED] border border-[#EBDDDD] rounded-xl px-4 py-3 flex items-center gap-2.5 text-[13.5px] font-medium text-[#454F63]"
    >
      {/* Subtle info icon circle */}
      <span
        className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full border border-[#9E2D46]/60 text-[#9E2D46] text-[11px] font-serif font-bold shrink-0"
        aria-hidden="true"
      >
        i
      </span>
      <span>
        Decisions are saved in Local Storage and persist across refreshes.
      </span>
    </div>
  );
};
