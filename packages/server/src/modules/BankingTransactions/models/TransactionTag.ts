// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/**
 * Метка операции (FT-025 ТЗ-3): одна на документ. Живёт отдельно от
 * проводок, потому что проводки документа стираются и пишутся заново.
 */
export class TransactionTag extends BaseModel {
  public id!: number;
  public referenceType!: string;
  public referenceId!: number;
  public tag!: string;

  static get tableName() {
    return 'transaction_tags';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
