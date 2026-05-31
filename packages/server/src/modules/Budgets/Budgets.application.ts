import { Injectable } from '@nestjs/common';
import { CreateBudgetService } from './commands/CreateBudget.service';
import { EditBudgetService } from './commands/EditBudget.service';
import { DeleteBudgetService } from './commands/DeleteBudget.service';
import { UpsertBudgetLinesService } from './commands/UpsertBudgetLines.service';
import { GetBudgetsService } from './queries/GetBudgets.service';
import { GetBudgetService } from './queries/GetBudget.service';
import { GetBudgetPlanFactService } from './queries/GetBudgetPlanFact.service';
import { CreateBudgetDto, EditBudgetDto } from './dtos/Budget.dto';
import { UpsertBudgetLinesDto } from './dtos/UpsertBudgetLines.dto';
import { GetBudgetPlanFactQueryDto } from './dtos/GetBudgetPlanFactQuery.dto';

@Injectable()
export class BudgetsApplication {
  constructor(
    private readonly createService: CreateBudgetService,
    private readonly editService: EditBudgetService,
    private readonly deleteService: DeleteBudgetService,
    private readonly upsertLinesService: UpsertBudgetLinesService,
    private readonly getBudgetsService: GetBudgetsService,
    private readonly getBudgetService: GetBudgetService,
    private readonly planFactService: GetBudgetPlanFactService,
  ) {}

  createBudget(dto: CreateBudgetDto) {
    return this.createService.create(dto);
  }
  editBudget(id: number, dto: EditBudgetDto) {
    return this.editService.edit(id, dto);
  }
  deleteBudget(id: number) {
    return this.deleteService.delete(id);
  }
  upsertLines(id: number, dto: UpsertBudgetLinesDto) {
    return this.upsertLinesService.upsert(id, dto);
  }
  getBudgets() {
    return this.getBudgetsService.getBudgets();
  }
  getBudget(id: number) {
    return this.getBudgetService.getBudget(id);
  }
  getPlanFact(id: number, query: GetBudgetPlanFactQueryDto) {
    return this.planFactService.getPlanFact(id, query);
  }
}
