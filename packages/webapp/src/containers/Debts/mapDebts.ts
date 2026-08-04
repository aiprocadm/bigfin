/**
 * Разбор ответов модуля долгов (⑭).
 *
 * Сервер отдаёт поля в snake_case (`overdue_total`, `contact_name`,
 * `due_amount`), а страницы читали их в camelCase. Последствия видны глазом:
 * «Просрочено» всегда 0 при заполненной корзине просрочки рядом, должник без
 * имени, а детализация по документам не открывается вовсе — запрос уходил
 * с пустым идентификатором контрагента.
 */
export interface DebtContact {
  contactId: number;
  contactName: string;
  current: number;
  total: number;
  overdueTotal: number;
  buckets: number[];
  worstBucketIndex: number;
}

export interface DebtsSide {
  total: number;
  current: number;
  overdueTotal: number;
  buckets: number[];
  contacts: DebtContact[];
  top: DebtContact[];
}

export interface DebtsOverview {
  receivable: DebtsSide;
  payable: DebtsSide;
  net: number;
  baseCurrency: string;
  asDate: string;
}

export interface DebtDocument {
  id: number;
  side: string;
  number: string;
  date: string;
  total: number;
  dueDate: string;
  dueAmount: number;
  overdueDays: number;
}

const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (raw: any, snake: string, camel: string): unknown =>
  raw?.[snake] ?? raw?.[camel];

export const mapDebtContact = (raw: any): DebtContact => ({
  contactId: num(pick(raw, 'contact_id', 'contactId')),
  contactName: (pick(raw, 'contact_name', 'contactName') as string) ?? '',
  current: num(raw?.current),
  total: num(raw?.total),
  overdueTotal: num(pick(raw, 'overdue_total', 'overdueTotal')),
  buckets: (raw?.buckets ?? []).map((b: unknown) => num(b)),
  worstBucketIndex: num(
    pick(raw, 'worst_bucket_index', 'worstBucketIndex'),
    -1,
  ),
});

const mapSide = (raw: any): DebtsSide => ({
  total: num(raw?.total),
  current: num(raw?.current),
  overdueTotal: num(pick(raw, 'overdue_total', 'overdueTotal')),
  buckets: (raw?.buckets ?? [0, 0, 0, 0]).map((b: unknown) => num(b)),
  contacts: (raw?.contacts ?? []).map(mapDebtContact),
  top: (raw?.top ?? []).map(mapDebtContact),
});

export const mapDebtsOverview = (raw: any): DebtsOverview => ({
  receivable: mapSide(raw?.receivable),
  payable: mapSide(raw?.payable),
  net: num(raw?.net),
  baseCurrency: (pick(raw, 'base_currency', 'baseCurrency') as string) ?? 'RUB',
  asDate: (pick(raw, 'as_date', 'asDate') as string) ?? '',
});

export const mapDebtDocument = (raw: any): DebtDocument => ({
  id: num(raw?.id),
  side: raw?.side ?? '',
  number: raw?.number ?? '',
  date: String(raw?.date ?? '').slice(0, 10),
  total: num(raw?.total),
  dueDate: String(pick(raw, 'due_date', 'dueDate') ?? '').slice(0, 10),
  dueAmount: num(pick(raw, 'due_amount', 'dueAmount')),
  overdueDays: num(pick(raw, 'overdue_days', 'overdueDays')),
});

export const mapDebtDocuments = (raw: any): DebtDocument[] =>
  (Array.isArray(raw) ? raw : (raw?.data ?? [])).map(mapDebtDocument);
