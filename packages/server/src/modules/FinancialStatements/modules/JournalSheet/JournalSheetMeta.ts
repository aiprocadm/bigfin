import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import { IJournalReportQuery, IJournalSheetMeta } from './JournalSheet.types';

@Injectable()
export class JournalSheetMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieves the journal sheet meta.
   * @param {IJournalReportQuery} query -
   * @returns {Promise<IJournalSheetMeta>}
   */
  public async meta(query: IJournalReportQuery): Promise<IJournalSheetMeta> {
    const common = await this.financialSheetMeta.meta();

    const formattedToDate = moment(query.toDate).format(common.dateFormat);
    const formattedFromDate = moment(query.fromDate).format(common.dateFormat);
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    return {
      ...common,
      formattedDateRange,
      formattedFromDate,
      formattedToDate,
    };
  }
}
