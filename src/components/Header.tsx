import React from 'react';

interface HeaderProps {
  onNavClick: () => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavClick, currentView }) => {
  return (
    <header className="w-full bg-[#FCF8F7] border-b border-[#EBDDDD]/80 sticky top-0 z-30">
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Mark & Wordmark */}
        <button
          type="button"
          onClick={onNavClick}
          className="flex items-center gap-2.5 select-none text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] rounded-md py-1"
          id="brand-logo-button"
          aria-label="Tradeoff home - view my decisions"
        >
          {/* Linked circle mark matching Tradeoff identity */}
          <div className="relative w-7 h-6 flex items-center" aria-hidden="true">
            {/* Left filled rose circle */}
            <span
              className="absolute left-0 w-4.5 h-4.5 rounded-full bg-[#C76C82]"
              style={{ opacity: 0.9 }}
            />
            {/* Right overlapping navy stroke circle */}
            <span
              className="absolute left-2.5 w-4.5 h-4.5 rounded-full border-2 border-[#18233F] bg-transparent"
            />
          </div>
          <span
            className="font-serif-heading text-[22px] text-[#18233F] font-semibold tracking-tight group-hover:text-[#9E2D46] transition-colors"
          >
            tradeoff
          </span>
        </button>

        {/* Right side: Demo badge and navigation link */}
        <div className="flex items-center gap-3 sm:gap-4">
          {currentView !== 'list' && (
            <button
              type="button"
              id="header-nav-my-decisions"
              onClick={onNavClick}
              className="text-[13px] sm:text-[14px] text-[#18233F] hover:text-[#9E2D46] font-medium transition-colors cursor-pointer py-1 px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] rounded"
            >
              My decisions
            </button>
          )}

          <div
            id="demo-mode-badge"
            className="px-2.5 py-0.5 rounded-full bg-[#F5E6E8] border border-[#EBDDDD] text-[#9E2D46] text-[11px] font-bold uppercase tracking-wider select-none"
            title="Local storage enabled: data persists across refreshes"
          >
            DEMO
          </div>
        </div>
      </div>
    </header>
  );
};
