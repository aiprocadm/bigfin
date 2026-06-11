// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import {
  DuplicateGroup,
  groupPossibleDuplicates,
} from '../utils/groupPossibleDuplicates';

export interface PossibleDuplicatesResult {
  groups: (DuplicateGroup & { accountName: string })[];
  totalGroups: number;
}

/**
 * «Возможные дубли»: группировка проводок за период по ключу
 * (date, accountId, amount, side); подозрительны группы с ≥2 проводками из
 * разных источников (referenceType, referenceId) — задвоенный документ, а не
 * две ноги одной проводки. Детекция — чистая функция groupPossibleDuplicates.
 */
@Injectable()
export class GetPossibleDuplicatesService {
  constructor(
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getPossibleDuplicates(
    query: DataQualityQueryDto,
  ): Promise<PossibleDuplicatesResult> {
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.select([
          'id',
          'accountId',
          'date',
          'credit',
          'debit',
          'referenceType',
          'referenceId',
          'transactionNumber',
          'referenceNumber',
        ]);
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
      });

    const { groups, totalGroups } = groupPossibleDuplicates(rows as any[]);

    // Имена счетов — только для попавших в выдачу групп.
    const accountIds = [...new Set(groups.map((g) => g.accountId))];
    const accounts = accountIds.length
      ? await this.accountModel().query().whereIn('id', accountIds)
      : [];
    const nameById = new Map<number, string>();
    accounts.forEach((a: any) => nameById.set(a.id, a.name));

    return {
      groups: groups.map((group) => ({
        ...group,
        accountName: nameById.get(group.accountId) || '',
      })),
      totalGroups,
    };
  }
}
