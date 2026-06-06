// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';

@Injectable()
export class DebtsApplication {
  constructor(private readonly overviewService: GetDebtsOverviewService) {}

  public getOverview(query: GetDebtsOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }
}
