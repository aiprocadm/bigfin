import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import {
  ISalesByItemsReportQuery,
  ISalesByItemsSheetMeta,
} from './SalesByItems.types';

@Injectable()
export class SalesByItemsMeta {
  constructor(
    private financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieve the sales by items meta.
   * @returns {IBalanceSheetMeta}
   */
  public async meta(
    query: ISalesByItemsReportQuery,
  ): Promise<ISalesByItemsSheetMeta> {
    const commonMeta = await this.financialSheetMeta.meta();
    const formattedToDate = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    const sheetName = 'Sales By Items';

    return {
      ...commonMeta,
      sheetName,
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    };
  }
}
