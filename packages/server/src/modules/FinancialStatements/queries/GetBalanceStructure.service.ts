// © 2026 Bigfin
import { Injectable } from '@nestjs/common';

import { BalanceSheetApplication } from '../modules/BalanceSheet/BalanceSheetApplication';

/** Одна доля картинки: группа активов или источников. */
export interface BalanceStructureSlice {
  id: string;
  name: string;
  total: number;
  /** Доля в своей половине, 0..1. У отрицательных групп — ноль. */
  share: number;
}

export interface BalanceStructure {
  assets: BalanceStructureSlice[];
  liabilitiesEquity: BalanceStructureSlice[];
  assetsTotal: number;
  liabilitiesEquityTotal: number;
}

/** Корни баланса: слева имущество, справа источники. */
const ASSETS_ROOT = 'ASSETS';
const LIABILITY_EQUITY_ROOT = 'LIABILITY_EQUITY';

/**
 * Структура баланса для картинки (этап 4 ТЗ, остаток О2).
 *
 * ЧТО ПОКАЗЫВАЕМ. Две полосы: из чего состоит имущество и за чей счёт оно
 * куплено. Именно так баланс и читают: левая сторона — что есть, правая —
 * чьё оно. Круговая диаграмма здесь хуже: она показывает одну сторону и
 * прячет главное свойство баланса — равенство сторон.
 *
 * БЕРЁМ ВТОРОЙ УРОВЕНЬ, А НЕ СЧЕТА. У организации легко набирается сорок
 * счетов; картинка из сорока долей не сообщает ничего. Второй уровень —
 * «Оборотные активы», «Основные средства», «Обязательства», «Капитал» — это
 * те слова, которыми предприниматель и думает о своих деньгах.
 *
 * ОТРИЦАТЕЛЬНЫЕ ГРУППЫ НЕ РИСУЮТСЯ, НО И НЕ ПРЯЧУТСЯ. Группа бывает
 * отрицательной по-настоящему: накопленная амортизация больше стоимости
 * основных средств. Ширины у такой доли не существует, поэтому доля равна
 * нулю, а сама группа возвращается со своей суммой — витрина показывает её
 * отдельной строкой. Молча выбросить её было бы хуже всего: сумма долей не
 * сошлась бы с итогом, и картинка спорила бы с таблицей под ней.
 */
@Injectable()
export class GetBalanceStructureService {
  constructor(private readonly balanceSheet: BalanceSheetApplication) {}

  public async getStructure(
    fromDate: string,
    toDate: string,
  ): Promise<BalanceStructure> {
    const report: any = await this.balanceSheet.sheet({
      fromDate,
      toDate,
    } as any);

    const nodes: any[] = report?.data ?? [];

    const assets = this.groupsOf(nodes, ASSETS_ROOT);
    const liabilitiesEquity = this.groupsOf(nodes, LIABILITY_EQUITY_ROOT);

    return {
      assets,
      liabilitiesEquity,
      assetsTotal: this.totalOf(nodes, ASSETS_ROOT),
      liabilitiesEquityTotal: this.totalOf(nodes, LIABILITY_EQUITY_ROOT),
    };
  }

  /** Группы второго уровня одной стороны баланса. */
  private groupsOf(nodes: any[], rootId: string): BalanceStructureSlice[] {
    const root = this.findNode(nodes, rootId);
    const children: any[] = root?.children ?? [];

    const groups = children
      .map((node) => ({
        id: String(node?.id ?? ''),
        name: String(node?.name ?? ''),
        total: Number(node?.total?.amount ?? 0),
      }))
      // Пустая группа — это не «ноль процентов», это отсутствие строки.
      // Показывать её значит засорять картинку ничем.
      .filter((group) => group.total !== 0);

    // Ширины считаем от суммы ПОЛОЖИТЕЛЬНЫХ групп: только они и рисуются.
    const drawable = groups.reduce(
      (sum, group) => (group.total > 0 ? sum + group.total : sum),
      0,
    );

    return groups.map((group) => ({
      ...group,
      share: drawable > 0 && group.total > 0 ? group.total / drawable : 0,
    }));
  }

  private totalOf(nodes: any[], rootId: string): number {
    return Number(this.findNode(nodes, rootId)?.total?.amount ?? 0);
  }

  private findNode(nodes: any[], id: string): any {
    for (const node of nodes ?? []) {
      if (node?.id === id) return node;

      const found = this.findNode(node?.children ?? [], id);

      if (found) return found;
    }
    return null;
  }
}
