// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDebtsOverviewService } from './queries/GetDebtsOverview.service';
import { GetContactDebtsService } from './queries/GetContactDebts.service';
import { SendDebtReminderService } from './commands/SendDebtReminder.service';
import { GetDebtsOverviewQueryDto } from './dtos/GetDebtsOverviewQuery.dto';
import { GetContactDebtsQueryDto } from './dtos/GetContactDebtsQuery.dto';

@Injectable()
export class DebtsApplication {
  constructor(
    private readonly overviewService: GetDebtsOverviewService,
    private readonly contactService: GetContactDebtsService,
    private readonly reminderService: SendDebtReminderService,
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
}
