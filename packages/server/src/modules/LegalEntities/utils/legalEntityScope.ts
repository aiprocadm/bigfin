// © 2026 Bigfin
import { Knex } from 'knex';

import { shouldExcludeIntercompany } from './intercompany';

/**
 * Отбор отчёта по юрлицам (этап 7 ТЗ, §7.1) и исключение внутригрупповых
 * оборотов (§7.2 п. 3–4).
 *
 * Одно место на все отчёты: разные отчёты, отбирающие по-разному, — это
 * гарантированное расхождение цифр между страницами.
 */

export interface LegalEntityScope {
  /** Пусто или отсутствует = все юрлица (консолидация). */
  legalEntityIds?: number[] | null;
}

/**
 * Накладывает отбор по юрлицу и, когда нужно, убирает внутригрупповые обороты.
 *
 * ВАЖНО про строки без юрлица: они **остаются**. Колонка заполняется
 * отдельной задачей, и до неё юрлицо пусто у всех операций. Отбор, который
 * выкидывает пустые, показал бы пустой отчёт всем, кто ещё не заполнил
 * данные, — то есть сегодня всем.
 *
 * @param query - запрос к проводкам
 * @param scope - выбранные юрлица
 * @param columnPrefix - префикс таблицы, когда в запросе есть join
 */
export function applyLegalEntityScope(
  query: Knex.QueryBuilder | any,
  scope: LegalEntityScope | undefined,
  columnPrefix = '',
): void {
  const selected = scope?.legalEntityIds ?? [];
  const column = (name: string) =>
    columnPrefix ? `${columnPrefix}.${name}` : name;

  if (selected.length > 0) {
    // Строки без юрлица остаются: иначе отчёт опустеет у всех, кто ещё
    // не заполнил колонку.
    query.where((builder: any) => {
      builder
        .whereIn(column('legal_entity_id'), selected)
        .orWhereNull(column('legal_entity_id'));
    });
  }

  if (shouldExcludeIntercompany(selected)) {
    query.where(column('is_intercompany'), false);
  }
}

/**
 * Пояснение для шапки отчёта: что именно сейчас показано.
 *
 * Человек должен видеть, что перед ним сводные цифры без внутренних
 * переводов, а не гадать, почему сумма меньше, чем у него в голове.
 */
export function describeLegalEntityScope(scope: LegalEntityScope | undefined): {
  isConsolidated: boolean;
  excludesIntercompany: boolean;
  selectedCount: number;
  hasIntercompanySettlement: boolean;
} {
  const selected = scope?.legalEntityIds ?? [];

  return {
    isConsolidated: selected.length !== 1,
    excludesIntercompany: shouldExcludeIntercompany(selected),
    selectedCount: selected.length,

    /**
     * Есть ли в балансе строка «Расчёты внутри группы» (остаток К9).
     *
     * ЧТО БЫЛО. Внутренний перевод между своими юрлицами кладёт одну ногу на
     * счёт одного юрлица, другую — на счёт другого. В отчёте по ОДНОМУ юрлицу
     * видна только его нога: деньги ушли, а требования к своему же в балансе
     * нет. Найдено живой проверкой: перевод 500 000 разошёл обе половины
     * баланса ровно на 500 000. Раньше об этом говорилась честная оговорка —
     * и только.
     *
     * ЧТО СТАЛО. Требование считается и показывается строкой. Отдал — тебе
     * должны, получил — должен ты. Баланс сходится, а человек видит, откуда
     * взялась разница, вместо предупреждения, что она бывает.
     *
     * В режиме «все юрлица» строки нет: обе ноги уже внутри отчёта.
     */
    hasIntercompanySettlement: selected.length > 0,
  };
}
