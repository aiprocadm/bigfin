// © 2026 Bigfin

/**
 * Период отчёта — из запроса, как бы он ни был написан.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ПОМОЩНИК. Три отчёта берут период из разных мест: ОПиУ и
 * Баланс — из ОТВЕТА сервера (там ключи через подчёркивание: `from_date`),
 * Движение денег — из СОБСТВЕННОГО запроса (там ключи слитно: `fromDate`).
 *
 * Прочитать не то написание — значит передать раскрытию суммы пустые даты.
 * Ошибка не падает: панель откроется и покажет пустой список, а человек
 * решит, что операций за период не было.
 */
export interface ReportRange {
  fromDate: string;
  toDate: string;
}

export function reportDrillDownRange(query: any): ReportRange {
  return {
    fromDate: query?.fromDate ?? query?.from_date ?? '',
    toDate: query?.toDate ?? query?.to_date ?? '',
  };
}

/**
 * Номер счёта строки отчёта.
 *
 * Раскрыть можно только строку-счёт: у итогов и расчётных строк своих
 * проводок нет. В ОПиУ и Балансе у такой строки номер числовой, а в Движении
 * денег он с приставкой — `account-1025`. Приставку снимаем здесь, иначе
 * раскрытие в ДДС не заработает вовсе.
 */
export function drillDownAccountId(rowId: unknown): number | null {
  const raw = String(rowId ?? '').replace(/^account-/, '');
  const id = Number(raw);

  return Number.isFinite(id) && id > 0 ? id : null;
}
