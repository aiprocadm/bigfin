import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';
import {
  IGeneralLedgerMeta,
  IGeneralLedgerSheetQuery,
} from './GeneralLedger.types';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';

@Injectable()
export class GeneralLedgerMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieve the general ledger meta.
   * @returns {IGeneralLedgerMeta}
   */
  public async meta(
    query: IGeneralLedgerSheetQuery,
  ): Promise<IGeneralLedgerMeta> {
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
      sheetName: 'Balance Sheet',
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    };
  }
}
