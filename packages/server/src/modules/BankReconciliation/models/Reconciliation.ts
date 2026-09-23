// © 2026 Bigfin
import { Model } from 'objection';
import { BaseModel } from '@/models/Model';

/** Сверка счёта с банком за период (FT-040, FT-041 ТЗ-3). */
export class Reconciliation extends BaseModel {
  public id!: number;
  public accountId!: number;
  public fromDate!: string;
  public toDate!: string;
  public status!: 'running' | 'done' | 'failed';
  public source!: 'integration' | 'file';
  public bankBalance!: number | null;
  public ourBalance!: number | null;
  public diff!: number | null;
  public missingHere!: number;
  public missingBank!: number;
  public error!: string | null;
  public startedAt!: string;
  public finishedAt!: string | null;
  public createdBy!: number | null;

  static get tableName() {
    return 'reconciliations';
  }

  get timestamps() {
    return [];
  }

  static get relationMappings() {
    const { ReconciliationItem } = require('./ReconciliationItem');
    return {
      items: {
        relation: Model.HasManyRelation,
        modelClass: ReconciliationItem,
        join: { from: 'reconciliations.id', to: 'reconciliation_items.reconciliationId' },
      },
    };
  }
}
