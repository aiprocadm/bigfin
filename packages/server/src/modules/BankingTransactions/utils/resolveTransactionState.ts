// © 2026 Bigfin

/**
 * Состояние денежной операции (FIN-003 ТЗ-2).
 *
 * ЗАЧЕМ. Дебиторка и кредиторка в Bigfin живут остатками по документам и
 * видны только в отчётах старения. А человек проводит время в реестре
 * операций — и там не видно, что отгрузку ещё не оплатили.
 *
 * ПОЧЕМУ НЕ КАК У КОНКУРЕНТА. ПланФакт держит у операции ДВЕ даты —
 * начисления и оплаты — и рисует буквы «Д» и «К». Двойную дату Bigfin
 * завести не может: у него двойная запись, и вторая дата разрушила бы её
 * (это прямо записано в отклонённых идеях ТЗ). Поэтому те же состояния
 * ВЫВОДЯТСЯ из того, что уже есть: остаток документа и срок оплаты.
 *
 * ПОДПИСИ СЛОВАМИ, А НЕ БУКВАМИ. «Д» и «К» надо заучить; «нам должны» и
 * «мы должны» понятны сразу. Продукт для предпринимателя без бухгалтерского
 * образования — здесь это и проверяется.
 */

export type TransactionStateKind =
  | 'receivable'
  | 'payable'
  | 'overdue'
  | 'planned';

export interface TransactionState {
  kind: TransactionStateKind;
  /** Срок оплаты — подсказка называет его полной фразой. */
  dueDate?: string | null;
  documentId?: number | null;
  documentType?: string | null;
}

export interface TransactionStateSource {
  /** Документ, к которому привязана денежная строка. */
  documentType?: string | null;
  documentId?: number | null;
  /** Черновик состояний не порождает: он ещё ничего не обещает. */
  documentStatus?: string | null;
  /** Остаток к оплате по документу. */
  balance?: number | null;
  dueDate?: string | null;
  /** Строка порождена плановой операцией. */
  source?: 'fact' | 'planned' | null;
  plannedStatus?: string | null;
  plannedDate?: string | null;
}

/** Документы, чей неоплаченный остаток означает «нам должны». */
const RECEIVABLE_DOCUMENTS = ['SaleInvoice', 'Invoice'];

/** Документы, чей неоплаченный остаток означает «мы должны». */
const PAYABLE_DOCUMENTS = ['Bill'];

/** Плановая операция, которая ещё ждёт своего часа. */
const LIVE_PLANNED_STATUSES = ['planned', 'confirmed'];

const isDraft = (status?: string | null): boolean =>
  String(status ?? '').toLowerCase() === 'draft';

/**
 * Считает состояния строки реестра.
 *
 * Возвращает список, а не одно значение: «нам должны» и «просрочено» —
 * разные факты, и человеку нужны оба. Сколько бейджей поместится на экране,
 * решает витрина; расчёт не должен молчать о части правды из-за вёрстки.
 *
 * @param {TransactionStateSource} row строка реестра со связями
 * @param {string} today сегодня, `YYYY-MM-DD` — параметром, чтобы поведение
 *   можно было проверить, а не гадать про часовой пояс машины
 * @returns {TransactionState[]}
 */
export function resolveTransactionState(
  row: TransactionStateSource,
  today: string,
): TransactionState[] {
  if (!row) return [];

  const states: TransactionState[] = [];

  // ПЛАНОВАЯ ОПЕРАЦИЯ. Это ещё не факт, а обещание: показать её как долг
  // значило бы смешать «мы должны заплатить» и «мы собирались заплатить».
  if (row.source === 'planned') {
    const alive = LIVE_PLANNED_STATUSES.includes(
      String(row.plannedStatus ?? '').toLowerCase(),
    );

    if (!alive) return [];

    states.push({ kind: 'planned', dueDate: row.plannedDate ?? null });

    if (row.plannedDate && row.plannedDate < today) {
      states.push({ kind: 'overdue', dueDate: row.plannedDate });
    }

    return states;
  }

  // Черновик ничего не обещает: ни долга, ни срока.
  if (isDraft(row.documentStatus)) return [];

  const balance = Number(row.balance ?? 0);

  // Полностью оплаченный документ состояний не даёт — это и есть «всё
  // хорошо». Показать бейдж здесь значило бы кричать без повода.
  if (!(balance > 0)) return [];

  const documentType = row.documentType ?? null;
  const common = {
    dueDate: row.dueDate ?? null,
    documentId: row.documentId ?? null,
    documentType,
  };

  if (RECEIVABLE_DOCUMENTS.includes(String(documentType))) {
    states.push({ kind: 'receivable', ...common });
  } else if (PAYABLE_DOCUMENTS.includes(String(documentType))) {
    states.push({ kind: 'payable', ...common });
  }

  // ПРОСРОЧКА — отдельный факт поверх долга, а не его замена. Долг с
  // будущим сроком и долг просроченный требуют разных действий.
  if (states.length > 0 && row.dueDate && row.dueDate < today) {
    states.push({ kind: 'overdue', ...common });
  }

  return states;
}

/** Есть ли у строки состояние из набора — для отбора списка (FIN-009). */
export function matchesAnyState(
  states: TransactionState[],
  wanted: string[],
): boolean {
  if (!wanted || wanted.length === 0) return true;

  // Несколько состояний объединяются по «ИЛИ»: человек, отметивший
  // «просрочено» и «план», хочет видеть и то, и другое, а не пересечение.
  return states.some((state) => wanted.includes(state.kind));
}
