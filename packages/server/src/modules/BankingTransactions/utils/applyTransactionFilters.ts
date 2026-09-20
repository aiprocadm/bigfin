// © 2026 Bigfin

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
  const {
    accountId,
    fromDate,
    toDate,
    flow,
    contactId,
    search,
    minAmount,
    maxAmount,
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
