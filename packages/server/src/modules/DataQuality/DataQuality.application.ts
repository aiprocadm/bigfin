// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { DataQualityQueryDto } from './dtos/DataQualityQuery.dto';
import { GetUnmappedOperationsService } from './queries/GetUnmappedOperations.service';
import { GetPossibleDuplicatesService } from './queries/GetPossibleDuplicates.service';
import { GetPlCashflowComparisonService } from './queries/GetPlCashflowComparison.service';
import { GetUnbalancedJournalsService } from './queries/GetUnbalancedJournals.service';
import { GetFailedMailsService } from './queries/GetFailedMails.service';
import { RepostVatDocumentsService } from './commands/RepostVatDocuments.service';

@Injectable()
export class DataQualityApplication {
  constructor(
    private readonly getUnmappedOperationsService: GetUnmappedOperationsService,
    private readonly getPossibleDuplicatesService: GetPossibleDuplicatesService,
    private readonly getPlCashflowComparisonService: GetPlCashflowComparisonService,
    private readonly getUnbalancedJournalsService: GetUnbalancedJournalsService,
    private readonly getFailedMailsService: GetFailedMailsService,
    private readonly repostVatDocumentsService: RepostVatDocumentsService,
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

  public getUnbalancedJournals(query: DataQualityQueryDto) {
    return this.getUnbalancedJournalsService.getUnbalancedJournals(query);
  }

  public getFailedMails() {
    return this.getFailedMailsService.getFailedMails();
  }

  public repostVatDocuments(query: DataQualityQueryDto) {
    return this.repostVatDocumentsService.repost(query);
  }
}
