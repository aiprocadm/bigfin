// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { TransactionsLockingModule } from '@/modules/TransactionsLocking/TransactionsLocking.module';
import { FixedAssetsController } from './FixedAssets.controller';
import { FixedAssetsApplication } from './FixedAssets.application';
import { CreateFixedAssetService } from './commands/CreateFixedAsset.service';
import { AccrueMonthDepreciationService } from './commands/AccrueMonthDepreciation.service';
import { DisposeFixedAssetService } from './commands/DisposeFixedAsset.service';
import { DeleteFixedAssetService } from './commands/DeleteFixedAsset.service';
import { GetFixedAssetsService } from './queries/GetFixedAssets.service';
import { GetFixedAssetDetailService } from './queries/GetFixedAssetDetail.service';
import { GetFixedAssetsSummaryService } from './queries/GetFixedAssetsSummary.service';

@Module({
  imports: [
    TenancyDatabaseModule,
    TenancyModule,
    LedgerModule,
    TransactionsLockingModule,
  ],
  controllers: [FixedAssetsController],
  providers: [
    FixedAssetsApplication,
    CreateFixedAssetService,
    AccrueMonthDepreciationService,
    DisposeFixedAssetService,
    DeleteFixedAssetService,
    GetFixedAssetsService,
    GetFixedAssetDetailService,
    GetFixedAssetsSummaryService,
  ],
})
export class FixedAssetsModule {}
