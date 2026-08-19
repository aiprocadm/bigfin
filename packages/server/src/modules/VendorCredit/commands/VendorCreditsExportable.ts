import { Injectable } from '@nestjs/common';
import { VendorCreditsApplicationService } from '../VendorCreditsApplication.service';
import { Exportable } from '@/modules/Export/Exportable';
import { IVendorCreditsQueryDTO } from '../types/VendorCredit.types';
import { ExportableService } from '@/modules/Export/decorators/ExportableModel.decorator';
import { VendorCredit } from '../models/VendorCredit';
import { EXPORT_ROWS_LIMIT } from '@/modules/Export/exportRowsLimit';

@Injectable()
@ExportableService({ name: VendorCredit.name })
export class VendorCreditsExportable extends Exportable {
  constructor(
    private readonly vendorCreditsApp: VendorCreditsApplicationService,
  ) {
    super();
  }

  /**
   * Retrieves the vendor credits data to exportable sheet.
   */
  public exportable(query: IVendorCreditsQueryDTO) {
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
    } as IVendorCreditsQueryDTO;

    return this.vendorCreditsApp
      .getVendorCredits(parsedQuery)
      .then((output) => output.vendorCredits);
  }
}
