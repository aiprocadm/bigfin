// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/** Строка расхождения сверки (FT-040 ТЗ-3). */
export class ReconciliationItem extends BaseModel {
  public id!: number;
  public reconciliationId!: number;
  /** missing_here — есть в банке, нет у нас; missing_bank — наоборот. */
  public side!: 'missing_here' | 'missing_bank';
  public externalId!: string | null;
  public date!: string;
  public amount!: number;
  public payee!: string | null;
  public description!: string | null;
  public transactionId!: number | null;
  /** document — документ другого раздела: оплата счёта, расход, проводка. */
  public transactionKind!: 'bank_line' | 'cashflow' | 'document' | null;
  public deletedAt!: string | null;
  public deletedBy!: number | null;
  public resolvedAs!: 'added' | 'deleted' | 'ignored' | null;
  public resolvedAt!: string | null;

  static get tableName() {
    return 'reconciliation_items';
  }

  get timestamps() {
    return [];
  }
}
