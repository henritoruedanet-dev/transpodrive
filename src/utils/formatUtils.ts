/**
 * SaaS UI Design System: Currency & Formatting Utilities
 * Centralized formatting for Bolivianos (Bs.) and metrics.
 */

/**
 * Formatea un número como moneda boliviana con precisión contable (2 decimales).
 * Incluye tabular-nums para alineación matemática en tablas y tarjetas.
 */
export function formatBs(amount: number | string | null | undefined, includeSymbol: boolean = true): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return includeSymbol ? `Bs. ${formatted}` : formatted;
}

/**
 * Formatea porcentaje con 1 o 2 decimales.
 */
export function formatPercent(value: number | string | null | undefined, decimals: number = 1): string {
  const num = Number(value) || 0;
  return `${num.toFixed(decimals)}%`;
}

/**
 * Limpia y normaliza cadenas de ID para coincidencia segura case-insensitive.
 */
export function normalizeId(id: string | null | undefined): string {
  return String(id || '').trim();
}

/**
 * Determina color contextual según valor neto financiero (Superávit vs Déficit).
 */
export function getFinanceBadgeColor(amount: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (amount > 0) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      label: 'Superávit'
    };
  }
  if (amount < 0) {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      label: 'Déficit'
    };
  }
  return {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200/80',
    label: 'Equilibrado'
  };
}
