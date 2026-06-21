// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetFinancialOverviewService } from './queries/GetFinancialOverview.service';
import { GetSegmentProfitabilityService } from './queries/GetSegmentProfitability.service';
import { GetMarketingMetricsService } from './queries/GetMarketingMetrics.service';
import { MarketingDataService } from './commands/MarketingData.service';
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
    private readonly marketingData: MarketingDataService,
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
