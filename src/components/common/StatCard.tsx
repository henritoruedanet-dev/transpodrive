import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: 'neutral' | 'success' | 'danger' | 'info';
  };
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  variant?: 'default' | 'success' | 'danger' | 'blue';
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  variant = 'default',
  className = '',
  onClick
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200/80 text-slate-900',
    success: 'bg-white border-emerald-200/80 text-emerald-900',
    danger: 'bg-white border-rose-200/80 text-rose-900',
    blue: 'bg-white border-blue-200/80 text-blue-900'
  };

  const badgeStyles = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    info: 'bg-blue-50 text-blue-700 border-blue-200/70'
  };

  const iconColors = {
    default: 'text-slate-500 bg-slate-100/80',
    success: 'text-emerald-600 bg-emerald-50',
    danger: 'text-rose-600 bg-rose-50',
    blue: 'text-blue-600 bg-blue-50'
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs active:scale-[0.99]' : ''
      } ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 truncate">
          {title}
        </span>
        {badge && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              badgeStyles[badge.variant || 'neutral']
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 ${
              iconColors[variant]
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-1 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
