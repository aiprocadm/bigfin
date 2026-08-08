// © 2026 Bigfin
import { round2, toNumber } from './dataQualityMath';

/** Позиция документа в том виде, в каком её видит планировщик. */
export interface RepostEntryRow {
  taxRateId?: number | null;
  taxRate?: number | null;
  /** Налог позиции — геттер модели, может быть NaN у позиции без ставки. */
  taxAmount?: number;
}

/** Документ-кандидат на перепроведение. */
export interface RepostDocumentRow {
  id: number;
  /**
   * Проведён ли документ. У каждого типа свой признак: у счёта покупателю —
   * дата отправки, у счёта поставщика и кредит-ноты — дата открытия,
   * у чека продажи — дата закрытия.
   */
  isPosted: boolean;
  taxAmountWithheld?: number | string | null;
  entries?: RepostEntryRow[];
}

export interface RepostPlanItem {
  id: number;
  /** Налог документа, пересчитанный из позиций. */
  recomputedTax: number;
  /** Налог документа, записанный сейчас. */
  storedTax: number;
  /** Нужно ли обновить сумму налога в самом документе. */
  taxChanged: boolean;
}

export interface RepostPlan {
  items: RepostPlanItem[];
  /** Пропущено черновиков (у них проводок нет и быть не должно). */
  skippedNotPosted: number;
  /** Пропущено документов без налога в позициях. */
  skippedNoTax: number;
}

/** Есть ли в позиции налоговая ставка. */
function entryHasTax(entry: RepostEntryRow): boolean {
  return entry.taxRateId != null || toNumber(entry.taxRate) > 0;
}

/**
 * Решает, какие документы надо перепровести, и считает их налог заново.
 *
 * Чистая функция — вся логика отбора собрана здесь, чтобы её можно было
 * закрепить тестами отдельно от базы.
 *
 * Правила:
 * 1. Черновик не трогаем. Проводки пишутся только у проведённых документов,
 *    и перепроведение черновика создало бы записи в журнале, которых там
 *    никогда не было, — то есть испортило бы отчётность вместо починки.
 * 2. Документ без налоговых ставок в позициях перепроводить незачем: правки
 *    #188–#192 касались только налога.
 * 3. Налог документа складываем из позиций ровно так же, как это делает
 *    сохранение документа (см. ItemEntriesTaxTransactions): позиции без
 *    ставки дают NaN и считаются нулём, иначе весь документ становился
 *    «не числом».
 */
export function planVatRepost(documents: RepostDocumentRow[]): RepostPlan {
  const items: RepostPlanItem[] = [];
  let skippedNotPosted = 0;
  let skippedNoTax = 0;

  documents.forEach((document) => {
    const entries = document.entries ?? [];

    if (!entries.some(entryHasTax)) {
      skippedNoTax += 1;
      return;
    }
    if (!document.isPosted) {
      skippedNotPosted += 1;
      return;
    }
    const recomputedTax = round2(
      entries.reduce(
        (sum, entry) =>
          sum + (Number.isFinite(entry.taxAmount) ? Number(entry.taxAmount) : 0),
        0,
      ),
    );
    const storedTax = round2(toNumber(document.taxAmountWithheld));

    items.push({
      id: document.id,
      recomputedTax,
      storedTax,
      taxChanged: recomputedTax !== storedTax,
    });
  });

  return { items, skippedNotPosted, skippedNoTax };
}
