// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CostAllocationRule extends TenantBaseModel {
  name!: string;
  sourceArticleId!: number;
  allocationKey!: string;
  manualShares!: Record<string, number> | null;
  targetDealIds!: number[] | null;
  /** Между кем делится пул (FT-011 ТЗ-3): сделки или направления. */
  targetType!: 'deal' | 'direction';
  /** Цели; пусто или null — все цели своего вида. */
  targetIds!: number[] | null;
  validFrom!: string | null;
  validTo!: string | null;
  isActive!: boolean;

  /**
   * Table name.
   */
  static get tableName() {
    return 'cost_allocation_rules';
  }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * JSON-serialized attributes.
   */
  static get jsonAttributes() {
    return ['manualShares', 'targetDealIds', 'targetIds'];
  }

  /**
   * Query modifiers.
   */
  static get modifiers() {
    return {
      /**
       * Only active rules.
       */
      active(query) {
        query.where('isActive', true);
      },
    };
  }
}
