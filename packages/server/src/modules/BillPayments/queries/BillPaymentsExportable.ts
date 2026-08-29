import { Injectable } from '@nestjs/common';
import { BillPaymentsApplication } from '../BillPaymentsApplication.service';
import { Exportable } from '@/modules/Export/Exportable';
import { exportRowsLimit } from '@/modules/Export/exportRowsLimit';
import { ExportableService } from '@/modules/Export/decorators/ExportableModel.decorator';
import { BillPayment } from '../models/BillPayment';

@Injectable()
@ExportableService({ name: BillPayment.name })
export class BillPaymentsExportable extends Exportable {
  constructor(
    private readonly billPaymentsApplication: BillPaymentsApplication,
  ) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   */
  public async exportable(query: any) {
    const filterQuery = (builder) => {
      builder.withGraphFetched('entries.bill');
      builder.withGraphFetched('branch');
    };
    const parsedQuery = {
      sortOrder: 'desc',
      columnSortBy: 'created_at',
      ...query,
      page: 1,
      pageSize: exportRowsLimit() + 1,
      filterQuery,
    } as any;

    return this.billPaymentsApplication
      .getBillPayments(parsedQuery)
      .then((output) => output.billPayments);
  }
}
