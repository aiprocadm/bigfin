// © 2026 Bigfin
import { Injectable, Logger } from '@nestjs/common';

import { AiAnalystSettingsService } from '@/modules/AiAnalyst/AiAnalystSettings.service';
import { GetAiInsightsService } from '@/modules/AiAnalyst/queries/GetAiInsights.service';
import { createAiProvider } from '@/modules/AiAnalyst/providers/providers';
import { AI_UNAVAILABLE_MESSAGES } from '@/modules/AiAnalyst/utils/aiAvailability';
import { assertNoPrivateData } from '@/modules/AiAnalyst/utils/aiPrivacy';

import { CHAT_TOOLS } from './utils/chatTools';
import { validateToolCall } from './utils/toolCallValidation';
import {
  ANSWER_FALLBACK,
  MAX_TOOL_ROUNDS,
  checkAnswer,
} from './utils/chatAnswer';
import { ChatToolRunner } from './ChatToolRunner.service';
import { buildChatPrompt, parseModelStep } from './utils/chatPrompt';

export interface ChatReply {
  available: boolean;
  /** Текст для человека: либо ответ модели, либо объяснение, почему его нет. */
  text: string;
  /** Отчёты, по которым отвечали (§13.1 п. 3). */
  links: string[];
  /** Какие инструменты вызывались — чтобы ответ можно было перепроверить. */
  usedTools: string[];
  /** Забракован ли ответ и почему. */
  rejection: string | null;
}

/**
 * ИИ-чат по финансам (этап 14 ТЗ).
 *
 * Модель НЕ получает доступ к базе. Она может попросить один из перечисленных
 * инструментов, каждый из которых — вызов существующего отчёта. Считают
 * по-прежнему наши отчёты: тот же расчёт, что человек видит на экране.
 * Потому ответ и сходится с отчётом.
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly insights: GetAiInsightsService,
    private readonly settings: AiAnalystSettingsService,
    private readonly runner: ChatToolRunner,
  ) {}

  /** Какие инструменты доступны — для подсказок на экране. */
  public getTools() {
    return CHAT_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  public async ask(question: string): Promise<ChatReply> {
    // Доступность та же, что у аналитика: флаг, запрет на внешние сервисы,
    // настроенность провайдера. Отдельного выключателя для чата нет
    // намеренно — два выключателя одного и того же путают.
    const availability = await this.insights.getAvailability();

    if (!availability.available) {
      return {
        available: false,
        text: availability.reason
          ? AI_UNAVAILABLE_MESSAGES[availability.reason]
          : '',
        links: [],
        usedTools: [],
        rejection: availability.reason,
      };
    }

    const provider = createAiProvider(await this.settings.getProviderSettings());

    const transcript: string[] = [];
    const toolResults: unknown[] = [];
    const links: string[] = [];
    const usedTools: string[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const answer = await provider.complete(
        buildChatPrompt({ question, transcript }),
        { temperature: 0.1, maxTokens: 700 },
      );

      const step = parseModelStep(answer);

      if (step.kind === 'answer') {
        return this.finish(step.text, question, toolResults, links, usedTools);
      }

      const validated = validateToolCall(step.call);

      if ('rejection' in validated) {
        // Причина уходит обратно модели: «инструмента get_revenue нет» она
        // понимает и исправляется. Молчаливый отказ заставил бы её
        // выдумать ответ.
        transcript.push(
          `Запрос отклонён: ${validated.rejection.detail}`,
        );
        continue;
      }

      const { tool, params } = validated.call;

      let result: unknown;

      try {
        result = await this.runner.run(tool.name, params);
      } catch (error) {
        this.logger.warn(
          `ИИ-чат: инструмент «${tool.name}» не отработал — ${
            (error as Error)?.message ?? 'неизвестная ошибка'
          }`,
        );
        transcript.push(`Инструмент ${tool.name} не смог посчитать.`);
        continue;
      }

      // Результат инструмента идёт ОБРАТНО В МОДЕЛЬ, то есть наружу. Значит,
      // он проходит ту же проверку приватности, что и выводы аналитика:
      // отчёт мог бы принести с собой название контрагента или назначение
      // платежа, и без этой проверки они уехали бы незаметно.
      assertNoPrivateData(result);

      toolResults.push(result);
      usedTools.push(tool.name);
      if (!links.includes(tool.link)) links.push(tool.link);

      transcript.push(
        `Инструмент ${tool.name} вернул: ${JSON.stringify(result)}`,
      );
    }

    // Круги кончились, ответа нет. Без предела модель, которая не может
    // подобрать параметры, крутилась бы по кругу — и каждый круг платный.
    return {
      available: true,
      text: 'Не удалось собрать ответ. Попробуйте задать вопрос конкретнее — например, с периодом.',
      links,
      usedTools,
      rejection: 'no_answer',
    };
  }

  private finish(
    text: string,
    question: string,
    toolResults: unknown[],
    links: string[],
    usedTools: string[],
  ): ChatReply {
    const checked = checkAnswer({ text, question, toolResults, links });

    if (checked.rejection) {
      // В журнал идёт только причина и сами лишние числа, без текста
      // ответа: текст мог бы утянуть в журнал данные организации.
      this.logger.warn(
        `ИИ-чат: ответ забракован (${checked.rejection}), лишние числа: ${
          checked.unknownNumbers.join(', ') || '—'
        }`,
      );

      return {
        available: true,
        text: ANSWER_FALLBACK[checked.rejection],
        links,
        usedTools,
        rejection: checked.rejection,
      };
    }

    return {
      available: true,
      text: checked.text,
      links,
      usedTools,
      rejection: null,
    };
  }
}
