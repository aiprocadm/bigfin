// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { LegalEntity } from '../models/LegalEntity.model';
import { buildDefaultLegalEntity } from '../utils/buildDefaultLegalEntity';

/**
 * Юрлицо по умолчанию (этап 6 ТЗ, §6.3 шаг 2).
 *
 * Создаётся лениво — при первом обращении к справочнику, а не отдельным
 * прогоном по всем организациям. Так оно появится и у тех, кто заведётся
 * завтра, и не нужен разовый скрипт, который однажды забудут повторить.
 *
 * Метод идемпотентный: второй вызов ничего не создаёт. Это важнее, чем
 * кажется — ленивый сидер по определению вызывается часто и одновременно
 * из разных вкладок.
 */
@Injectable()
export class EnsureDefaultLegalEntityService {
  constructor(
    private readonly tenancyContext: TenancyContext,

    @Inject(LegalEntity.name)
    private readonly legalEntityModel: TenantModelProxy<typeof LegalEntity>,
  ) {}

  /**
   * Возвращает головное юрлицо организации, создавая его из реквизитов,
   * если справочник пуст.
   */
  public async ensure(): Promise<LegalEntity> {
    const existing = await this.findExisting();
    if (existing) return existing;

    // Реквизиты лежат в СИСТЕМНОЙ схеме (`tenants_metadata`), а справочник
    // юрлиц — в тенантной. Путаница этих двух схем — известный источник
    // багов проекта, поэтому чтение и запись здесь разведены явно.
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const draft = buildDefaultLegalEntity(metadata ?? {});

    const created = await this.legalEntityModel()
      .query()
      .insertAndFetch(draft as any);

    return created as LegalEntity;
  }

  /**
   * Уже заведённое юрлицо: сначала головное, иначе любое.
   *
   * «Любое» — не придирка: головное могли снять руками, и заводить второе
   * юрлицо по умолчанию поверх существующего справочника нельзя.
   */
  private async findExisting(): Promise<LegalEntity | null> {
    const primary = await this.legalEntityModel()
      .query()
      .where('isPrimary', true)
      .first();

    if (primary) return primary as LegalEntity;

    const any = await this.legalEntityModel()
      .query()
      .orderBy('id', 'asc')
      .first();

    return (any as LegalEntity) ?? null;
  }
}
