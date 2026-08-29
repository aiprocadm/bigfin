import { AccountsApplication } from './AccountsApplication.service';
import { Exportable } from '../Export/Exportable';
import { exportRowsLimit } from '../Export/exportRowsLimit';
import { IAccountsFilter, IAccountsStructureType } from './Accounts.types';
import { Global, Injectable } from '@nestjs/common';
import { ExportableService } from '../Export/decorators/ExportableModel.decorator';
import { Account } from './models/Account.model';

@Injectable()
@ExportableService({ name: Account.name })
@Global()
export class AccountsExportable extends Exportable {
  /**
   * @param {AccountsApplication} accountsApplication  
   */
  constructor(private readonly accountsApplication: AccountsApplication) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   */
  public exportable(query: IAccountsFilter) {
    const parsedQuery = {
      sortOrder: 'desc',
      columnSortBy: 'created_at',
      inactiveMode: false,
      ...query,
      structure: IAccountsStructureType.Flat,
      pageSize: exportRowsLimit() + 1,
      page: 1,
    } as IAccountsFilter;

    return this.accountsApplication
      .getAccounts(parsedQuery)
      .then((output) => output.accounts);
  }
}
