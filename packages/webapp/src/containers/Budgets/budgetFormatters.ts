export const fmt = (n: number) => n.toLocaleString('ru-RU');

export const fmtPct = (v: number | null) =>
  v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`;
