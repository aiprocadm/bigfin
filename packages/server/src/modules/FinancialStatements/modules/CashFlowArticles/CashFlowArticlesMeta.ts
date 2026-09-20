// © 2026 Bigfin
import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import { Injectable } from '@nestjs/common';

import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';
import {
  ICashFlowArticlesMeta,
  ICashFlowArticlesQuery,
} from './CashFlowArticles.types';

@Injectable()
export class CashFlowArticlesMeta {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /** Шапка отчёта: организация, валюта, период. */
  public async meta(
    query: ICashFlowArticlesQuery,
  ): Promise<ICashFlowArticlesMeta> {
    const commonMeta = await this.financialSheetMeta.meta();
    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedToDate = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDate },
    });

    return {
      ...commonMeta,
      sheetName: 'Cash Flow by Articles',
      formattedFromDate,
      formattedToDate,
      formattedDateRange,
    } as ICashFlowArticlesMeta;
  }
}
