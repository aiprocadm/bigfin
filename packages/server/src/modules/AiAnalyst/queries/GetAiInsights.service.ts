// © 2026 Bigfin
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as moment from 'moment';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';

import { AiInsight } from '../models/AiInsight.model';
import { AiAnalystSettingsService } from '../AiAnalystSettings.service';
import { createAiProvider } from '../providers/providers';
import {
  AI_UNAVAILABLE_MESSAGES,
  AiUnavailableReason,
  getAiAvailability,
} from '../utils/aiAvailability';
import { buildAggregates } from '../utils/buildAggregates';
import { buildInsightsPrompt, parseInsightsResponse } from '../utils/insightsPrompt';
import { selectInsights } from '../utils/insightValidation';

/** Где показываются выводы. */
export const AI_SCOPES = {
  dashboard: {
    reportKey: 'profit_loss',
    link: '/financial-reports/profit-loss-sheet',
  },
  profit_loss: {
    reportKey: 'profit_loss',
    link: '/financial-reports/profit-loss-sheet',
  },
  cash_flow: {
    reportKey: 'cash_flow',
    link: '/financial-reports/cashflow-statement',
  },
  balance_sheet: {
    reportKey: 'balance_sheet',
    link: '/financial-reports/balance-sheet',
  },
} as const;

export type AiScope = keyof typeof AI_SCOPES;

export interface AiInsightsResult {
  available: boolean;
  reason: AiUnavailableReason | null;
  /** Что показать вместо выводов, когда их нет. */
  message: string | null;
  generatedFor: string | null;
  insights: Array<{ text: string; link: string | null; reportKey: string | null }>;
}

/**
 * Выводы ИИ-аналитика (этап 13 ТЗ).
 *
 * Читает ТОЛЬКО кеш. Формирование — дело фоновой задачи (§13.3: «Не по
 * запросу — иначе дорого и медленно»). Открытие главной страницы не должно
 * ни ждать модель, ни оплачивать её.
 */
@Injectable()
export class GetAiInsightsService {
  private readonly logger = new Logger(GetAiInsightsService.name);

  constructor(
    @Inject(AiInsight.name)
    private readonly aiInsightModel: TenantModelProxy<typeof AiInsight>,

    private readonly featuresManager: FeaturesManager,
    private readonly settings: AiAnalystSettingsService,
    private readonly rollup: ArticlesPlRollupService,
  ) {}

  /** Доступен ли раздел и почему нет. */
  public async getAvailability() {
    const featureEnabled = await this.featuresManager.accessible(
      Features.AI_ANALYST,
    );
    const providerSettings = await this.settings.getProviderSettings();
    const provider = createAiProvider(providerSettings);

    return getAiAvailability({
      featureEnabled,
      forbidExternalData: await this.settings.isExternalDataForbidden(),
      provider: providerSettings.provider,
      providerConfigured: provider.isConfigured(),
      providerIsLocal: provider.isLocal,
    });
  }

  /**
   * Отдаёт выводы для экрана.
   *
   * Когда раздел недоступен, возвращается ПРИЧИНА и объяснение, а не пустой
   * список: пустота выглядит так же, как «модели нечего сказать», и человек
   * решает, что у него в делах всё ровно (§13.1 п. 5).
   */
  public async getInsights(scope: AiScope): Promise<AiInsightsResult> {
    const availability = await this.getAvailability();

    if (!availability.available) {
      return {
        available: false,
        reason: availability.reason,
        message: availability.reason
          ? AI_UNAVAILABLE_MESSAGES[availability.reason]
          : null,
        generatedFor: null,
        insights: [],
      };
    }

    const cached = await this.aiInsightModel()
      .query()
      .where('scope', scope)
      .orderBy('generatedFor', 'desc')
      .first();

    if (!cached) {
      return {
        available: true,
        reason: null,
        // Внятное «ещё не сформировано» вместо пустоты: раздел включили
        // только что, и фоновая задача до него ещё не дошла.
        message: 'Выводы формируются раз в сутки. Первые появятся завтра.',
        generatedFor: null,
        insights: [],
      };
    }

    return {
      available: true,
      reason: null,
      message: null,
      generatedFor: moment(cached.generatedFor).format('YYYY-MM-DD'),
      insights: this.parseCached(cached.insights),
    };
  }

  /**
   * Формирует выводы и кладёт в кеш. Вызывается фоновой задачей.
   *
   * Возвращает, сколько модель предложила и сколько мы отбраковали: без этих
   * чисел невозможно понять, что модель начала врать — на экране-то остаются
   * только принятые.
   */
  public async generate(
    scope: AiScope,
    asOf: Date = new Date(),
  ): Promise<{ accepted: number; rejected: number } | null> {
    const availability = await this.getAvailability();

    if (!availability.available) return null;

    const providerSettings = await this.settings.getProviderSettings();
    const provider = createAiProvider(providerSettings);

    const period = this.buildPeriod(asOf);
    const aggregates = buildAggregates({
      current: await this.rollup.getOwnAmounts({
        fromDate: period.from,
        toDate: period.to,
      } as any),
      previous: await this.rollup.getOwnAmounts({
        fromDate: period.previousFrom,
        toDate: period.previousTo,
      } as any),
      reportKey: AI_SCOPES[scope].reportKey,
      link: AI_SCOPES[scope].link,
    });

    if (aggregates.length === 0) return { accepted: 0, rejected: 0 };

    // Сборка промпта ломается, если в агрегаты просочилось приватное поле.
    // Ловим здесь, чтобы фоновая задача записала это в журнал, а не молча
    // перестала работать.
    const prompt = buildInsightsPrompt({ period: period.label, rows: aggregates });

    const answer = await provider.complete(prompt, {
      temperature: 0.2,
      maxTokens: 800,
    });

    const suggested = parseInsightsResponse(answer).map((item) => ({
      text: item.text,
      reportKey: item.reportKey ?? AI_SCOPES[scope].reportKey,
      link: AI_SCOPES[scope].link,
    }));

    const { accepted, rejected } = selectInsights(suggested, aggregates);

    if (rejected.length > 0) {
      // Числа, которых нет в отчёте, — повод присмотреться к модели.
      // В журнал идут СЧЁТЧИКИ, а не тексты: текст мог бы утянуть за собой
      // в журнал то, что модель дословно повторила из данных.
      this.logger.warn(
        `ИИ-аналитик (${scope}): отбраковано ${rejected.length} из ${suggested.length} наблюдений.`,
      );
    }

    await this.saveToCache(scope, asOf, accepted, suggested.length, rejected.length, provider.key);

    return { accepted: accepted.length, rejected: rejected.length };
  }

  private async saveToCache(
    scope: AiScope,
    asOf: Date,
    accepted: Array<{ text: string; link?: string | null; reportKey?: string | null }>,
    suggestedCount: number,
    rejectedCount: number,
    providerKey: string,
  ): Promise<void> {
    const generatedFor = moment(asOf).format('YYYY-MM-DD');

    const payload = {
      scope,
      generatedFor,
      insights: JSON.stringify(
        accepted.map((insight) => ({
          text: insight.text,
          link: insight.link ?? null,
          reportKey: insight.reportKey ?? null,
        })),
      ),
      suggestedCount,
      rejectedCount,
      provider: providerKey,
    };

    const existing = await this.aiInsightModel()
      .query()
      .findOne({ scope, generatedFor });

    if (existing) {
      await this.aiInsightModel().query().patchAndFetchById(existing.id, payload as any);
      return;
    }
    await this.aiInsightModel().query().insert(payload as any);
  }

  /** Текущий месяц и такой же предыдущий — встык и той же длины. */
  private buildPeriod(asOf: Date) {
    const current = moment(asOf).startOf('month');
    const previous = current.clone().subtract(1, 'month');

    return {
      from: current.format('YYYY-MM-DD'),
      to: current.clone().endOf('month').format('YYYY-MM-DD'),
      previousFrom: previous.format('YYYY-MM-DD'),
      previousTo: previous.clone().endOf('month').format('YYYY-MM-DD'),
      label: current.format('MMMM YYYY'),
    };
  }

  private parseCached(raw: string) {
    try {
      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Испорченный кеш — это пусто, а не падение главной страницы.
      return [];
    }
  }
}
