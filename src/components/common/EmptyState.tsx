import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => {
  return (
    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-800">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        </div>
      )}
    </div>
  );
};
