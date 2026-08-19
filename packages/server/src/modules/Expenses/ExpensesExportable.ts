import { Exportable } from '../Export/Exportable';
import { ExpensesApplication } from './ExpensesApplication.service';
import { EXPORT_ROWS_LIMIT } from '../Export/exportRowsLimit';
import { Injectable } from '@nestjs/common';
import { ExportableService } from '../Export/decorators/ExportableModel.decorator';
import { Expense } from './models/Expense.model';
import { GetExpensesQueryDto } from './dtos/GetExpensesQuery.dto';
import { ISortOrder } from '@/modules/DynamicListing/DynamicFilter/DynamicFilter.types';

@Injectable()
@ExportableService({ name: Expense.name })
export class ExpensesExportable extends Exportable {
  constructor(
    private readonly expensesApplication: ExpensesApplication,
  ) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   * @param {GetExpensesQueryDto} query
   */
  public exportable(query: GetExpensesQueryDto) {
    const filterQuery = (query) => {
      query.withGraphFetched('branch');
    };
    const parsedQuery = {
      sortOrder: 'desc' as ISortOrder,
      columnSortBy: 'created_at',
      ...query,
      page: 1,
      pageSize: EXPORT_ROWS_LIMIT + 1,
      filterQuery,
    } as GetExpensesQueryDto;

    return this.expensesApplication
      .getExpenses(parsedQuery)
      .then((output) => output.expenses);
  }
}
