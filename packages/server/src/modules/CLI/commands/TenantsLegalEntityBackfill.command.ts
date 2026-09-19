// © 2026 Bigfin
import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BaseCommand } from './BaseCommand';
import { buildDefaultLegalEntity } from '@/modules/LegalEntities/utils/buildDefaultLegalEntity';
import { backfillLegalEntityIdInTables } from '@/modules/LegalEntities/utils/backfillLegalEntityId';

interface BackfillOptions {
  tenant_id?: string;
  dry_run?: boolean;
}

/**
 * Заполнение юрлица у существующих строк — этап 6 ТЗ, §6.3 шаг 3.
 *
 * ЗАЧЕМ КОМАНДА. Сами правила заполнения были написаны давно, но запустить их
 * было НЕЧЕМ: служба вызывалась только из очереди задач, а поставить задачу в
 * очередь не умел никто — ни ручка, ни экран. Получилось «построено, но ничем
 * не запускается»: код есть, тесты зелёные, а колонка `legal_entity_id` у всех
 * организаций так и остаётся пустой.
 *
 * Порядок выкатки такой: резервная копия базы → миграции → ЭТА команда →
 * проверка. Только после неё разрезы по юрлицу что-то показывают.
 *
 * Команда запускается осознанно, а не при выкатке автоматически: она правит
 * чужие данные, и это не должно случаться молча. Пробный прогон (`--dry_run`)
 * показывает, скольким строкам не хватает юрлица, ничего не меняя.
 */
@Injectable()
@Command({
  name: 'tenants:legal-entity:backfill',
  description:
    'Проставить юрлицо по умолчанию строкам, у которых оно не заполнено.',
})
export class TenantsLegalEntityBackfillCommand extends BaseCommand {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @Option({
    flags: '-t, --tenant_id [tenant_id]',
    description: 'Только эта организация.',
  })
  parseTenantId(val: string): string {
    return val;
  }

  @Option({
    flags: '-d, --dry_run',
    description: 'Показать, сколько строк не заполнено, но ничего не менять.',
  })
  parseDryRun(): boolean {
    return true;
  }

  async run(
    passedParams: string[],
    options: BackfillOptions,
  ): Promise<void> {
    const sysKnex = this.initSystemKnex();

    const tenants = await sysKnex('tenants')
      .whereNotNull('initializedAt')
      .leftJoin('tenantsMetadata', 'tenantsMetadata.tenantId', 'tenants.id')
      .select('tenants.organizationId as organizationId', 'tenantsMetadata.*');

    const chosen = options.tenant_id
      ? tenants.filter((t: any) => t.organizationId === options.tenant_id)
      : tenants;

    if (options.tenant_id && !chosen.length) {
      this.exit(`Организация ${options.tenant_id} не найдена.`);
    }

    const failures: { organizationId: string; message: string }[] = [];
    let updatedTotal = 0;
    let incompleteTenants = 0;

    for (const tenant of chosen as any[]) {
      const tenantKnex = this.initTenantKnex(tenant.organizationId);

      try {
        const legalEntityId = await this.ensureDefaultLegalEntity(
          tenantKnex,
          tenant,
          options.dry_run === true,
        );

        if (legalEntityId === null) {
          this.log(
            `${tenant.organizationId}: справочник юрлиц пуст — в пробном прогоне ничего не создаём`,
          );
          continue;
        }

        const tables = options.dry_run
          ? await this.countPending(tenantKnex)
          : await backfillLegalEntityIdInTables(tenantKnex, legalEntityId);

        const updated = tables.reduce((sum, row) => sum + row.updated, 0);
        const incomplete = tables.some((row) => row.incomplete);

        updatedTotal += updated;
        if (incomplete) incompleteTenants += 1;

        const tail = incomplete
          ? ' — ДОШЛИ ДО ПОТОЛКА ПАКЕТОВ, запустите команду ещё раз'
          : '';

        this.log(
          `${tenant.organizationId}: строк ${updated} (юрлицо #${legalEntityId})${tail}`,
        );
      } catch (error) {
        // Сбой одной организации не лишает заполнения остальные — тот же
        // урок, что в tenants:migrate:latest.
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ organizationId: tenant.organizationId, message });
        this.log(`${tenant.organizationId}: НЕ ЗАПОЛНЕН — ${message}`);
      } finally {
        await tenantKnex.destroy().catch(() => {});
      }
    }

    await sysKnex.destroy().catch(() => {});

    const suffix = options.dry_run ? ' (проба, ничего не менялось)' : '';
    const tail = incompleteTenants
      ? ` У ${incompleteTenants} организаций остался хвост — запустите команду ещё раз.`
      : '';

    if (failures.length) {
      this.exit(
        `Заполнено строк: ${updatedTotal}${suffix}.${tail} Не удалось у ${failures.length}: ${failures
          .map((f) => `${f.organizationId} (${f.message})`)
          .join('; ')}`,
      );
    } else {
      this.success(`Заполнено строк: ${updatedTotal}${suffix}.${tail}`);
    }
  }

  /**
   * Головное юрлицо организации; в обычном прогоне создаётся из реквизитов,
   * если справочник пуст.
   *
   * В пробном прогоне ничего не создаётся и возвращается `null` — проба не
   * должна оставлять следов.
   */
  private async ensureDefaultLegalEntity(
    tenantKnex: any,
    metadata: any,
    dryRun: boolean,
  ): Promise<number | null> {
    const existing = await tenantKnex('legal_entities')
      .select('id')
      .orderBy('isPrimary', 'desc')
      .orderBy('id', 'asc')
      .first();

    if (existing) return Number(existing.id);
    if (dryRun) return null;

    const draft = buildDefaultLegalEntity(metadata ?? {});
    const [id] = await tenantKnex('legal_entities').insert({
      ...draft,
      bankDetails: draft.bankDetails
        ? JSON.stringify(draft.bankDetails)
        : null,
    });

    return Number(id);
  }

  /**
   * Сколько строк ждёт заполнения — для пробного прогона.
   *
   * Считаем ровно по тому же условию, по которому заполняем: иначе проба
   * показывала бы одно, а прогон делал другое.
   */
  private async countPending(tenantKnex: any) {
    const { LEGAL_ENTITY_TABLES } = await import(
      '@/modules/LegalEntities/constants'
    );
    const results: Array<{
      table: string;
      updated: number;
      incomplete: boolean;
    }> = [];

    for (const table of LEGAL_ENTITY_TABLES) {
      const exists = await tenantKnex.schema.hasTable(table);
      if (!exists) {
        results.push({ table, updated: 0, incomplete: false });
        continue;
      }

      const row = await tenantKnex(table)
        .whereNull('legal_entity_id')
        .count({ total: 'id' })
        .first();

      results.push({
        table,
        updated: Number(row?.total ?? 0),
        incomplete: false,
      });
    }

    return results;
  }
}
