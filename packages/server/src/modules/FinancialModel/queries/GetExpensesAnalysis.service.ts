// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

import {
  ArticlesPlRollupService,
  type UnmappedTotals,
} from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { computeDealMargin } from '@/modules/Deals/utils/computeDealMargin';

import { MetricValue, enumerateMonths } from '../utils/financialMath';
import {
  ExpensesSplit,
  TopExpenseRow,
  buildTopExpenseArticles,
  computeExpenseShare,
  computeSafetyMargin,
  splitExpensesByBehavior,
} from '../utils/expensesAnalysisMath';
import { GetBreakEvenService } from './GetBreakEven.service';

export interface ExpenseShareMonth {
  /** 'YYYY-MM' */
  month: string;
  revenue: number;
  expenses: number;
  /** Доля расходов в выручке; null — если выручки в этом месяце не было. */
  share: number | null;
}

export interface ExpensesAnalysisResult {
  fromDate: string;
  toDate: string;
  revenue: number;
  split: ExpensesSplit;
  monthly: ExpenseShareMonth[];
  topArticles: TopExpenseRow[];
  breakEven: MetricValue;
  safetyMargin: MetricValue;
  /** Помечена ли хоть одна статья постоянной — без этого расчёт неполон. */
  hasFixedArticles: boolean;

  /**
   * Деньги, прошедшие МИМО статей (остаток Р4 этапа 9).
   *
   * Раньше такие счета молча выпадали из отчёта: итог оказывался меньше,
   * чем в ОПиУ, и ничто на это не указывало. Теперь пробел приходит на
   * экран числом — вместе с тем, сколько счетов надо разметить.
   */
  unmapped: UnmappedTotals;
}

/**
 * Сколько месяцев показываем линией «доля расходов в выручке».
 *
 * Каждый месяц — отдельная свёртка статей, то есть отдельный поход в базу.
 * Открывать отчёт за пять лет и делать шестьдесят походов незачем: линия
 * длиннее двух лет всё равно нечитаема.
 */
export const EXPENSE_MONTHS_LIMIT = 24;

/** Сколько статей показываем в структуре расходов. */
export const TOP_ARTICLES_LIMIT = 10;

/**
 * Экран «Анализ расходов» (этап 9 ТЗ).
 *
 * Ничего не считается заново: выручка и маржа — та же свёртка статей, что в
 * финансовом обзоре, точка безубыточности — тот же сервис, что на своём
 * экране. Иначе один и тот же бизнес показывал бы разные числа на разных
 * страницах, и человек перестал бы верить обеим.
 */
@Injectable()
export class GetExpensesAnalysisService {
  constructor(
    private readonly rollup: ArticlesPlRollupService,
    private readonly breakEvenService: GetBreakEvenService,
  ) {}

  public async getExpensesAnalysis(query: {
    fromDate?: string;
    toDate?: string;
    branchesIds?: number[];
    projectId?: number;
  }): Promise<ExpensesAnalysisResult> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const scope = {
      branchesIds: query.branchesIds,
      projectId: query.projectId,
    };

    // Собственные суммы статей: пометка «постоянный» и у родителя, и у
    // потомка иначе задвоила бы расход.
    const own = await this.rollup.getOwnAmounts({
      fromDate,
      toDate,
      ...scope,
    } as any);

    const split = splitExpensesByBehavior(own as any);

    // Выручка — свёрткой по дереву: там корневые строки уже содержат сумму
    // поддерева, и это ровно то число, что показывает финансовый обзор.
    const { rows: rolled, unmapped } = await this.rollup.getRollupWithUnmapped({
      fromDate,
      toDate,
      ...scope,
    } as any);
    const { revenue } = computeDealMargin(rolled as any);

    const previous = await this.rollup.getOwnAmounts({
      ...this.previousPeriodOf(fromDate, toDate),
      ...scope,
    } as any);

    const breakEven = await this.breakEvenService.getBreakEven({
      fromDate,
      toDate,
    });

    return {
      fromDate,
      toDate,
      revenue,
      split,
      monthly: await this.getMonthly(fromDate, toDate, scope),
      topArticles: buildTopExpenseArticles(
        own as any,
        previous as any,
        TOP_ARTICLES_LIMIT,
      ),
      breakEven: breakEven.breakEven,
      safetyMargin: computeSafetyMargin(revenue, breakEven.breakEven),
      hasFixedArticles: breakEven.hasFixedArticles,
      unmapped,
    };
  }

  /**
   * Прошлый период той же длины: сравнивать март с целым прошлым годом —
   * значит показать «падение расходов» там, где его нет.
   */
  private previousPeriodOf(
    fromDate: string,
    toDate: string,
  ): { fromDate: string; toDate: string } {
    const start = moment(fromDate);
    const end = moment(toDate);
    const days = Math.max(end.diff(start, 'days'), 0);

    return {
      toDate: start.clone().subtract(1, 'day').format('YYYY-MM-DD'),
      fromDate: start
        .clone()
        .subtract(days + 1, 'days')
        .format('YYYY-MM-DD'),
    };
  }

  /**
   * Доля расходов в выручке по месяцам.
   *
   * Считается тем же способом, что и итог за период, только помесячно:
   * линия обязана сходиться с числами выше, иначе она спорит с ними.
   */
  private async getMonthly(
    fromDate: string,
    toDate: string,
    scope: { branchesIds?: number[]; projectId?: number },
  ): Promise<ExpenseShareMonth[]> {
    const months = enumerateMonths(fromDate, toDate).slice(
      -EXPENSE_MONTHS_LIMIT,
    );

    const rows: ExpenseShareMonth[] = [];

    for (const month of months) {
      const start = moment(month, 'YYYY-MM').startOf('month');
      const end = start.clone().endOf('month');

      const rolled = await this.rollup.getRollup({
        fromDate: start.format('YYYY-MM-DD'),
        toDate: end.format('YYYY-MM-DD'),
        ...scope,
      } as any);

      const { revenue, costs } = computeDealMargin(rolled as any);

      rows.push({
        month,
        revenue,
        expenses: costs,
        share: computeExpenseShare(revenue, costs),
      });
    }

    return rows;
  }
}
