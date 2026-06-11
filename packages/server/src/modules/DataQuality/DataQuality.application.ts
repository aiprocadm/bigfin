// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { DataQualityQueryDto } from './dtos/DataQualityQuery.dto';
import { GetUnmappedOperationsService } from './queries/GetUnmappedOperations.service';
import { GetPossibleDuplicatesService } from './queries/GetPossibleDuplicates.service';
import { GetPlCashflowComparisonService } from './queries/GetPlCashflowComparison.service';

@Injectable()
export class DataQualityApplication {
  constructor(
    private readonly getUnmappedOperationsService: GetUnmappedOperationsService,
    private readonly getPossibleDuplicatesService: GetPossibleDuplicatesService,
    private readonly getPlCashflowComparisonService: GetPlCashflowComparisonService,
  ) {}

  public getUnmappedOperations(query: DataQualityQueryDto) {
    return this.getUnmappedOperationsService.getUnmappedOperations(query);
  }

  public getPossibleDuplicates(query: DataQualityQueryDto) {
    return this.getPossibleDuplicatesService.getPossibleDuplicates(query);
  }

  public getPlCashflowComparison(query: DataQualityQueryDto) {
    return this.getPlCashflowComparisonService.getComparison(query);
  }
}
