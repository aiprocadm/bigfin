import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import { SalesTaxLiabilitySummaryQuery } from './SalesTaxLiability.types';

@Injectable()
export class SalesTaxLiabilitySummaryMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieves the report meta.
   * @param {number} tenantId
   * @param {SalesTaxLiabilitySummaryQuery} filter
   */
  public async meta(query: SalesTaxLiabilitySummaryQuery) {
    const commonMeta = await this.financialSheetMeta.meta();
    const formattedToDate = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    const sheetName = 'Sales Tax Liability Summary';

    return {
      ...commonMeta,
      sheetName,
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    };
  }
}
