import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import {
  ITransactionsByCustomersFilter,
  ITransactionsByCustomersMeta,
} from './TransactionsByCustomer.types';

@Injectable()
export class TransactionsByCustomersMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieves the transactions by customers meta.
   * @param {ITransactionsByCustomersFilter} query - Transactions by customers filter.
   * @returns {ITransactionsByCustomersMeta}
   */
  public async meta(
    query: ITransactionsByCustomersFilter,
  ): Promise<ITransactionsByCustomersMeta> {
    const commonMeta = await this.financialSheetMeta.meta();

    const formattedToDate = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    return {
      ...commonMeta,
      sheetName: 'Transactions By Customers',
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    };
  }
}
