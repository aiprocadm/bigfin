// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { CreateCreditService } from './commands/CreateCredit.service';
import { EditCreditService } from './commands/EditCredit.service';
import { DeleteCreditService } from './commands/DeleteCredit.service';
import { MarkInstallmentPaidService } from './commands/MarkInstallmentPaid.service';
import { GetCreditsService } from './queries/GetCredits.service';
import { GetCreditDetailService } from './queries/GetCreditDetail.service';
import { GetCreditsSummaryService } from './queries/GetCreditsSummary.service';
import { CreateCreditDto, EditCreditDto } from './dtos/Credit.dto';

@Injectable()
export class CreditsApplication {
  constructor(
    private readonly createService: CreateCreditService,
    private readonly editService: EditCreditService,
    private readonly deleteService: DeleteCreditService,
    private readonly markPaidService: MarkInstallmentPaidService,
    private readonly getCreditsService: GetCreditsService,
    private readonly getCreditDetailService: GetCreditDetailService,
    private readonly getSummaryService: GetCreditsSummaryService,
  ) {}

  createCredit(dto: CreateCreditDto) { return this.createService.create(dto); }
  editCredit(id: number, dto: EditCreditDto) { return this.editService.edit(id, dto); }
  deleteCredit(id: number) { return this.deleteService.delete(id); }
  markInstallmentPaid(creditId: number, installmentId: number) {
    return this.markPaidService.markPaid(creditId, installmentId);
  }
  getCredits() { return this.getCreditsService.getCredits(); }
  getCredit(id: number) { return this.getCreditDetailService.getCredit(id); }
  getSummary() { return this.getSummaryService.getSummary(); }
}
