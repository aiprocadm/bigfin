// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDealStagesService } from './queries/GetDealStages.service';
import { CreateDealStageService } from './commands/CreateDealStage.service';
import { EditDealStageService } from './commands/EditDealStage.service';
import { DeleteDealStageService } from './commands/DeleteDealStage.service';
import { CreateDealStageDto, EditDealStageDto } from './dtos/DealStage.dto';

@Injectable()
export class DealStagesApplication {
  constructor(
    private readonly getStages: GetDealStagesService,
    private readonly createStage: CreateDealStageService,
    private readonly editStage: EditDealStageService,
    private readonly deleteStage: DeleteDealStageService,
  ) {}

  list(dealId: number, query: { fromDate?: string; toDate?: string }) {
    return this.getStages.getForDeal(dealId, query);
  }
  create(dealId: number, dto: CreateDealStageDto) {
    return this.createStage.create(dealId, dto);
  }
  edit(dealId: number, stageId: number, dto: EditDealStageDto) {
    return this.editStage.edit(dealId, stageId, dto);
  }
  remove(dealId: number, stageId: number) {
    return this.deleteStage.delete(dealId, stageId);
  }
}
