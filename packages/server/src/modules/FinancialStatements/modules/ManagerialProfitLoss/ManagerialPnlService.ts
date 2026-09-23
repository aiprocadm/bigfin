// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';

import { Project } from '@/modules/Projects/models/Project.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { SettingsStore } from '@/modules/Settings/SettingsStore';
import { SETTINGS_PROVIDER } from '@/modules/Settings/Settings.types';
import { readOrganizationCalendar } from '@/modules/Settings/organizationCalendar';
import { excludedReferenceTypes, readPnlSources } from './pnlSources';
import { spreadIndirectCosts } from './spreadIndirect';
import { expandPayrollByEmployees } from './payrollByEmployees';
import { PayrollByEmployeesService } from './PayrollByEmployees.service';
import { CostAllocationRule } from '@/modules/CostAllocation/models/CostAllocationRule.model';
import { describeLegalEntityScope } from '@/modules/LegalEntities/utils/legalEntityScope';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import {
  buildReportPeriods,
  PERIOD_TOO_WIDE_FOR_GRANULARITY,
  PeriodTooWideError,
  ReportPeriod,
} from '../CashFlowArticles/periodizeRows';
import {
  buildManagerialPnlColumn,
  ManagerialPnlColumn,
  PnlGrouping,
} from './buildManagerialPnlReport';
import { ManagerialPnlSourceService, PnlBasis } from './ManagerialPnlSource.service';
import { ManagerialPnlQueryDto } from './ManagerialPnlQuery.dto';

export interface ManagerialPnlPeriod extends ReportPeriod {
  column: ManagerialPnlColumn;
}

export interface ManagerialPnlData {
  group: PnlGrouping;
  basis: PnlBasis;
  dateGroup: string;
  periods: ManagerialPnlPeriod[];
  /**
   * «Итого» — отчёт по ВСЕМ операциям отрезка. Суммы строк в нём равны
   * сумме колонок, а рентабельность пересчитана заново: сложить проценты
   * по месяцам значило бы получить число, которого не бывает.
   */
  total: ManagerialPnlColumn;
}

export interface ManagerialPnlSheet {
  data: ManagerialPnlData;
  query: ManagerialPnlQueryDto;
  meta: Record<string, any>;
}

/**
 * Управленческий ОПиУ (FT-010 ТЗ-3): лестница прибыли по ярусам статей.
 *
 * Строится от `pl_type` статьи, а не от вида счёта. Бухгалтерский ОПиУ
 * остаётся на месте для режима «бухгалтер» — это разные вопросы.
 */
@Injectable()
export class ManagerialPnlService {
  constructor(
    private readonly source: ManagerialPnlSourceService,
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,

    @Inject(Project.name)
    private readonly projectModel: TenantModelProxy<typeof Project>,

    @Inject(SETTINGS_PROVIDER)
    private readonly settingsStore: () => Promise<SettingsStore>,

    @Inject(CostAllocationRule.name)
    private readonly ruleModel: TenantModelProxy<typeof CostAllocationRule>,

    private readonly payrollByEmployees: PayrollByEmployeesService,
  ) {}

  public async sheet(query: ManagerialPnlQueryDto): Promise<ManagerialPnlSheet> {
    const group = query.group ?? 'articles';
    const basis = query.basis ?? 'accrual';
    const dateGroup = query.dateGroup ?? 'month';
    const settings = await this.settingsStore();
    const { weekStartDay } = readOrganizationCalendar(settings);
    const periods = this.periodsOf(query, dateGroup, weekStartDay);
    // Откуда берутся данные (FT-012 ТЗ-3): выключенный модуль не читается.
    const sources = readPnlSources(settings);

    const loaded = await this.source.load(
      query,
      periods,
      basis,
      excludedReferenceTypes(sources),
    );
    const projectNames = await this.projectNames(loaded.entriesByPeriod.flat());

    // Распределение косвенных по направлениям (FT-011 ТЗ-3) — только когда
    // ярусы раскрыты до направлений: на вкладке «статьи» итоги от него не
    // меняются, и делать его незачем.
    const spreadBase = query.spreadBase ?? 'revenue';
    let spread: { base: string; applied: boolean; zeroBasePeriods: number } | null = null;
    if (query.spreadIndirect && group !== 'articles') {
      const result = spreadIndirectCosts({
        entriesByPeriod: loaded.entriesByPeriod,
        articles: loaded.articles,
        base: spreadBase,
        projectName: (id) => projectNames.get(id),
        payrollArticleId:
          Number(settings.get({ group: 'payroll', key: 'payroll_article_id' })) || null,
        manualShares:
          spreadBase === 'manual_share' ? await this.directionManualShares() : undefined,
      });
      loaded.entriesByPeriod = result.entriesByPeriod;
      spread = { base: spreadBase, applied: true, zeroBasePeriods: result.zeroBasePeriods };
    }
    const context = {
      articles: loaded.articles,
      group,
      projectName: (id: number) => projectNames.get(id),
      accountName: (id: number) => loaded.accountsById.get(id)?.name,
    };

    const data: ManagerialPnlData = {
      group,
      basis,
      dateGroup,
      periods: periods.map((period, index) => ({
        ...period,
        column: buildManagerialPnlColumn(loaded.entriesByPeriod[index], context),
      })),
      total: buildManagerialPnlColumn(loaded.entriesByPeriod.flat(), context),
    };

    // «ФОТ по сотрудникам» (FT-014 ТЗ-3): строка зарплаты раскрывается до
    // сотрудников из утверждённых расчётов; суммы отчёта не меняются.
    const payroll = await this.payrollByEmployees.load({
      settings,
      periods,
      basis,
      group,
      legalEntityIds: query.legalEntityIds,
    });
    let payrollStatus: string = payroll.status;
    if (payroll.status === 'applied' && payroll.payrollArticleId) {
      const articleId = payroll.payrollArticleId;
      const total = expandPayrollByEmployees(
        data.total,
        articleId,
        payroll.byPeriod.flat(),
        payroll.roster,
      );
      data.total = total.column;
      data.periods = data.periods.map((period, index) => ({
        ...period,
        column: expandPayrollByEmployees(
          period.column,
          articleId,
          payroll.byPeriod[index],
          payroll.roster,
        ).column,
      }));
      // Статье зарплаты не задан ярус — раскрывать нечего, и экран скажет.
      if (!total.found) payrollStatus = 'no_tier';
    }

    return {
      data,
      query,
      meta: {
        ...(await this.meta(query, basis)),
        pnlSources: sources,
        // Какая база применена (критерий 4 FT-011) и где она оказалась нулевой.
        spread,
        payrollGrouping: { mode: payroll.mode, status: payrollStatus },
      },
    };
  }

  private periodsOf(
    query: ManagerialPnlQueryDto,
    dateGroup: any,
    weekStartDay: number,
  ): ReportPeriod[] {
    try {
      return buildReportPeriods(query.fromDate, query.toDate, dateGroup, weekStartDay);
    } catch (error) {
      if (error instanceof PeriodTooWideError) {
        throw new ServiceError(
          PERIOD_TOO_WIDE_FOR_GRANULARITY,
          error.message,
          { periodsCount: error.periodsCount },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }
  }

  /**
   * Ручные доли направлений — из действующего правила распределения с целью
   * «направления» и ключом «вручную» (FT-011 ТЗ-3).
   */
  private async directionManualShares(): Promise<Record<string, number>> {
    const rules: any[] = await this.ruleModel().query();
    const rule = rules.find(
      (r) =>
        r.isActive && r.targetType === 'direction' && r.allocationKey === 'manual_share',
    );
    return (rule?.manualShares ?? {}) as Record<string, number>;
  }

  private async projectNames(entries: { projectId: number | null }[]) {
    const ids = [
      ...new Set(
        entries
          .map((entry) => entry.projectId)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    ];
    const rows: any[] = ids.length
      ? await this.projectModel().query().whereIn('id', ids).select(['id', 'name'])
      : [];
    return new Map<number, string>(rows.map((row) => [row.id, row.name]));
  }

  /** Шапка: организация, период, метод учёта и по какому юрлицу собран. */
  private async meta(query: ManagerialPnlQueryDto, basis: PnlBasis) {
    const common = await this.financialSheetMeta.meta();
    const formattedFromDate = moment(query.fromDate).format(common.dateFormat);
    const formattedToDate = moment(query.toDate).format(common.dateFormat);

    return {
      ...common,
      sheetName: 'Managerial Profit and Loss',
      formattedFromDate,
      formattedToDate,
      formattedDateRange: this.i18n.t('financial_sheet.date_range', {
        args: { from: formattedFromDate, to: formattedToDate },
      }),
      basis,
      legalEntityScope: describeLegalEntityScope({
        legalEntityIds: query.legalEntityIds,
      }),
    };
  }
}
