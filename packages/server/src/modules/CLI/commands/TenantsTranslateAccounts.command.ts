import * as fs from 'fs';
import * as path from 'path';
import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCommand } from './BaseCommand';
import { AccountsData } from '@/database/tenant/seeds/data/accounts';
import { accountsToRename } from './translateSeededAccounts';

interface TranslateAccountsOptions {
  tenant_id?: string;
  dry_run?: boolean;
}

/**
 * Д3 карты v30 (решение 39, принято 27.08).
 *
 * Организации, созданные до перевода плана счетов, живут с английскими
 * названиями счетов. Команда переименовывает их на язык организации —
 * но ТОЛЬКО нетронутые счета: если человек назвал счёт по-своему, его
 * выбор не трогаем.
 *
 * Запускается осознанно, а не при выкатке: правка чужих данных не должна
 * случаться молча.
 */
@Injectable()
@Command({
  name: 'tenants:translate-accounts',
  description:
    'Переименовать нетронутые счета плана счетов на язык организации.',
})
export class TenantsTranslateAccountsCommand extends BaseCommand {
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
    description: 'Показать, что изменится, но ничего не менять.',
  })
  parseDryRun(): boolean {
    return true;
  }

  /** Словарь названий счетов для языка: ключ i18n → перевод. */
  private dictionary(lang: string): Record<string, string> {
    const file = path.join(__dirname, `../../../i18n/${lang}/account_seed.json`);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return {};
    }
  }

  /** Названия счетов по слагу для языка: слаг → название. */
  private namesBySlug(lang: string): Record<string, string> {
    const dictionary = this.dictionary(lang);

    return AccountsData.reduce<Record<string, string>>((names, account) => {
      // В данных сида имя лежит ключом словаря: `account_seed.bank_account`.
      const key = String(account.name).replace(/^account_seed\./, '');
      const translated = dictionary[key];
      if (account.slug && translated) names[account.slug] = translated;
      return names;
    }, {});
  }

  async run(
    passedParams: string[],
    options: TranslateAccountsOptions,
  ): Promise<void> {
    const sysKnex = this.initSystemKnex();
    const english = this.namesBySlug('en');

    if (!Object.keys(english).length) {
      this.exit('Не нашёлся английский словарь названий счетов.');
    }

    const tenants = await sysKnex('tenants')
      .whereNotNull('initializedAt')
      .leftJoin(
        'tenantsMetadata',
        'tenantsMetadata.tenantId',
        'tenants.id',
      )
      .select(
        'tenants.organizationId as organizationId',
        'tenantsMetadata.language as language',
      );

    const chosen = options.tenant_id
      ? tenants.filter((t: any) => t.organizationId === options.tenant_id)
      : tenants;

    if (options.tenant_id && !chosen.length) {
      this.exit(`Организация ${options.tenant_id} не найдена.`);
    }

    const failures: { organizationId: string; message: string }[] = [];
    let renamedTotal = 0;

    for (const tenant of chosen as any[]) {
      const lang = tenant.language || 'en';
      const target = this.namesBySlug(lang);
      const tenantKnex = this.initTenantKnex(tenant.organizationId);

      try {
        const accounts = await tenantKnex('accounts').select(
          'id',
          'slug',
          'name',
        );
        const plan = accountsToRename(accounts as any, english, target);

        if (!plan.length) {
          this.log(`${tenant.organizationId} (${lang}): переименовывать нечего`);
          continue;
        }

        plan.forEach((rename) => {
          this.log(
            `${tenant.organizationId} (${lang}): «${rename.from}» → «${rename.to}»`,
          );
        });

        if (!options.dry_run) {
          for (const rename of plan) {
            await tenantKnex('accounts')
              .where('id', rename.id)
              .update({ name: rename.to });
          }
        }
        renamedTotal += plan.length;
      } catch (error) {
        // Сбой одной организации не лишает перевода остальные — тот же
        // урок, что в tenants:migrate:latest (М1 карты v28).
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ organizationId: tenant.organizationId, message });
        this.log(`${tenant.organizationId}: НЕ ПЕРЕВЕДЁН — ${message}`);
      } finally {
        await tenantKnex.destroy().catch(() => {});
      }
    }

    await sysKnex.destroy().catch(() => {});

    const suffix = options.dry_run ? ' (проба, ничего не менялось)' : '';

    if (failures.length) {
      this.exit(
        `Переименовано счетов: ${renamedTotal}${suffix}. Не удалось у ${failures.length}: ${failures
          .map((f) => `${f.organizationId} (${f.message})`)
          .join('; ')}`,
      );
    } else {
      this.success(`Переименовано счетов: ${renamedTotal}${suffix}.`);
    }
  }
}
