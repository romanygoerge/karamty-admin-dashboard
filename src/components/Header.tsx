import React from 'react';
import { Search, Bell, ShieldCheck, ExternalLink } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  onSearchChange,
  showSearch = true
}) => {
  return (
    <header className="h-20 bg-slate-900/60 border-b border-slate-800/80 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="بحث سريع في السجلات..."
              className="w-full bg-slate-800/90 text-sm text-slate-200 placeholder-slate-400 rounded-xl pr-10 pl-4 py-2 border border-slate-700/60 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>
        )}

        <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام الإدارة نشط</span>
          </div>

          <a
            href="https://supabase.com/dashboard/project/vbkfmiadtdzzifwhyjgx"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <span>لوحة Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
