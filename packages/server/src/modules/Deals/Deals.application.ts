// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDealsService } from './queries/GetDeals.service';
import { GetDealService } from './queries/GetDeal.service';
import { GetDealsSummaryService } from './queries/GetDealsSummary.service';
import { GetDealProfitabilityService } from './queries/GetDealProfitability.service';
import { CreateDealService } from './commands/CreateDeal.service';
import { EditDealService } from './commands/EditDeal.service';
import { DeleteDealService } from './commands/DeleteDeal.service';
import { CreateDealDto, EditDealDto } from './dtos/Deal.dto';
import { GetDealsQueryDto } from './dtos/GetDealsQuery.dto';

@Injectable()
export class DealsApplication {
  constructor(
    private readonly listService: GetDealsService,
    private readonly getService: GetDealService,
    private readonly summaryService: GetDealsSummaryService,
    private readonly profitabilityService: GetDealProfitabilityService,
    private readonly createService: CreateDealService,
    private readonly editService: EditDealService,
    private readonly deleteService: DeleteDealService,
  ) {}

  getDeals(query: GetDealsQueryDto) {
    return this.listService.getDeals(query);
  }
  getDeal(id: number) {
    return this.getService.getDeal(id);
  }
  getSummary(query: { fromDate?: string; toDate?: string }) {
    return this.summaryService.getSummary(query);
  }
  getProfitability(id: number, query: { fromDate?: string; toDate?: string }) {
    return this.profitabilityService.getProfitability(id, query);
  }
  createDeal(dto: CreateDealDto) {
    return this.createService.create(dto);
  }
  editDeal(id: number, dto: EditDealDto) {
    return this.editService.edit(id, dto);
  }
  deleteDeal(id: number) {
    return this.deleteService.delete(id);
  }
}
