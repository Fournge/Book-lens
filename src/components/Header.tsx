import React from 'react';
import { BookOpen, Camera, Bookmark, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'scan' | 'search' | 'shelf';
  setActiveTab: (tab: 'scan' | 'search' | 'shelf') => void;
  shelfCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  shelfCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fbf9f5]/95 backdrop-blur-md border-b border-[#e7e3da] w-full max-w-full overflow-hidden transition-all">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveTab('scan')}
          className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group shrink-0 cursor-pointer min-w-0"
          id="brand-logo-btn"
        >
          <img
            src="/favicon.svg"
            alt="BookLens Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-serif font-bold text-base sm:text-lg text-[#1d2430] tracking-tight whitespace-nowrap">
                BookLens
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200/80 whitespace-nowrap shrink-0 hidden xs:inline-block">
                AI Scout
              </span>
            </div>
            <p className="text-[11px] text-[#6b7787] hidden md:block whitespace-nowrap">
              Visual Cover Recognition &amp; Reading Intelligence
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae6dd]'
            }`}
            id="nav-scan-btn"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Camera &amp; Upload</span>
            <span className="sm:hidden">Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae6dd]'
            }`}
            id="nav-search-btn"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab('shelf')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap cursor-pointer ${
              activeTab === 'shelf'
                ? 'bg-[#1d2430] text-white shadow-xs'
                : 'text-[#4b5563] hover:text-[#1d2430] hover:bg-[#eae6dd]'
            }`}
            id="nav-shelf-btn"
          >
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">My Shelf</span>
            <span className="sm:hidden">Shelf</span>
            {shelfCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-0.5 shrink-0 ${
                  activeTab === 'shelf'
                    ? 'bg-amber-400 text-[#1d2430]'
                    : 'bg-[#1d2430] text-white'
                }`}
              >
                {shelfCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
