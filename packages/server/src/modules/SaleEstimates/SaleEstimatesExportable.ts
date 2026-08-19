import { Injectable } from '@nestjs/common';
import { EXPORT_ROWS_LIMIT } from '../Export/exportRowsLimit';
import { Exportable } from '../Export/Exportable';
import { ISalesInvoicesFilter } from '../SaleInvoices/SaleInvoice.types';
import { SaleEstimatesApplication } from './SaleEstimates.application';
import { ISalesEstimatesFilter } from './types/SaleEstimates.types';
import { ExportableService } from '../Export/decorators/ExportableModel.decorator';
import { SaleEstimate } from './models/SaleEstimate';

@Injectable()
@ExportableService({ name: SaleEstimate.name })
export class SaleEstimatesExportable extends Exportable {
  constructor(
    private readonly saleEstimatesApplication: SaleEstimatesApplication,
  ) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   * @param {ISalesEstimatesFilter} query -
   */
  public exportable(query: ISalesEstimatesFilter) {
    const filterQuery = (query) => {
      query.withGraphFetched('branch');
      query.withGraphFetched('warehouse');
    };
    const parsedQuery = {
      sortOrder: 'desc',
      columnSortBy: 'created_at',
      ...query,
      page: 1,
      pageSize: EXPORT_ROWS_LIMIT + 1,
      filterQuery,
    } as ISalesInvoicesFilter;

    return this.saleEstimatesApplication
      .getSaleEstimates(parsedQuery)
      .then((output) => output.salesEstimates);
  }
}
