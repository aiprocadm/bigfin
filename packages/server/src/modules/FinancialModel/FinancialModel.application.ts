// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { FinancialOverviewQueryDto } from './dtos/FinancialModel.dto';

@Injectable()
export class FinancialModelApplication {
  constructor(
    private readonly overviewService: GetFinancialOverviewService,
  ) {}

  getOverview(query: FinancialOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }
}
