// © 2026 Bigfin
import { I18nService } from 'nestjs-i18n';

import { ITableRow } from '../../types/Table.types';
import {
  hasTotalColumn,
  IManagerialReportColumn,
  managerialReportColumns,
  NAME_COLUMN_KEY,
  TOTAL_COLUMN_KEY,
} from '../../common/ManagerialReportColumns';
import { ManagerialPnlColumn, PnlNode } from './buildManagerialPnlReport';
import { ManagerialPnlData } from './ManagerialPnlService';

export interface ManagerialPnlTableOptions {
  showTotalColumn?: boolean;
  /** Строки с нулём во всех колонках; по умолчанию спрятаны. */
  showEmpty?: boolean;
}

/** Итоги и рентабельность не прячутся никогда: это сама лестница. */
const NEVER_HIDDEN = ['PL_TOTAL', 'PL_METRIC'];

/**
 * Таблица управленческого ОПиУ — общая для экрана и выгрузок.
 *
 * ЯЧЕЙКА РЕНТАБЕЛЬНОСТИ — ЧИСЛО ПРОЦЕНТОВ ИЛИ ПУСТО. Пусто значит «не
 * определено» (выручка ноль или меньше), и экран пишет «н/о». Ноль туда не
 * ставится никогда: «0 %» соврало бы, что бизнес ничего не зарабатывает.
 */
export class ManagerialPnlTable {
  private readonly values: Array<{ key: string; values: Map<string, number | null> }>;

  constructor(
    private readonly data: ManagerialPnlData,
    private readonly i18n: I18nService,
    private readonly options: ManagerialPnlTableOptions = {},
  ) {
    const periods = data.periods ?? [];
    this.values = periods.map((period) => ({
      key: period.key,
      values: valuesOf(period.column),
    }));
    if (hasTotalColumn(periods.length, options.showTotalColumn)) {
      this.values.push({ key: TOTAL_COLUMN_KEY, values: valuesOf(data.total) });
    }
  }

  private t(key: string, fallback: string): string {
    try {
      const translated = this.i18n.t(key) as unknown as string;
      return translated && translated !== key ? translated : fallback;
    } catch {
      return fallback;
    }
  }

  public tableColumns(): IManagerialReportColumn[] {
    return managerialReportColumns({
      nameLabel: this.t('managerial_pnl.column.name', 'Показатель'),
      totalLabel: this.t('managerial_pnl.column.total', 'Итого'),
      periods: this.data.periods ?? [],
      showTotalColumn: this.options.showTotalColumn,
    });
  }

  private anyNonZero(id: string): boolean {
    return this.values.some((column) => {
      const value = column.values.get(id);
      return value !== null && value !== undefined && value !== 0;
    });
  }

  private isEmpty(node: PnlNode): boolean {
    return !this.anyNonZero(node.id) && node.children.every((c) => this.isEmpty(c));
  }

  private row(node: PnlNode): ITableRow {
    const children = node.children
      .filter(
        (child) =>
          this.options.showEmpty || child.isNone || !this.isEmpty(child),
      )
      .map((child) => this.row(child));

    return {
      id: node.id,
      cells: [
        {
          key: NAME_COLUMN_KEY,
          value: node.labelKey ? this.t(node.labelKey, node.name) : node.name,
        },
        ...this.values.map((column) => {
          const value = column.values.get(node.id);
          return {
            key: column.key,
            value: value === null ? '' : String(value ?? 0),
          };
        }),
      ],
      rowTypes: [node.rowType],
      children,
    };
  }

  public tableData(): ITableRow[] {
    return (this.data.total.rows ?? [])
      .filter((node) => {
        if (NEVER_HIDDEN.includes(node.rowType)) return true;
        // «Не отнесено» — только когда есть что показать.
        if (node.rowType === 'UNASSIGNED') return !this.isEmpty(node);
        return this.options.showEmpty || !this.isEmpty(node);
      })
      .map((node) => this.row(node));
  }
}

/** Значения строк колонки по ключу; у рентабельности — процент или null. */
function valuesOf(column: ManagerialPnlColumn): Map<string, number | null> {
  const values = new Map<string, number | null>();
  const walk = (nodes: PnlNode[]) =>
    nodes.forEach((node) => {
      values.set(node.id, node.amount);
      walk(node.children);
    });
  walk(column.rows);
  return values;
}
