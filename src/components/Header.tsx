import React from 'react';
import { Search, ShieldCheck, ExternalLink, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  showSearch = true,
  onOpenMobileMenu
}) => {
  return (
    <header className="h-16 md:h-20 bg-slate-900/80 border-b border-slate-800/80 px-3.5 sm:px-6 md:px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 transition-all">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -mr-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
          aria-label="فتح القائمة الرئيسية"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-wide truncate">{title}</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {showSearch && (
          <div className="relative w-36 sm:w-56 md:w-72 hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="بحث سريع..."
              className="w-full bg-slate-800/90 text-xs sm:text-sm text-slate-200 placeholder-slate-400 rounded-xl pr-9 pl-3 py-1.5 sm:py-2 border border-slate-700/60 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 sm:pr-3 sm:border-r sm:border-slate-800">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] sm:text-xs font-semibold whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">نظام الإدارة نشط</span>
            <span className="sm:hidden">نشط</span>
          </div>

          <a
            href="https://supabase.com/dashboard/project/vbkfmiadtdzzifwhyjgx"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="فتح لوحة تحكم Supabase"
          >
            <span>Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};

