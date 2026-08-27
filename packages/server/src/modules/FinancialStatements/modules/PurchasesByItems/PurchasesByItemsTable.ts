import * as R from 'ramda';
import { ROW_TYPE } from './_types';
import {
  IPurchasesByItemsItem,
  IPurchasesByItemsSheetData,
  IPurchasesByItemsTotal,
} from './types/PurchasesByItems.types';
import { ITableColumn, ITableColumnAccessor, ITableRow } from '../../types/Table.types';
import { FinancialTable } from '../../common/FinancialTable';
import { FinancialSheetStructure } from '../../common/FinancialSheetStructure';
import { FinancialSheet } from '../../common/FinancialSheet';
import { tableRowMapper } from '../../utils/Table.utils';
import { I18nService } from 'nestjs-i18n';

export class PurchasesByItemsTable extends R.compose(
  FinancialTable,
  FinancialSheetStructure
)(FinancialSheet) {
  /** Переводчик подписей столбцов: базовый класс объявляет поле
   * только для чтения, поэтому переобъявляем — как в JournalSheetTable. */
  i18n: any;

  private data: IPurchasesByItemsSheetData;

  /**
   * Constructor method.
   * @param data
   */
  constructor(data: IPurchasesByItemsSheetData, i18n: I18nService) {
    super();
    // Подписи столбцов печатаются на языке организации (Л2 карты v34).
    this.i18n = i18n;
    this.data = data;
  }

  /**
   * Retrieves thge common table accessors.
   * @returns {ITableColumnAccessor[]}
   */
  private commonTableAccessors(): ITableColumnAccessor[] {
    return [
      { key: 'item_name', accessor: 'name' },
      { key: 'quantity_purchases', accessor: 'quantityPurchasedFormatted' },
      { key: 'purchase_amount', accessor: 'purchaseCostFormatted' },
      { key: 'average_cost', accessor: 'averageCostPriceFormatted' },
    ];
  }

  /**
   * Retrieves the common table columns.
   * @returns {ITableColumn[]}
   */
  private commonTableColumns(): ITableColumn[] {
    return [
      { label: this.i18n.t('report_columns.item_name'), key: 'item_name' },
      { label: this.i18n.t('report_columns.quantity_purchased'), key: 'quantity_purchases' },
      { label: this.i18n.t('report_columns.purchase_amount'), key: 'purchase_amount' },
      { label: this.i18n.t('report_columns.average_price'), key: 'average_cost' },
    ];
  }

  /**
   * Maps the given item node to table row.
   * @param {IPurchasesByItemsItem} item
   * @returns {ITableRow}
   */
  private itemMap = (item: IPurchasesByItemsItem): ITableRow => {
    const columns = this.commonTableAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.ITEM],
    };
    return tableRowMapper(item, columns, meta);
  };

  /**
   * Maps the given items nodes to table rows.
   * @param {IPurchasesByItemsItem[]} items - Items nodes.
   * @returns {ITableRow[]}
   */
  private itemsMap = (items: IPurchasesByItemsItem[]): ITableRow[] => {
    return R.map(this.itemMap)(items);
  };

  /**
   * Maps the given total node to table rows.
   * @param {IPurchasesByItemsTotal} total
   * @returns {ITableRow}
   */
  private totalNodeMap = (total: IPurchasesByItemsTotal): ITableRow => {
    const columns = this.commonTableAccessors();
    const meta = {
      rowTypes: [ROW_TYPE.TOTAL],
    };
    return tableRowMapper(total, columns, meta);
  };

  /**
   * Retrieves the table columns.
   * @returns {ITableColumn[]}
   */
  public tableColumns(): ITableColumn[] {
    const columns = this.commonTableColumns();
    return R.compose(this.tableColumnsCellIndexing)(columns);
  }

  /**
   * Retrieves the table rows.
   * @returns {ITableRow[]}
   */
  public tableData(): ITableRow[] {
    const itemsRows = this.itemsMap(this.data.items);
    const totalRow = this.totalNodeMap(this.data.total);

    return R.compose(
      R.when(R.always(R.not(R.isEmpty(itemsRows))), R.append(totalRow))
    )(itemsRows) as ITableRow[];
  }
}
