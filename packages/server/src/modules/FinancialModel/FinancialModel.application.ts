// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { GetSegmentProfitabilityService } from './queries/GetSegmentProfitability.service';
import { GetMarketingMetricsService } from './queries/GetMarketingMetrics.service';
import { GetBreakEvenService } from './queries/GetBreakEven.service';
import { MarketingDataService } from './commands/MarketingData.service';
import { CostBehaviorService } from './commands/CostBehavior.service';
import {
  FinancialOverviewQueryDto,
  CreateMarketingChannelDto,
  UpdateMarketingChannelDto,
  UpsertMarketingMonthlyDto,
} from './dtos/FinancialModel.dto';

@Injectable()
export class FinancialModelApplication {
  constructor(
    private readonly overviewService: GetFinancialOverviewService,
    private readonly segmentsService: GetSegmentProfitabilityService,
    private readonly marketingMetrics: GetMarketingMetricsService,
    private readonly breakEven: GetBreakEvenService,
    private readonly marketingData: MarketingDataService,
    private readonly costBehavior: CostBehaviorService,
  ) {}

  getOverview(query: FinancialOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }

  getSegments(query: FinancialOverviewQueryDto) {
    return this.segmentsService.getSegments(query);
  }

  getMarketingMetrics(query: FinancialOverviewQueryDto) {
    return this.marketingMetrics.getMetrics(query);
  }

  getBreakEven(query: FinancialOverviewQueryDto) {
    return this.breakEven.getBreakEven(query);
  }

  listExpenseArticles() {
    return this.costBehavior.listExpenseArticles();
  }

  setCostBehavior(id: number, behavior: 'fixed' | 'variable' | null) {
    return this.costBehavior.setCostBehavior(id, behavior ?? null);
  }

  listChannels() {
    return this.marketingData.listChannels();
  }

  createChannel(dto: CreateMarketingChannelDto) {
    return this.marketingData.createChannel(dto);
  }

  updateChannel(id: number, dto: UpdateMarketingChannelDto) {
    return this.marketingData.updateChannel(id, dto);
  }

  deleteChannel(id: number) {
    return this.marketingData.deleteChannel(id);
  }

  upsertMonthly(dto: UpsertMarketingMonthlyDto) {
    return this.marketingData.upsertMonthly(dto);
  }

  setCustomerLifetime(months: number) {
    return this.marketingData.setCustomerLifetime(months);
  }
}
