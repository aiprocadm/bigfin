// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { GetSegmentProfitabilityService } from './queries/GetSegmentProfitability.service';
import { FinancialOverviewQueryDto } from './dtos/FinancialModel.dto';

@Injectable()
export class FinancialModelApplication {
  constructor(
    private readonly overviewService: GetFinancialOverviewService,
    private readonly segmentsService: GetSegmentProfitabilityService,
  ) {}

  getOverview(query: FinancialOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }

  getSegments(query: FinancialOverviewQueryDto) {
    return this.segmentsService.getSegments(query);
  }
}
