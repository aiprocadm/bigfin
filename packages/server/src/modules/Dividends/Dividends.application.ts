// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetDividendsSummaryService } from './queries/GetDividendsSummary.service';
import { GetDividendPayoutsService } from './queries/GetDividendPayouts.service';
import { CreateDividendPayoutService } from './commands/CreateDividendPayout.service';
import { DeleteDividendPayoutService } from './commands/DeleteDividendPayout.service';
import { CreateDividendPayoutDto } from './dtos/DividendPayout.dto';

@Injectable()
export class DividendsApplication {
  constructor(
    private readonly getSummaryService: GetDividendsSummaryService,
    private readonly getPayoutsService: GetDividendPayoutsService,
    private readonly createPayoutService: CreateDividendPayoutService,
    private readonly deletePayoutService: DeleteDividendPayoutService,
  ) {}

  public getSummary() {
    return this.getSummaryService.getSummary();
  }

  public getPayouts() {
    return this.getPayoutsService.getPayouts();
  }

  public createPayout(dto: CreateDividendPayoutDto) {
    return this.createPayoutService.create(dto);
  }

  public deletePayout(id: number) {
    return this.deletePayoutService.delete(id);
  }
}
