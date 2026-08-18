import { mixin, Model, raw } from 'objection';
// import TenantModel from 'models/TenantModel';
// import ModelSearchable from './ModelSearchable';
// import SoftDeleteQueryBuilder from '@/collection/SoftDeleteQueryBuilder';
// import TaxRateMeta from './TaxRate.settings';
// import ModelSetting from './ModelSetting';
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';
import { ExportableModel } from '@/modules/Export/decorators/ExportableModel.decorator';
import { InjectModelMeta } from '@/modules/Tenancy/TenancyModels/decorators/InjectModelMeta.decorator';
import { TaxRateMeta } from './TaxRate.meta';

// TenantBaseModel (а не голый BaseModel) — ради getMeta: без него экспорт
// ставок отвечал 500 (С3 карты v14, вскрыто «выгрузить всё»).
@ExportableModel()
@InjectModelMeta(TaxRateMeta)
export class TaxRateModel extends TenantBaseModel {
  active!: boolean;
  code!: string;
  name!: string;
  rate!: number;
  description?: string;

  /**
   * Налог по этой ставке к вычету НЕ принимается: он не уменьшает налог к
   * уплате, а увеличивает стоимость покупки. Колонка в базе была с самого
   * начала, галочка в форме тоже — а учёт признак игнорировал.
   */
  isNonRecoverable?: boolean;

  /**
   * Table name
   */
  static get tableName() {
    return 'tax_rates';
  }

  /**
   * Soft delete query builder.
   */
  // static get QueryBuilder() {
  // return SoftDeleteQueryBuilder;
  // }

  /**
   * Timestamps columns.
   */
  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /**
   * Retrieves the tax rate meta.
   */
  // static get meta() {
  // return TaxRateMeta;
  // }

  /**
   * Virtual attributes.
   */
  static get virtualAttributes() {
    return [];
  }

  /**
   * Model modifiers.
   */
  static get modifiers() {
    return {};
  }

  /**
   * Relationship mapping.
   */
  static get relationMappings() {
    return {};
  }
}
