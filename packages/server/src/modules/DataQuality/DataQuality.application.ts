import { GetAccrualShiftsService } from './queries/GetAccrualShifts.service';
// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { DataQualityQueryDto } from './dtos/DataQualityQuery.dto';
import { GetUnmappedOperationsService } from './queries/GetUnmappedOperations.service';
import { GetPossibleDuplicatesService } from './queries/GetPossibleDuplicates.service';
import { GetPlCashflowComparisonService } from './queries/GetPlCashflowComparison.service';
import { GetUnbalancedJournalsService } from './queries/GetUnbalancedJournals.service';
import { GetFailedMailsService } from './queries/GetFailedMails.service';
import { GetDriftedBalancesService } from './queries/GetDriftedBalances.service';
import { RepostVatDocumentsService } from './commands/RepostVatDocuments.service';
import { GetCrookedCurrencyJournalsService } from './queries/GetCrookedCurrencyJournals.service';
import { RepostCrookedCurrencyJournalsService } from './commands/RepostCrookedCurrencyJournals.service';

@Injectable()
export class DataQualityApplication {
  constructor(
    private readonly getAccrualShiftsService: GetAccrualShiftsService,
    private readonly getUnmappedOperationsService: GetUnmappedOperationsService,
    private readonly getPossibleDuplicatesService: GetPossibleDuplicatesService,
    private readonly getPlCashflowComparisonService: GetPlCashflowComparisonService,
    private readonly getUnbalancedJournalsService: GetUnbalancedJournalsService,
    private readonly getFailedMailsService: GetFailedMailsService,
    private readonly getDriftedBalancesService: GetDriftedBalancesService,
    private readonly repostVatDocumentsService: RepostVatDocumentsService,
    private readonly getCrookedCurrencyJournalsService: GetCrookedCurrencyJournalsService,
    private readonly repostCrookedCurrencyJournalsService: RepostCrookedCurrencyJournalsService,
  ) {}

  public getUnmappedOperations(query: DataQualityQueryDto) {
    return this.getUnmappedOperationsService.getUnmappedOperations(query);
  }

  public getPossibleDuplicates(query: DataQualityQueryDto) {
    return this.getPossibleDuplicatesService.getPossibleDuplicates(query);
  }

  public getPlCashflowComparison(query: DataQualityQueryDto) {
    return this.getPlCashflowComparisonService.getComparison(query);
  }

  /** Месяц начисления вне периода (FT-013 ТЗ-3). */
  public getAccrualShifts(query: DataQualityQueryDto) {
    return this.getAccrualShiftsService.getAccrualShifts(query);
  }

  public getUnbalancedJournals(query: DataQualityQueryDto) {
    return this.getUnbalancedJournalsService.getUnbalancedJournals(query);
  }

  /**
   * Остаток счёта разошёлся с проводками: шапка показывает одну сумму,
   * отчёт — другую, и ни один экран не объясняет, какая настоящая.
   */
  public getDriftedBalances() {
    return this.getDriftedBalancesService.getDriftedBalances();
  }

  public getFailedMails() {
    return this.getFailedMailsService.getFailedMails();
  }

  public repostVatDocuments(query: DataQualityQueryDto) {
    return this.repostVatDocumentsService.repost(query);
  }

  public getCrookedCurrencyJournals(query: DataQualityQueryDto) {
    return this.getCrookedCurrencyJournalsService.getCrookedCurrencyJournals(
      query,
    );
  }

  public repostCrookedCurrencyJournals(query: DataQualityQueryDto) {
    return this.repostCrookedCurrencyJournalsService.repost(query);
  }
}
