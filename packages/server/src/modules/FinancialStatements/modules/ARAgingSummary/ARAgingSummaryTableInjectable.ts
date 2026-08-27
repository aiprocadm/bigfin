import { ARAgingSummaryTable } from './ARAgingSummaryTable';
import { ARAgingSummaryService } from './ARAgingSummaryService';
import { Injectable } from '@nestjs/common';
import { IARAgingSummaryTable } from './ARAgingSummary.types';
import { ARAgingSummaryQueryDto } from './ARAgingSummaryQuery.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ARAgingSummaryTableInjectable {
  constructor(
    private readonly ARAgingSummarySheet: ARAgingSummaryService,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Retrieves A/R aging summary in table format.
   * @param {ARAgingSummaryQueryDto} query - Aging summary query.
   * @returns {Promise<IARAgingSummaryTable>}
   */
  public async table(
    query: ARAgingSummaryQueryDto,
  ): Promise<IARAgingSummaryTable> {
    const report = await this.ARAgingSummarySheet.ARAgingSummary(query);
    const table = new ARAgingSummaryTable(report.data, query, this.i18nService);

    return {
      table: {
        columns: table.tableColumns(),
        rows: table.tableRows(),
      },
      meta: report.meta,
      query,
    };
  }
}
