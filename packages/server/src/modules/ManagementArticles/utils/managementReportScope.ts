// © 2026 Bigfin
import { isEmpty } from 'lodash';

import { applyLegalEntityScope } from '@/modules/LegalEntities/utils/legalEntityScope';
import { applyProjectScope } from '@/modules/Projects/utils/projectScope';

/**
 * Разрезы управленческих отчётов: подразделения, юрлица, направления.
 */
export interface ManagementReportScope {
  branchesIds?: number[] | null;
  /** Пусто — все юрлица, то есть сводно по группе. */
  legalEntityIds?: number[] | null;
  /** Пусто — все операции, включая непомеченные. */
  projectsIds?: number[] | null;
}

/**
 * Отбор управленческих отчётов (FT-008 ТЗ-3) — ОДНО место на все запросы к
 * проводкам в свёртках по статьям и в отчёте «Деньги по статьям».
 *
 * ЧТО БЫЛО. Бухгалтерские отчёты (Баланс, ОПиУ, косвенный ДДС) накладывали
 * разрез по юрлицу с этапа 7 ТЗ-1. Управленческие своды — нет: запрос
 * принимал номера юрлиц, проверял их — и выбрасывал. Человек выбирал одно
 * юрлицо, а «Деньги по статьям», план-факт бюджета, рентабельность сделок и
 * точка безубыточности считались по всей группе. Ошибка молчаливая: отчёт не
 * падает, числа выглядят правдоподобно.
 *
 * ПОЧЕМУ ТРИ РАЗРЕЗА РАЗОМ, А НЕ ОДИН. Ровно так устроено общее место
 * бухгалтерских отчётов (`commonFilterBranchesQuery`). Отчёты, отбирающие
 * по-разному, расходятся цифрами между страницами — а управленческий и
 * бухгалтерский ОПиУ обязаны сходиться.
 *
 * ВНИМАНИЕ ПРО СВОДНЫЙ РЕЖИМ. Когда юрлицо не выбрано, отбор всё равно убирает
 * внутригрупповые обороты (§7.2 ТЗ-1): перевод от своего ООО своему ИП не
 * доход группы и не её расход. Раньше управленческие своды этого не делали и
 * у организаций с такими переводами ЗАВЫШАЛИ выручку и расходы — на ту же
 * сумму, на которую расходились с бухгалтерским ОПиУ. У организаций без
 * переводов между своими юрлицами ничего не меняется.
 *
 * @param query - запрос к проводкам (`accounts_transactions`) без join'ов
 * @param scope - выбранные разрезы
 */
export function applyManagementReportScope(
  query: any,
  scope: ManagementReportScope | undefined,
): void {
  if (!isEmpty(scope?.branchesIds)) {
    query.modify('filterByBranches', scope!.branchesIds);
  }
  applyLegalEntityScope(query, { legalEntityIds: scope?.legalEntityIds });
  applyProjectScope(query, { projectsIds: scope?.projectsIds ?? undefined });
}
