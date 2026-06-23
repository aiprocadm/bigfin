import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromisePool } from '@supercharge/promise-pool';
import { BaseCommand } from './BaseCommand';

interface TenantsSeedLatestOptions {
  tenant_id?: string;
}

@Injectable()
@Command({
  name: 'tenants:seed:latest',
  description: 'Seed all tenant databases (or the given tenant id) with the latest seed data.',
})
export class TenantsSeedLatestCommand extends BaseCommand {
  private readonly SEED_CONCURRENCY = 10;

  constructor(configService: ConfigService) {
    super(configService);
  }

  @Option({
    flags: '-t, --tenant_id [tenant_id]',
    description: 'Which organization id do you seed.',
  })
  parseTenantId(val: string): string {
    return val;
  }

  async run(
    passedParams: string[],
    options: TenantsSeedLatestOptions,
  ): Promise<void> {
    try {
      const sysKnex = this.initSystemKnex();
      const tenants = await this.getAllInitializedTenants(sysKnex);
      const tenantsOrgsIds = tenants.map(
        (tenant: any) => tenant.organizationId,
      );

      if (
        options.tenant_id &&
        tenantsOrgsIds.indexOf(options.tenant_id) === -1
      ) {
        this.exit(`The given tenant id ${options.tenant_id} does not exist.`);
      }

      const seedTenant = async (organizationId: string) => {
        try {
          const tenantKnex = this.initTenantKnex(organizationId);
          const [log] = await tenantKnex.seed.run();
          const tenantDb = `${this.configService.get(
            'tenantDatabase.dbNamePrefix',
          )}${organizationId}`;

          this.log(`Tenant ${tenantDb} > ran ${log?.length ?? 0} seed file(s)`);
          this.log('-------------------');
        } catch (error) {
          this.exit(error);
        }
      };

      if (!options.tenant_id) {
        await PromisePool.withConcurrency(this.SEED_CONCURRENCY)
          .for(tenants)
          .process((tenant: any) => {
            return seedTenant(tenant.organizationId);
          });
        this.success('All tenants are seeded.');
      } else {
        await seedTenant(options.tenant_id);
      }
    } catch (error) {
      this.exit(error);
    }
  }
}
