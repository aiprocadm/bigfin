import * as R from 'ramda';
import {
  ISalesByItemsItem,
  ISalesByItemsSheetData,
  ISalesByItemsTotal,
} from './SalesByItems.types';
import { ROW_TYPE } from './constants';
import { FinancialTable } from '../../common/FinancialTable';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialSheet } from '../../common/FinancialSheet';
import { ITableColumn, ITableRow } from '../../types/Table.types';
import { tableRowMapper } from '../../utils/Table.utils';
import { I18nService } from 'nestjs-i18n';

export class SalesByItemsTable extends R.pipe(
  FinancialTable,
  FinancialSheetStructure,
)(FinancialSheet) {
  /** Переводчик подписей столбцов: базовый класс объявляет поле
   * только для чтения, поэтому переобъявляем — как в JournalSheetTable. */
  i18n: any;

  private readonly data: ISalesByItemsSheetData;

  /**
   * Constructor method.
   * @param {ISalesByItemsSheetStatement} data
   */
  constructor(data: ISalesByItemsSheetData, i18n: I18nService) {
    super();
    // Подписи столбцов печатаются на языке организации (Л2 карты v34).
    this.i18n = i18n;
    this.data = data;
  }

  /**
   * Retrieves the common table accessors.
   * @returns {ITableColumn[]}
   */
  private commonTableAccessors() {
    return [
      { key: 'item_name', accessor: 'name' },
      { key: 'sold_quantity', accessor: 'quantitySoldFormatted' },
      { key: 'sold_amount', accessor: 'soldCostFormatted' },
      { key: 'average_price', accessor: 'averageSellPriceFormatted' },
    ];
  }

  /**
   * Maps the given item node to table row.
   * @param {ISalesByItemsItem} item
   * @returns {ITableRow}
   */
  private itemMap = (item: ISalesByItemsItem): ITableRow => {
    const columns = this.commonTableAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.ITEM],
    };
    return tableRowMapper(item, columns, meta);
  };

  /**
   * Maps the given items nodes to table rows.
   * @param {ISalesByItemsItem[]} items
   * @returns {ITableRow[]}
   */
  private itemsMap = (items: ISalesByItemsItem[]): ITableRow[] => {
    return R.map(this.itemMap, items);
  };

  /**
   * Maps the given total node to table row.
   * @param {ISalesByItemsTotal} total
   * @returns {ITableRow[]}
   */
  private totalMap = (total: ISalesByItemsTotal) => {
    const columns = this.commonTableAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.TOTAL],
    };
    return tableRowMapper(total, columns, meta);
  };

  /**
   * Retrieves the table rows.
   * @returns {ITableRow[]}
   */
  public tableData(): ITableRow[] {
    const itemsRows = this.itemsMap(this.data.items);
    const totalRow = this.totalMap(this.data.total);

    return R.compose(
      R.when(R.always(R.not(R.isEmpty(itemsRows))), R.append(totalRow))
    )([...itemsRows]) as ITableRow[];
  }

  /**
   * Retrieves the table columns.
   * @returns {ITableColumn[]}
   */
  public tableColumns(): ITableColumn[] {
    const columns = [
      { key: 'item_name', label: this.i18n.t('report_columns.item_name') },
      { key: 'sold_quantity', label: this.i18n.t('report_columns.sold_quantity') },
      { key: 'sold_amount', label: this.i18n.t('report_columns.sold_amount') },
      { key: 'average_price', label: this.i18n.t('report_columns.average_price') },
    ];
    return R.compose(this.tableColumnsCellIndexing)(columns);
  }
}
