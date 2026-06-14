// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { CreateFixedAssetService } from './commands/CreateFixedAsset.service';
import { AccrueMonthDepreciationService } from './commands/AccrueMonthDepreciation.service';
import { DisposeFixedAssetService } from './commands/DisposeFixedAsset.service';
import { DeleteFixedAssetService } from './commands/DeleteFixedAsset.service';
import { GetFixedAssetsService } from './queries/GetFixedAssets.service';
import { GetFixedAssetDetailService } from './queries/GetFixedAssetDetail.service';
import { GetFixedAssetsSummaryService } from './queries/GetFixedAssetsSummary.service';
import { CreateFixedAssetDto, DisposeFixedAssetDto } from './dtos/FixedAsset.dto';

@Injectable()
export class FixedAssetsApplication {
  constructor(
    private readonly createService: CreateFixedAssetService,
    private readonly accrueService: AccrueMonthDepreciationService,
    private readonly disposeService: DisposeFixedAssetService,
    private readonly deleteService: DeleteFixedAssetService,
    private readonly getAssetsService: GetFixedAssetsService,
    private readonly getDetailService: GetFixedAssetDetailService,
    private readonly getSummaryService: GetFixedAssetsSummaryService,
  ) {}

  getFixedAssets() {
    return this.getAssetsService.getFixedAssets();
  }
  getDetail(id: number) {
    return this.getDetailService.getDetail(id);
  }
  getSummary() {
    return this.getSummaryService.getSummary();
  }
  createFixedAsset(dto: CreateFixedAssetDto) {
    return this.createService.create(dto);
  }
  accrueMonth(period: string) {
    return this.accrueService.accrue(period);
  }
  disposeFixedAsset(id: number, dto: DisposeFixedAssetDto) {
    return this.disposeService.dispose(id, dto);
  }
  deleteFixedAsset(id: number) {
    return this.deleteService.delete(id);
  }
}
