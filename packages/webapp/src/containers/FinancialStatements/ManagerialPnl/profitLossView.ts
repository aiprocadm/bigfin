/**
 * Какой ОПиУ показать: управленческий или бухгалтерский (FT-010 ТЗ-3).
 *
 * Выбор в адресе важнее режима: ссылку «посмотри бухгалтерский ОПиУ»
 * пересылают, и открыться она обязана тем же видом. Без выбора — по режиму
 * интерфейса: «Бухгалтер» видит ОПиУ по плану счетов, «Бизнес» — лестницу
 * прибыли.
 */
export type ProfitLossView = 'managerial' | 'accounting';

export function profitLossViewOf(search: string, isAccountantMode: boolean): ProfitLossView {
  const view = new URLSearchParams(search).get('view');
  if (view === 'managerial' || view === 'accounting') return view;
  return isAccountantMode ? 'accounting' : 'managerial';
}
