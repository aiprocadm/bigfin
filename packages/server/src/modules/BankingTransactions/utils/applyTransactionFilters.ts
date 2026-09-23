// © 2026 Bigfin
import { hasDueSql } from '@/common/utils/paymentStatusSql';
import { INVOICE_PAYMENT_COLUMNS } from '@/modules/SaleInvoices/models/SaleInvoice';
import { BILL_PAYMENT_COLUMNS } from '@/modules/Bills/models/Bill';
import { ACCOUNT_TYPE } from '@/constants/accounts';

/**
 * Реестр — это движение ДЕНЕГ: в нём только ноги денежных счетов (банк,
 * касса, карта) — те же виды, что в списке «Кассы и банковские счета».
 *
 * НАЙДЕНО ЖИВОЙ ПРОВЕРКОЙ ЭТАПА 37. Без этого условия список «по всем
 * счетам» показывал ОБЕ ноги каждой проводки: «Прочие расходы»,
 * «Кредиторская задолженность» стояли в колонке «Счёт», за квартал на
 * стенде было 43 строки вместо 8, а итог «поступления − выплаты» всегда
 * выходил нулём — каждая сумма входила дважды, с разными знаками.
 */
export const REGISTRY_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.CREDIT_CARD,
];

/**
 * С отбором «нам должны / мы должны / просрочено» в реестре нужны и
 * неоплаченные счета — а у них нет денежной ноги. Такой счёт виден ОДНОЙ
 * строкой долга (расчёты с покупателями или поставщиками), а не тремя
 * (долг, доход, НДС), как было до живой проверки этапа 37.
 */
export const REGISTRY_DEBT_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE,
  ACCOUNT_TYPE.ACCOUNTS_PAYABLE,
];

/**
 * Отборы списка операций — ОДИН набор на список и на итоги (FIN-008 ТЗ-2).
 *
 * ЗАЧЕМ ОБЩИЙ КОД. Сводная строка внизу реестра отвечает на вопрос «сколько
 * и на сколько» под тем же фильтром, что и список. Посчитай мы итоги своим
 * запросом — два набора условий однажды разойдутся, и человек увидит
 * «87 операций» над списком из 84. Причём разойдутся ТИХО: оба числа
 * выглядят правдоподобно.
 */
export interface TransactionListFilters {
  accountId?: number;
  fromDate?: string;
  toDate?: string;
  flow?: 'in' | 'out';
  contactId?: number;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  /**
   * Состояния строки: `receivable` — нам должны, `payable` — мы должны,
   * `overdue` — срок прошёл (FIN-003 ТЗ-2).
   *
   * СПИСОК, А НЕ ОДНО ЗНАЧЕНИЕ, и объединяются они по «ИЛИ»: человек
   * спрашивает «покажи, что горит и что мне должны», а не «покажи
   * пересечение».
   */
  states?: string[];
  /**
   * Направление (FT-021 ТЗ-3). На денежной ноге направления нет — оно на
   * встречной, поэтому отбирается документ целиком.
   */
  projectId?: number;
  /** Метка операции (FT-025 ТЗ-3): хранится у документа, не у проводки. */
  tag?: string;
}

/** Состояния, по которым можно отбирать. */
export const TRANSACTION_STATE_FILTERS = [
  'receivable',
  'payable',
  'overdue',
] as const;

/**
 * Накладывает отбор по состоянию.
 *
 * ОТБИРАЕТ СЕРВЕР, А НЕ ЭКРАН. Список разбит на страницы: отфильтровать
 * загруженную страницу значило бы показать «ничего не найдено» при полной
 * базе просрочки на следующей.
 *
 * ФОРМУЛА ДОЛГА БЕРЁТСЯ ОБЩАЯ (`hasDueSql`) — та самая, по которой долг
 * считают карточка документа и списки. Своя копия формулы однажды
 * разойдётся с ними на налог или скидку, и человек увидит в реестре
 * «просрочено» там, где документ давно закрыт.
 */
function applyStateFilter(query: any, states?: string[]): void {
  const selected = (states ?? []).filter((state) =>
    (TRANSACTION_STATE_FILTERS as readonly string[]).includes(state),
  );

  if (!selected.length) return;

  const dueInvoices = (qb: any) =>
    qb
      .select('id')
      .from('sales_invoices')
      .whereRaw(hasDueSql(INVOICE_PAYMENT_COLUMNS));

  const dueBills = (qb: any) =>
    qb.select('id').from('bills').whereRaw(hasDueSql(BILL_PAYMENT_COLUMNS));

  // ПРОСРОЧЕНО — ЭТО ОБЕ СТОРОНЫ. И неоплаченный счёт покупателю, и
  // неоплаченный счёт поставщика: человек спрашивает «что горит», а не
  // «что горит у покупателей».
  const today = new Date().toISOString().slice(0, 10);

  /** Одно состояние — одна ветка «ИЛИ». */
  const branch = (outer: any, state: string): void => {
    if (state === 'receivable') {
      outer.orWhere((side: any) => {
        side.where('referenceType', 'SaleInvoice');
        side.whereIn('referenceId', dueInvoices);
      });
      return;
    }
    if (state === 'payable') {
      outer.orWhere((side: any) => {
        side.where('referenceType', 'Bill');
        side.whereIn('referenceId', dueBills);
      });
      return;
    }

    outer.orWhere((side: any) => {
      side.where('referenceType', 'SaleInvoice');
      side.whereIn('referenceId', (qb: any) =>
        dueInvoices(qb).andWhere('due_date', '<', today),
      );
    });
    outer.orWhere((side: any) => {
      side.where('referenceType', 'Bill');
      side.whereIn('referenceId', (qb: any) =>
        dueBills(qb).andWhere('due_date', '<', today),
      );
    });
  };

  query.where((outer: any) => {
    selected.forEach((state) => branch(outer, state));
  });
}

/**
 * Накладывает отборы на запрос к денежным проводкам.
 *
 * @param {any} query построитель запроса
 * @param {TransactionListFilters} filters отборы экрана
 * @param {number[] | null} articleAccountIds счета статьи; `null` — отбора
 *   по статье нет, пустой список — статья есть, но счетов у неё нет
 */
export function applyTransactionFilters(
  query: any,
  filters: TransactionListFilters,
  articleAccountIds: number[] | null = null,
): any {
  const byDebtState = (filters?.states ?? []).some((state) =>
    (TRANSACTION_STATE_FILTERS as readonly string[]).includes(state),
  );
  const accountTypes = byDebtState
    ? [...REGISTRY_ACCOUNT_TYPES, ...REGISTRY_DEBT_ACCOUNT_TYPES]
    : REGISTRY_ACCOUNT_TYPES;
  query.whereIn('account_id', (builder: any) => {
    builder.select('id').from('accounts').whereIn('account_type', accountTypes);
  });

  applyStateFilter(query, filters?.states);

  const {
    accountId,
    fromDate,
    toDate,
    flow,
    contactId,
    search,
    minAmount,
    maxAmount,
    projectId,
    tag,
  } = filters ?? {};

  if (accountId) {
    query.where('account_id', accountId);
  }
  if (fromDate) {
    query.where('date', '>=', fromDate);
  }
  if (toDate) {
    query.where('date', '<=', toDate);
  }
  // Приход лежит в дебете, расход — в кредите.
  if (flow === 'in') {
    query.where('debit', '>', 0);
  } else if (flow === 'out') {
    query.where('credit', '>', 0);
  }
  if (contactId) {
    query.where('contact_id', contactId);
  }
  if (typeof minAmount === 'number') {
    query.where((builder: any) => {
      builder
        .where('debit', '>=', minAmount)
        .orWhere('credit', '>=', minAmount);
    });
  }
  if (typeof maxAmount === 'number') {
    query.where((builder: any) => {
      builder
        .where('debit', '<=', maxAmount)
        .andWhere('credit', '<=', maxAmount);
    });
  }

  /**
   * ОТБОР ПО СТАТЬЕ (FIN-005 ТЗ-2).
   *
   * У денежной проводки статьи нет: статья висит на ВСТРЕЧНОМ счёте
   * документа. Поэтому отбираются документы, задевшие счета статьи, и
   * остаются их денежные ноги.
   */
  if (articleAccountIds !== null) {
    if (articleAccountIds.length === 0) {
      // Статья без счетов: операций по ней не бывает. Невыполнимое
      // условие честнее, чем незаметно снятый отбор.
      query.whereRaw('1 = 0');
    } else {
      query.whereIn(['reference_type', 'reference_id'], (builder: any) => {
        builder
          .select('reference_type', 'reference_id')
          .from('accounts_transactions')
          .whereIn('account_id', articleAccountIds);
      });
    }
  }

  if (projectId) {
    query.whereIn(['reference_type', 'reference_id'], (builder: any) => {
      builder
        .select('reference_type', 'reference_id')
        .from('accounts_transactions')
        .where('project_id', projectId);
    });
  }
  if (tag) {
    query.whereIn(['reference_type', 'reference_id'], (builder: any) => {
      builder
        .select('reference_type', 'reference_id')
        .from('transaction_tags')
        .where('tag', tag);
    });
  }

  if (search) {
    const like = `%${search}%`;
    query.where((builder: any) => {
      builder
        .where('transaction_number', 'like', like)
        .orWhere('reference_number', 'like', like)
        .orWhere('note', 'like', like);
    });
  }

  return query;
}
