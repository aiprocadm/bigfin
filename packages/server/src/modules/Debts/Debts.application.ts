// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetContactDebtsService } from './queries/GetContactDebts.service';
import { GetRepaymentPlansService } from './queries/GetRepaymentPlans.service';
import { SendDebtReminderService } from './commands/SendDebtReminder.service';
import { CreateRepaymentPlanService } from './commands/CreateRepaymentPlan.service';
import { EditRepaymentPlanService } from './commands/EditRepaymentPlan.service';
import { DeleteRepaymentPlanService } from './commands/DeleteRepaymentPlan.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';
import { GetContactDebtsQueryDto } from './dtos/GetContactDebtsQuery.dto';
import {
  CreateRepaymentPlanDto,
  EditRepaymentPlanDto,
} from './dtos/RepaymentPlan.dto';

@Injectable()
export class DebtsApplication {
  constructor(
    private readonly overviewService: GetDebtsOverviewService,
    private readonly contactService: GetContactDebtsService,
    private readonly reminderService: SendDebtReminderService,
    private readonly getPlansService: GetRepaymentPlansService,
    private readonly createPlanService: CreateRepaymentPlanService,
    private readonly editPlanService: EditRepaymentPlanService,
    private readonly deletePlanService: DeleteRepaymentPlanService,
    private readonly markPaidService: MarkInstallmentPaidService,
  ) {}

  public getOverview(query: GetDebtsOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }

  public getContactDebts(contactId: number, query: GetContactDebtsQueryDto) {
    return this.contactService.getContactDebts(contactId, query.side);
  }

  public remindDebtor(invoiceId: number) {
    return this.reminderService.remind(invoiceId);
  }

  public getRepaymentPlans(filter: { side?: string; contactId?: number }) {
    return this.getPlansService.getPlans(filter);
  }

  public createRepaymentPlan(dto: CreateRepaymentPlanDto) {
    return this.createPlanService.create(dto);
  }

  public editRepaymentPlan(id: number, dto: EditRepaymentPlanDto) {
    return this.editPlanService.edit(id, dto);
  }

  public deleteRepaymentPlan(id: number) {
    return this.deletePlanService.delete(id);
  }

  public markInstallmentPaid(planId: number, installmentId: number) {
    return this.markPaidService.markPaid(planId, installmentId);
  }
}
