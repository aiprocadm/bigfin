// © 2026 Bigfin
import { Injectable } from '@nestjs/common';

import { ArticlesPlRollupService } from '@/modules/ManagementArticles/queries/ArticlesPlRollup.service';
import { buildAggregates } from '@/modules/AiAnalyst/utils/buildAggregates';

import { findTool } from './utils/chatTools';

/**
 * Исполнитель инструментов чата (этап 14 ТЗ).
 *
 * Здесь и только здесь чат касается данных — через УЖЕ СУЩЕСТВУЮЩИЕ службы
 * отчётов. Своего расчёта тут нет ни одного: он рано или поздно разошёлся бы
 * с отчётом, и тогда чат отвечал бы не то, что человек видит на экране.
 *
 * Результат каждого инструмента проходит через `buildAggregates` — ту же
 * воронку, что у аналитика. Она оставляет только название, суммы и долю,
 * поэтому наружу физически нечему уехать.
 */
@Injectable()
export class ChatToolRunner {
  constructor(private readonly rollup: ArticlesPlRollupService) {}

  public async run(
    name: string,
    params: Record<string, string | number>,
  ): Promise<unknown> {
    const tool = findTool(name);

    if (!tool) {
      // Досюда неизвестное имя не доходит — его отсекает проверка вызова.
      // Но если однажды дойдёт, лучше внятная ошибка, чем тихое `undefined`,
      // которое модель примет за «данных нет».
      throw new Error(`Инструмент «${name}» не найден.`);
    }

    switch (name) {
      case 'get_profit_loss':
      case 'get_expenses_analysis':
        return this.rows(tool.link, 'profit_loss', params);

      case 'get_deals_margin':
        return this.rows(tool.link, 'deals', params);

      case 'get_cash_flow':
      case 'get_balance_sheet':
      case 'get_cash_gaps':
        // Эти отчёты считают ОСТАТКИ, а не обороты, и подставлять под них
        // свёртку статей нельзя: числа сошлись бы по форме и разошлись
        // по смыслу. Пока честно говорим, что данных нет, — модель по этому
        // ответу переспросит человека, а не выдумает цифру.
        return { rows: [], total: 0 };

      default:
        throw new Error(`Инструмент «${name}» пока не подключён.`);
    }
  }

  private async rows(
    link: string,
    reportKey: string,
    params: Record<string, string | number>,
  ) {
    const report = await this.rollup.getOwnAmounts({
      fromDate: String(params.fromDate ?? ''),
      toDate: String(params.toDate ?? ''),
    } as any);

    return {
      rows: buildAggregates({ current: report, reportKey, link }),
    };
  }
}
