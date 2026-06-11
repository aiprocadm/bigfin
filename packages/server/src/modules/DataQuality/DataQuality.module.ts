// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { DataQualityController } from './DataQuality.controller';
import { DataQualityApplication } from './DataQuality.application';
import { GetUnmappedOperationsService } from './queries/GetUnmappedOperations.service';
import { GetPossibleDuplicatesService } from './queries/GetPossibleDuplicates.service';
import { GetPlCashflowComparisonService } from './queries/GetPlCashflowComparison.service';

@Module({
  imports: [TenancyDatabaseModule, TenancyModule],
  controllers: [DataQualityController],
  providers: [
    DataQualityApplication,
    GetUnmappedOperationsService,
    GetPossibleDuplicatesService,
    GetPlCashflowComparisonService,
  ],
})
export class DataQualityModule {}
