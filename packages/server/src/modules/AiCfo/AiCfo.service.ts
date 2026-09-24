// © 2026 Bigfin
import { ForbiddenException, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as moment from 'moment';

import { events } from '@/common/events/events';
import { AiAnalystSettingsService } from '@/modules/AiAnalyst/AiAnalystSettings.service';
import { GetAiInsightsService } from '@/modules/AiAnalyst/queries/GetAiInsights.service';
import { createAiProvider } from '@/modules/AiAnalyst/providers/providers';
import { AI_UNAVAILABLE_MESSAGES } from '@/modules/AiAnalyst/utils/aiAvailability';
import { assertNoPrivateData } from '@/modules/AiAnalyst/utils/aiPrivacy';
import { comparisonPeriod } from '@/modules/Dashboard/queries/computeComparison';

import { AiCfoCaller, AiCfoDataClient } from './AiCfoData.client';
import { AiCfoIntent, classifyIntent, INTENTS } from './utils/intentClassifier';
import {
  AiCfoAnswer,
  cashDecrease,
  cashGap,
  ebitdaDrop,
  expenseGrowth,
  overdueReceivables,
  Period,
  periodDiff,
  pnlVsCash,
  reschedule,
} from './utils/evidence';
import { validateExplanation } from './utils/answerValidator';

export interface AiCfoReply extends Partial<AiCfoAnswer> {
  available: boolean;
  /** Не понял вопрос — список того, что умеет. */
  understood: boolean;
  message?: string;
  meta?: { basis: string; currency: string; legalEntities: string; calculatedAt: string };
  explanation?: { source: 'model' | 'template'; text: string; rejectedNumbers: number[]; note?: string };
}

/** Период по умолчанию — с начала месяца по сегодня: «как дела сейчас». */
export function defaultPeriod(today = moment()): Period {
  return { fromDate: today.clone().startOf('month').format('YYYY-MM-DD'), toDate: today.format('YYYY-MM-DD') };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * AI CFO (FT-102 ТЗ-3): вопрос → вид вопроса → расчёты → доказательства →
 * пояснение → ссылки на операции → предложенные действия.
 *
 * Отвечает и без модели: вывод и причины собираются по шаблону из чисел
 * отчётов. Модель, если подключена и разрешена, только пересказывает их своими
 * словами; её числа сверяются, неверные заменяются на «см. отчёт», и пишется
 * инцидент.
 */
@Injectable()
export class AiCfoService {
  private readonly logger = new Logger('AiCfo');

  constructor(
    private readonly data: AiCfoDataClient,
    private readonly insights: GetAiInsightsService,
    private readonly settings: AiAnalystSettingsService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  /** Раздел ИИ выключен — записки и ответов нет (ТЗ-1 §13.1). */
  public async assertEnabled() {
    const availability = await this.insights.getAvailability();
    if (!availability.available && availability.reason === 'feature_disabled') {
      throw new ForbiddenException({
        errors: [{ type: 'FEATURE_DISABLED', message: AI_UNAVAILABLE_MESSAGES.feature_disabled }],
      });
    }
  }

  public intents() {
    return INTENTS.map((i) => ({ key: i.key, example: i.example }));
  }

  public async ask(question: string, period: Partial<Period> | undefined, caller: AiCfoCaller): Promise<AiCfoReply> {
    const availability = await this.insights.getAvailability();
    // Раздел ИИ выключен — AI CFO нет вовсе (ТЗ-1 §13.1: флаг, выключен по умолчанию).
    if (!availability.available && availability.reason === 'feature_disabled') {
      return { available: false, understood: false, message: AI_UNAVAILABLE_MESSAGES.feature_disabled };
    }
    const intent = classifyIntent(question);
    if (!intent) {
      return {
        available: true,
        understood: false,
        message: 'Я отвечаю на вопросы о деньгах, прибыли, расходах, разрывах и долгах. Например: ' +
          INTENTS.map((i) => `«${i.example}»`).join(', ') + '.',
      };
    }
    const resolved: Period =
      period?.fromDate && period?.toDate && DATE.test(period.fromDate) && DATE.test(period.toDate) && period.fromDate <= period.toDate
        ? { fromDate: period.fromDate, toDate: period.toDate }
        : defaultPeriod();
    const base = comparisonPeriod(resolved, 'previous');
    const baseRange: Period = { fromDate: base.fromDate, toDate: base.toDate };

    const answer = await this.evidence(intent, resolved, baseRange, caller);
    const currency = 'RUB';
    const reply: AiCfoReply = {
      available: true,
      understood: true,
      ...answer,
      meta: {
        basis: intent === 'expense_growth' || intent === 'ebitda_drop' || intent === 'period_diff' ? 'по начислению' : 'по деньгам',
        currency,
        legalEntities: 'все юрлица (сводно)',
        calculatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      },
      explanation: { source: 'template', text: [answer.headline, ...answer.reasons.map((r) => r.text)].join(' '), rejectedNumbers: [] },
    };
    if (answer.empty) return reply;

    if (!availability.available) {
      reply.explanation!.note = availability.reason ? AI_UNAVAILABLE_MESSAGES[availability.reason] : undefined;
      return reply;
    }
    try {
      const modelText = await this.explain(question, answer);
      if (modelText) {
        const checked = validateExplanation(modelText, this.knownNumbers(answer));
        reply.explanation = { source: 'model', text: checked.text, rejectedNumbers: checked.rejected };
        if (checked.rejected.length) await this.incident(intent, question, checked.rejected);
      }
    } catch (error: any) {
      // Модель не ответила — остаётся пояснение по шаблону, оно верное.
      this.logger.warn(`Пояснение модели не получено: ${error?.message}`);
    }
    return reply;
  }

  /** Числа, которые модели разрешено назвать: только из доказательств. */
  public knownNumbers(answer: AiCfoAnswer) {
    return {
      figures: answer.figures.map((f) => f.value).filter((v) => v !== null),
      table: answer.table?.rows.flat().filter((v) => typeof v === 'number') ?? [],
      actions: answer.actions.map((a) => a.amount),
      reasons: answer.reasons.map((r) => (r.text.match(/-?\d[\d\s ]*(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(/[\s ]/g, '').replace(',', '.')))),
    };
  }

  private async evidence(intent: AiCfoIntent, period: Period, base: Period, caller: AiCfoCaller): Promise<AiCfoAnswer> {
    const cashFlow = (p: Period) =>
      this.data.get('reports/cash-flow-articles', { from_date: p.fromDate, to_date: p.toDate, date_group: 'total' }, caller);
    const pnl = (p: Period) =>
      this.data.get('reports/managerial-profit-loss', { from_date: p.fromDate, to_date: p.toDate, date_group: 'total' }, caller);
    const rollup = (p: Period) => this.data.get('management-articles/pl-rollup', { from_date: p.fromDate, to_date: p.toDate }, caller);
    const currency = 'RUB';

    switch (intent) {
      case 'cash_decrease': {
        const [now, before] = await Promise.all([cashFlow(period), cashFlow(base)]);
        return cashDecrease(now, before, period, base, currency);
      }
      case 'ebitda_drop': {
        const [now, before] = await Promise.all([pnl(period), pnl(base)]);
        return ebitdaDrop(now, before, period, base, currency);
      }
      case 'expense_growth': {
        const [now, before] = await Promise.all([rollup(period), rollup(base)]);
        return expenseGrowth(now, before, period, base, currency);
      }
      case 'period_diff': {
        const [now, before, cashNow, cashBefore] = await Promise.all([rollup(period), rollup(base), cashFlow(period), cashFlow(base)]);
        return periodDiff(now, before, cashNow, cashBefore, period, base, currency);
      }
      case 'pnl_vs_cash': {
        const dayBefore = moment(period.fromDate).subtract(1, 'day').format('YYYY-MM-DD');
        const [p, c, start, end] = await Promise.all([
          pnl(period),
          cashFlow(period),
          this.data.get('debts/overview', { as_date: dayBefore }, caller),
          this.data.get('debts/overview', { as_date: period.toDate }, caller),
        ]);
        const side = (d: any, key: 'receivable' | 'payable') => Number(d?.[key]?.total) || 0;
        return pnlVsCash(
          p,
          c,
          { start: side(start, 'receivable'), end: side(end, 'receivable') },
          { start: side(start, 'payable'), end: side(end, 'payable') },
          period,
          base,
          currency,
        );
      }
      case 'cash_gap': {
        const [gaps, scenarios] = await Promise.all([
          this.data.get('payment-calendar/cash-gaps', {}, caller),
          this.data.get('payment-calendar/gap-scenarios', {}, caller).catch(() => null),
        ]);
        return cashGap(gaps, scenarios, period, currency);
      }
      case 'reschedule':
        return reschedule(await this.data.get('payment-calendar/gap-scenarios', {}, caller), period, currency);
      case 'overdue_receivables':
        return overdueReceivables(await this.data.get('debts/overview', { side: 'receivable' }, caller), period, currency);
    }
  }

  /**
   * Пояснение модели: только цифры и подписи из доказательств, без имён
   * контрагентов и назначений платежей (ТЗ-1 §13.1).
   */
  private async explain(question: string, answer: AiCfoAnswer): Promise<string | null> {
    const rows = answer.figures
      .filter((f) => f.value !== null)
      .map((f, i) => ({
        label: answer.intent === 'overdue_receivables' ? `Показатель ${i + 1}` : f.label,
        amount: f.value as number,
      }));
    const payload = { rows, period: `${answer.period.fromDate}..${answer.period.toDate}` };
    assertNoPrivateData(payload);
    const provider = createAiProvider(await this.settings.getProviderSettings());
    const prompt = [
      'Ты — финансовый директор малого бизнеса. Объясни владельцу простыми словами, без терминов, 3–5 предложений.',
      'ИСПОЛЬЗУЙ ТОЛЬКО ЧИСЛА ИЗ ДАННЫХ НИЖЕ. Ничего не считай сам, не придумывай причин, которых нет в данных.',
      'Если данных мало — так и скажи.',
      `Вопрос: ${question}`,
      `Вывод расчёта: ${answer.intent === 'overdue_receivables' ? 'есть просроченные долги покупателей' : answer.headline}`,
      `Данные (JSON): ${JSON.stringify(payload)}`,
      'Ответь обычным текстом без форматирования.',
    ].join('\n');
    const text = await provider.complete(prompt, { temperature: 0.1, maxTokens: 500 });
    return String(text ?? '').trim() || null;
  }

  private async incident(intent: string, question: string, numbers: number[]) {
    this.logger.warn(`AI CFO: модель назвала числа не из расчёта (${intent}): ${numbers.join(', ')}`);
    try {
      await this.eventEmitter?.emitAsync(events.aiCfo.onNumberRejected, { intent, question, numbers });
    } catch {
      // Журнал инцидентов не должен ломать ответ.
    }
  }
}
