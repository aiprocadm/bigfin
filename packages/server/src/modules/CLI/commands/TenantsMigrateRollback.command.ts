import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromisePool } from '@supercharge/promise-pool';
import { BaseCommand } from './BaseCommand';

interface TenantsMigrateRollbackOptions {
  tenant_id?: string;
}

@Injectable()
@Command({
  name: 'tenants:migrate:rollback',
  description: 'Rollback the last batch of tenants migrations.',
})
export class TenantsMigrateRollbackCommand extends BaseCommand {
  private readonly MIGRATION_CONCURRENCY = 10;

  constructor(configService: ConfigService) {
    super(configService);
  }

  @Option({
    flags: '-t, --tenant_id [tenant_id]',
    description: 'Which organization id do you migrate.',
  })
  parseTenantId(val: string): string {
    return val;
  }

  async run(passedParams: string[], options: TenantsMigrateRollbackOptions): Promise<void> {
    try {
      const sysKnex = this.initSystemKnex();
      const tenants = await this.getAllInitializedTenants(sysKnex);
      const tenantsOrgsIds = tenants.map((tenant: any) => tenant.organizationId);

      if (options.tenant_id && tenantsOrgsIds.indexOf(options.tenant_id) === -1) {
        this.exit(`The given tenant id ${options.tenant_id} does not exist.`);
      }

      // Как и в tenants:migrate:latest (М1 карты v28): сбой одной
      // организации не обрывает откат остальных, ошибки называются итогом,
      // соединения закрываются.
      const failures: { organizationId: string; message: string }[] = [];

      const migrateTenant = async (organizationId: string) => {
        const tenantKnex = this.initTenantKnex(organizationId);
        const tenantDb = `${this.configService.get('tenantDatabase.dbNamePrefix')}${organizationId}`;
        try {
          const [batchNo, _log] = await tenantKnex.migrate.rollback();

          if (_log.length === 0) {
            this.log('Already at the base migration');
          }

          this.log(
            `Tenant: ${tenantDb} > Batch ${batchNo} rolled back: ${_log.length} migrations`
          );
          this.log('---------------');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ organizationId, message });
          this.log(`Tenant: ${tenantDb} > НЕ ОТКАЧЕН: ${message}`);
          this.log('---------------');
        } finally {
          await tenantKnex.destroy().catch(() => {});
        }
      };

      if (!options.tenant_id) {
        await PromisePool.withConcurrency(this.MIGRATION_CONCURRENCY)
          .for(tenants)
          .process((tenant: any) => {
            return migrateTenant(tenant.organizationId);
          });
      } else {
        await migrateTenant(options.tenant_id);
      }

      if (failures.length) {
        this.exit(
          `Не откачены ${failures.length} из ${
            options.tenant_id ? 1 : tenants.length
          }: ${failures
            .map((f) => `${f.organizationId} (${f.message})`)
            .join('; ')}`,
        );
      } else {
        this.success('All tenants are rollbacked.');
      }
    } catch (error) {
      this.exit(error);
    }
  }
}
