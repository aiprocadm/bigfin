// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { ServiceError } from '@/modules/Items/ServiceError';

import { LegalEntity } from './models/LegalEntity.model';
import { EnsureDefaultLegalEntityService } from './commands/EnsureDefaultLegalEntity.service';
import { CreateLegalEntityDto, EditLegalEntityDto } from './dtos/LegalEntity.dto';
import { LEGAL_ENTITY_TABLES } from './constants';
import { hasTableAnyCase } from '@/common/utils/schemaAnyCase';

export const LEGAL_ENTITY_ERRORS = {
  /** На юрлице висят операции — удаление осиротило бы разрез. */
  LEGAL_ENTITY_IN_USE: 'LEGAL_ENTITY_IN_USE',
  /** Последнее юрлицо удалить нельзя: разрез должен на что-то опираться. */
  LAST_LEGAL_ENTITY: 'LAST_LEGAL_ENTITY',
};

/**
 * Строка справочника юрлиц.
 *
 * ЗДЕСЬ ЛЕЖИТ ВСЁ, ЧТО ФОРМА УМЕЕТ ИЗМЕНИТЬ, а не только то, что видно в
 * таблице. Причина не в удобстве, а в потере данных: форма правки шлёт на
 * сервер ВСЕ свои поля. Поле, которого в этом списке нет, форме нечем
 * заполнить — она отправляет пустое, и сервер честно затирает КПП, ОГРН,
 * директора и адрес. Ничего при этом не падает: человек открыл юрлицо,
 * поправил название, сохранил — и половина реквизитов исчезла.
 *
 * За полнотой следит `listReturnsEditableFields.spec.ts`.
 */
export interface LegalEntityRow {
  id: number;
  name: string;
  fullName: string | null;
  form: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  taxSystem: string | null;
  vatPayer: boolean;
  baseCurrency: string | null;
  directorName: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  bankDetails: Record<string, unknown> | null;
  ownershipShare: number;
  isPrimary: boolean;
  active: boolean;
  sortOrder: number;
  /** Сколько счетов закреплено — колонка таблицы из §6.4. */
  accountsCount: number;
}

/**
 * Справочник юрлиц (этап 6 ТЗ, §6.4).
 *
 * Список никогда не бывает пустым: при первом обращении создаётся юрлицо по
 * умолчанию из реквизитов организации. Пустой справочник заставил бы человека
 * заводить юрлицо руками, чтобы увидеть то, что у него и так одно.
 */
/**
 * Банковские реквизиты из базы.
 *
 * В MySQL они лежат в колонке JSON, и драйвер отдаёт их то объектом, то
 * строкой — зависит от версии и от того, как строка туда попала. Форма,
 * получившая строку вместо объекта, покажет пустые поля банка и затрёт их
 * при сохранении.
 */
function parseBankDetails(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // Испорченное значение не должно ронять весь справочник.
      return null;
    }
  }
  return null;
}

@Injectable()
export class LegalEntitiesApplication {
  constructor(
    @Inject(LegalEntity.name)
    private readonly legalEntityModel: TenantModelProxy<typeof LegalEntity>,

    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,

    private readonly ensureDefault: EnsureDefaultLegalEntityService,
  ) {}

  /** Список юрлиц со счётчиком закреплённых счетов. */
  public async getLegalEntities(): Promise<LegalEntityRow[]> {
    await this.ensureDefault.ensure();

    const entities: any[] = await this.legalEntityModel()
      .query()
      .orderBy('sortOrder', 'asc')
      .orderBy('id', 'asc');

    const accountsCount = await this.countAccountsByEntity();

    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      fullName: entity.fullName ?? null,
      form: entity.form,
      inn: entity.inn ?? null,
      kpp: entity.kpp ?? null,
      ogrn: entity.ogrn ?? null,
      taxSystem: entity.taxSystem ?? null,
      vatPayer: Boolean(entity.vatPayer),
      baseCurrency: entity.baseCurrency ?? null,
      directorName: entity.directorName ?? null,
      legalAddress: entity.legalAddress ?? null,
      actualAddress: entity.actualAddress ?? null,
      bankDetails: parseBankDetails(entity.bankDetails),
      ownershipShare: Number(entity.ownershipShare ?? 0),
      isPrimary: Boolean(entity.isPrimary),
      active: Boolean(entity.active),
      sortOrder: Number(entity.sortOrder ?? 0),
      accountsCount: accountsCount.get(entity.id) ?? 0,
    }));
  }

  public async createLegalEntity(dto: CreateLegalEntityDto) {
    const created: any = await this.legalEntityModel()
      .query()
      .insertAndFetch(dto as any);

    await this.keepSinglePrimary(created.id, dto.isPrimary);

    return created;
  }

  public async editLegalEntity(id: number, dto: EditLegalEntityDto) {
    const updated: any = await this.legalEntityModel()
      .query()
      .patchAndFetchById(id, dto as any);

    if (!updated) throw new NotFoundException('Юрлицо не найдено');

    await this.keepSinglePrimary(id, dto.isPrimary);

    return updated;
  }

  /**
   * Удаление юрлица.
   *
   * Два запрета, и оба — про целостность разреза, а не про формальности:
   * юрлицо с операциями оставило бы их без владельца, а удаление последнего
   * лишило бы разрез опоры.
   */
  public async deleteLegalEntity(id: number) {
    const entity = await this.legalEntityModel().query().findById(id);
    if (!entity) throw new NotFoundException('Юрлицо не найдено');

    const total = await this.legalEntityModel().query().resultSize();
    if (total <= 1) {
      throw new ServiceError(LEGAL_ENTITY_ERRORS.LAST_LEGAL_ENTITY);
    }

    if (await this.isUsed(id)) {
      throw new ServiceError(LEGAL_ENTITY_ERRORS.LEGAL_ENTITY_IN_USE);
    }

    await this.legalEntityModel().query().deleteById(id);

    return { id };
  }

  /**
   * Головное юрлицо в группе одно.
   *
   * Признак снимается со всех прочих ТОЛЬКО когда его явно поставили этому.
   * Иначе правка названия у обычного юрлица снимала бы головное у другого —
   * тихо и без единой ошибки.
   */
  private async keepSinglePrimary(id: number, isPrimary?: boolean) {
    if (isPrimary !== true) return;

    await this.legalEntityModel()
      .query()
      .whereNot('id', id)
      .patch({ isPrimary: false } as any);
  }

  /** Есть ли строки, закреплённые за этим юрлицом. */
  private async isUsed(id: number): Promise<boolean> {
    const knex = this.tenantKnex();

    for (const table of LEGAL_ENTITY_TABLES) {
      // Через помощника, а не `schema.hasTable`: тот сравнивает имя таблицы
      // с учётом регистра и про существующую `ACCOUNTS_TRANSACTIONS` отвечает
      // «нет». Ответ «нет» здесь читался бы как «юрлицо ничем не занято» —
      // и удалить его дали бы вместе со всем, что на него ссылается.
      const exists = await hasTableAnyCase(knex, table);
      if (!exists) continue;

      const row = await knex(table).where('legal_entity_id', id).first();
      if (row) return true;
    }
    return false;
  }

  /** Сколько счетов закреплено за каждым юрлицом. */
  private async countAccountsByEntity(): Promise<Map<number, number>> {
    const knex = this.tenantKnex();

    const exists = await hasTableAnyCase(knex, 'accounts');
    if (!exists) return new Map();

    const rows: any[] = await knex('accounts')
      .select('legal_entity_id')
      .count({ total: 'id' })
      .whereNotNull('legal_entity_id')
      .groupBy('legal_entity_id');

    const counts = new Map<number, number>();
    rows.forEach((row) => {
      // ИМЯ В ВЕРБЛЮЖЬЕМ ВИДЕ. Отображение knex
      // (`knexSnakeCaseMappers`) переводит имена колонок в ответе обратно:
      // в базе `LEGAL_ENTITY_ID`, в ответе `legalEntityId`. Чтение
      // `row.legal_entity_id` давало `undefined` всегда — счётчик молча
      // оставался нулевым, и в справочнике у каждого юрлица стояло «0 счетов».
      counts.set(Number(row.legalEntityId), Number(row.total));
    });
    return counts;
  }
}
