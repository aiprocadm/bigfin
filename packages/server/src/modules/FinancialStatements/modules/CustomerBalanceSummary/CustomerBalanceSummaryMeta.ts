import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import {
  ICustomerBalanceSummaryMeta,
  ICustomerBalanceSummaryQuery,
} from './CustomerBalanceSummary.types';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';

@Injectable()
export class CustomerBalanceSummaryMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieves the customer balance summary meta.
   * @param {ICustomerBalanceSummaryQuery} query
   * @returns {Promise<ICustomerBalanceSummaryMeta>}
   */
  async meta(
    query: ICustomerBalanceSummaryQuery,
  ): Promise<ICustomerBalanceSummaryMeta> {
    const commonMeta = await this.financialSheetMeta.meta();
    const formattedAsDate = moment(query.asDate).format(commonMeta.dateFormat);
    const formattedDateRange = this.i18n.t('financial_sheet.as_date', {
      args: { date: formattedAsDate },
    });

    return {
      ...commonMeta,
      sheetName: 'Customer Balance Summary',
      formattedAsDate,
      formattedDateRange,
    };
  }
}
