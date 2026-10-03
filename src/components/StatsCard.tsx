import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  gradient?: string;
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  gradient = 'from-brand-600/20 to-brand-400/5',
  description
}) => {
  return (
    <div className={`p-5 rounded-2xl glass-card relative overflow-hidden bg-gradient-to-br ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-brand-400 shadow-inner">
          {icon}
        </div>
      </div>

      {(change || description) && (
        <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
          {change && (
            <span
              className={`font-semibold flex items-center gap-1 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '▲' : '▼'} {change}
            </span>
          )}
          {description && (
            <span className="text-slate-400 text-[11px] truncate max-w-[180px]">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
