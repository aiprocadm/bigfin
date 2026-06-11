// © 2026 Bigfin
import intl from 'react-intl-universal';

/** Money formatting — same pattern as Payroll/Debts pages. */
export const fmt = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

/** Formats an ISO date as a short ru-RU date; falls back to raw value. */
export const fmtDate = (value: string | undefined | null) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

/** Formats 'YYYY-MM' as «месяц год»; falls back to raw value. */
export const fmtMonth = (value: string | undefined | null) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}-01`));
  } catch {
    return value;
  }
};

/** Human label for a reference type; raw type when no translation exists. */
export const refTypeLabel = (referenceType: string | undefined | null) => {
  if (!referenceType) return '';
  return intl.get(`data_quality.ref_type.${referenceType}`) || referenceType;
};
