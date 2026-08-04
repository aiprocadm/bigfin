import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import { IAgingSummaryMeta, IAgingSummaryQuery } from './AgingSummary.types';

@Injectable()
export class AgingSummaryMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieve the aging summary meta.
   * @returns {IBalanceSheetMeta}
   */
  public async meta(query: IAgingSummaryQuery): Promise<IAgingSummaryMeta> {
    const commonMeta = await this.financialSheetMeta.meta();
    const formattedAsDate = moment(query.asDate).format(commonMeta.dateFormat);
    const formattedDateRange = this.i18n.t('financial_sheet.as_date', {
      args: { date: formattedAsDate },
    });

    return {
      ...commonMeta,
      sheetName: 'A/P Aging Summary',
      formattedAsDate,
      formattedDateRange,
    };
  }
}
