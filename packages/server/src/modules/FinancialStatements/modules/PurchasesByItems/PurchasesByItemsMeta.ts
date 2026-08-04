import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import {
  IPurchasesByItemsReportQuery,
  IPurchasesByItemsSheetMeta,
} from './types/PurchasesByItems.types';

@Injectable()
export class PurchasesByItemsMeta {
  constructor(
    private financialSheetMetaModel: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieve the purchases by items meta.
   * @param {IPurchasesByItemsReportQuery} query
   * @returns {IPurchasesByItemsSheetMeta}
   */
  public async meta(
    query: IPurchasesByItemsReportQuery,
  ): Promise<IPurchasesByItemsSheetMeta> {
    const commonMeta = await this.financialSheetMetaModel.meta();
    const formattedToDate = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    return {
      ...commonMeta,
      sheetName: 'Purchases By Items',
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    };
  }
}
