// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as moment from 'moment';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Account } from '@/modules/Accounts/models/Account.model';
import { LedgerStorageService } from '@/modules/Ledger/LedgerStorage.service';
import { Ledger } from '@/modules/Ledger/Ledger';
import { TransactionsLockingGuard } from '@/modules/TransactionsLocking/guards/TransactionsLockingGuard';
import { TransactionsLockingGroup } from '@/modules/TransactionsLocking/types/TransactionsLocking.types';
import { FixedAsset } from '../models/FixedAsset.model';
import { FixedAssetDepreciationEntry } from '../models/FixedAssetDepreciationEntry.model';
import { getDepreciationGLEntries } from '../utils/fixedAssetGLEntries';
import {
  DEPRECIATION_EXPENSE_ACCOUNT,
  ACCUMULATED_DEPRECIATION_ACCOUNT,
} from '../constants';

interface SelectableEntry {
  id: number;
  period: string;
  status: string;
}

export const entriesToAccrue = <T extends SelectableEntry>(
  entries: T[],
  targetPeriod: string,
): T[] =>
  entries.filter((e) => e.status === 'planned' && e.period <= targetPeriod);

@Injectable()
export class AccrueMonthDepreciationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly ledgerStorage: LedgerStorageService,
    private readonly tenancyContext: TenancyContext,
    private readonly lockingGuard: TransactionsLockingGuard,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(FixedAssetDepreciationEntry.name)
    private readonly entryModel: TenantModelProxy<
      typeof FixedAssetDepreciationEntry
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async accrue(targetPeriod: string) {
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const expenseAccount = await this.findOrCreate(
        DEPRECIATION_EXPENSE_ACCOUNT,
        currencyCode,
        trx,
      );
      const accumulatedAccount = await this.findOrCreate(
        ACCUMULATED_DEPRECIATION_ACCOUNT,
        currencyCode,
        trx,
      );

      const activeAssets: any[] = await this.assetModel()
        .query(trx)
        .where('status', 'active');
      const activeIds = activeAssets.map((a) => a.id);
      if (!activeIds.length) return { posted: 0 };

      const planned: any[] = await this.entryModel()
        .query(trx)
        .whereIn('fixedAssetId', activeIds)
        .andWhere('status', 'planned');

      const toPost = entriesToAccrue(planned as SelectableEntry[], targetPeriod);
      if (!toPost.length) return { posted: 0 };

      let posted = 0;
      for (const entry of toPost as any[]) {
        const date = moment(entry.period, 'YYYY-MM')
          .endOf('month')
          .format('YYYY-MM-DD');

        await this.lockingGuard.transactionsLockingGuard(
          date,
          TransactionsLockingGroup.Financial,
        );

        const ledger = new Ledger(
          getDepreciationGLEntries({
            entryId: entry.id,
            date,
            amount: Number(entry.amount),
            currencyCode,
            expenseAccountId: expenseAccount.id,
            accumulatedAccountId: accumulatedAccount.id,
          }),
        );
        await this.ledgerStorage.commit(ledger, trx);

        await this.entryModel()
          .query(trx)
          .findById(entry.id)
          .patch({ status: 'posted', postedAt: date } as any);

        await this.assetModel()
          .query(trx)
          .findById(entry.fixedAssetId)
          .increment('accumulatedDepreciation', Number(entry.amount));

        posted++;
      }
      return { posted };
    });
  }

  private async findOrCreate(
    template: { slug: string },
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: template.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...template, currencyCode } as any);
    }
    return account;
  }
}
