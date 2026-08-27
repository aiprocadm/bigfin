import * as R from 'ramda';
import {
  IInventoryValuationItem,
  IInventoryValuationSheetData,
  IInventoryValuationTotal,
} from './InventoryValuationSheet.types';
import { ROW_TYPE } from './_constants';
import { FinancialTable } from '../../common/FinancialTable';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialSheet } from '../../common/FinancialSheet';
import {
  ITableColumn,
  ITableColumnAccessor,
  ITableRow,
} from '../../types/Table.types';
import { tableRowMapper } from '../../utils/Table.utils';
import { I18nService } from 'nestjs-i18n';

export class InventoryValuationSheetTable extends R.pipe(
  FinancialTable,
  FinancialSheetStructure,
)(FinancialSheet) {
  /** Переводчик подписей столбцов: базовый класс объявляет поле
   * только для чтения, поэтому переобъявляем — как в JournalSheetTable. */
  i18n: any;

  private readonly data: IInventoryValuationSheetData;

  /**
   * Constructor method.
   * @param {IInventoryValuationSheetData} data
   */
  constructor(data: IInventoryValuationSheetData, i18n: I18nService) {
    super();
    // Подписи столбцов печатаются на языке организации (Л2 карты v34).
    this.i18n = i18n;
    this.data = data;
  }

  /**
   * Retrieves the common columns accessors.
   * @returns {ITableColumnAccessor}
   */
  private commonColumnsAccessors(): ITableColumnAccessor[] {
    return [
      { key: 'item_name', accessor: 'name' },
      { key: 'quantity', accessor: 'quantityFormatted' },
      { key: 'valuation', accessor: 'valuationFormatted' },
      { key: 'average', accessor: 'averageFormatted' },
    ];
  }

  /**
   * Maps the given total node to table row.
   * @param {IInventoryValuationTotal} total
   * @returns {ITableRow}
   */
  private totalRowMapper = (total: IInventoryValuationTotal): ITableRow => {
    const accessors = this.commonColumnsAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.TOTAL],
    };
    return tableRowMapper(total, accessors, meta);
  };

  /**
   * Maps the given item node to table row.
   * @param {IInventoryValuationItem} item
   * @returns {ITableRow}
   */
  private itemRowMapper = (item: IInventoryValuationItem): ITableRow => {
    const accessors = this.commonColumnsAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.ITEM],
    };
    return tableRowMapper(item, accessors, meta);
  };

  /**
   * Maps the given items nodes to table rowes.
   * @param {IInventoryValuationItem[]} items
   * @returns {ITableRow[]}
   */
  private itemsRowsMapper = (items: IInventoryValuationItem[]): ITableRow[] => {
    return R.map(this.itemRowMapper)(items);
  };

  /**
   * Retrieves the table rows.
   * @returns {ITableRow[]}
   */
  public tableRows(): ITableRow[] {
    const itemsRows = this.itemsRowsMapper(this.data.items);
    const totalRow = this.totalRowMapper(this.data.total);

    return R.compose(
      R.when(R.always(R.not(R.isEmpty(itemsRows))), R.append(totalRow)),
    )([...itemsRows]) as ITableRow[];
  }

  /**
   * Retrieves the table columns.
   * @returns {ITableColumn[]}
   */
  public tableColumns(): ITableColumn[] {
    const columns = [
      { key: 'item_name', label: this.i18n.t('report_columns.item_name') },
      { key: 'quantity', label: this.i18n.t('report_columns.quantity') },
      { key: 'valuation', label: this.i18n.t('report_columns.valuation') },
      { key: 'average', label: this.i18n.t('report_columns.average') },
    ];
    return R.compose(this.tableColumnsCellIndexing)(columns);
  }
}
