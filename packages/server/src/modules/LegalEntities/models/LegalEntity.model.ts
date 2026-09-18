// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/**
 * Юрлицо группы (этап 6 ТЗ).
 *
 * Живёт в ТЕНАНТНОЙ схеме: юрлица принадлежат одной организации, а не общие
 * между ними. Путаница system/tenant — известный источник багов проекта.
 *
 * Реквизиты хранятся строками: у ИНН и ОГРН ведущий ноль значащий, а
 * арифметики над ними не бывает.
 */
export class LegalEntity extends TenantBaseModel {
  name!: string;
  fullName!: string | null;
  /** ООО | ИП | АО | НКО | Самозанятый */
  form!: string;

  inn!: string | null;
  /** У ИП его нет. */
  kpp!: string | null;
  ogrn!: string | null;

  /** ОСНО | УСН_Д | УСН_ДР | АУСН | ЕСХН | ПСН | НПД */
  taxSystem!: string | null;
  vatPayer!: boolean;
  baseCurrency!: string;

  directorName!: string | null;
  legalAddress!: string | null;
  actualAddress!: string | null;
  /** Р/с, банк, БИК, к/с. */
  bankDetails!: Record<string, unknown> | null;

  /** Доля владельца в процентах — нужна консолидации (этап 7). */
  ownershipShare!: number;
  /** Головное юрлицо группы. */
  isPrimary!: boolean;
  active!: boolean;
  sortOrder!: number;

  static get tableName() {
    return 'legal_entities';
  }

  /** Поля, по которым ищет поиск в шапке справочника. */
  static get searchColumns() {
    return ['name', 'fullName', 'inn'];
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonAttributes() {
    return ['bankDetails'];
  }

  static get modifiers() {
    return {
      /**
       * Только действующие юрлица. Выключенное юрлицо остаётся в базе:
       * на него ссылаются прошлые операции, и удалять его нельзя.
       */
      active(query) {
        query.where('active', true);
      },
    };
  }
}
