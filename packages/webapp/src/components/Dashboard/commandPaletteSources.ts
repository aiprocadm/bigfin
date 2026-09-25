import type { CommandItem } from '@/components/ui/command-search';

/**
 * Разбор и сборка для командной строки (UI-045-4 ТЗ-4) — без React, чтобы
 * проверять тестами.
 */

/**
 * Сумма, если человек набрал сумму: «500 000», «1 612 400,50», «250000 ₽».
 * Иначе `null` — строку ищут как текст.
 *
 * Пробелы — и обычные, и неразрывные: сумму часто копируют из отчёта, а там
 * разряды разделены неразрывным пробелом. Запятая и точка — обе как
 * десятичный знак: у нас пишут «,», а цифровая клавиатура телефона даёт «.».
 */
export function parseAmountQuery(query: string): number | null {
  const compact = String(query ?? '')
    .replace(/[\s  ]/g, '')
    .replace(/(?:₽|руб\.?|р\.?)$/i, '')
    .replace(',', '.');

  if (!/^\d+(?:\.\d{1,2})?$/.test(compact)) return null;

  const value = Number(compact);
  return value > 0 ? value : null;
}

/** Адрес реестра с операциями ровно на эту сумму — в этот день или за всё время. */
export function registryAmountLink(amount: number, date?: string | null): string {
  const params = new URLSearchParams();
  // Без периода реестр показал бы текущий месяц, и операция прошлого года
  // «не нашлась» бы. Начало — заведомо раньше любой записи.
  params.set('fromDate', date || '2000-01-01');
  params.set('toDate', date || '2099-12-31');
  params.set('minAmount', String(amount));
  params.set('maxAmount', String(amount));
  return `/cashflow-accounts/transactions?${params.toString()}`;
}

/** Строка реестра, как её отдаёт `/api/banking/transactions`. */
export interface RegistryRow {
  reference_type?: string;
  reference_id?: number | string;
  date?: string;
  formatted_date?: string;
  contact_name?: string | null;
  note?: string | null;
  account_name?: string | null;
  deposit?: number | string;
  formatted_deposit?: string;
  formatted_withdrawal?: string;
}

/** Найденная операция пунктом командной строки: «+500 000,00 ₽ · Ромашка». */
export function registryRowToCommand(
  row: RegistryRow,
  amount: number,
  group: string,
  navigate: (href: string) => void,
): CommandItem {
  const isDeposit = Number(row.deposit) > 0;
  const money = isDeposit ? row.formatted_deposit : row.formatted_withdrawal;
  // Знак, как в самом реестре (UI-042-8): приход и расход на одну сумму иначе
  // не различить.
  const signed = money ? `${isDeposit ? '+' : '−'}${money}` : String(amount);
  // Кто или за что. Счёт сюда не идёт: он и так в подписи ниже, и строка
  // «+31 500 · Расчётный счёт» над «20.09 · Расчётный счёт» повторялась.
  const who = row.contact_name || row.note || '';

  return {
    id: `operation-${row.reference_type ?? ''}-${row.reference_id ?? ''}`,
    group,
    title: who ? `${signed} · ${who}` : signed,
    subtitle: [row.formatted_date, row.account_name].filter(Boolean).join(' · '),
    onSelect: () => navigate(registryAmountLink(amount, row.date)),
  };
}
