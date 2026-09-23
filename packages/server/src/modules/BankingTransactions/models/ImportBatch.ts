// © 2026 Bigfin
import { BaseModel } from '@/models/Model';

/** Пакет импорта выписки (FT-043 ТЗ-3): один импорт — один пакет. */
export class ImportBatch extends BaseModel {
  public id!: number;
  /** file — выписка файлом, bank — банк по API, api — прочие сервисы. */
  public source!: string;
  public accountId!: number;
  public fileName!: string | null;
  public rowsCount!: number;
  public createdBy!: number | null;
  public createdAt!: string;
  public rolledBackAt!: string | null;

  static get tableName() {
    return 'import_batches';
  }

  get timestamps() {
    return [];
  }
}
