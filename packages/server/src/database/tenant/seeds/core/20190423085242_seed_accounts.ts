import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { AccountsData } from '../data/accounts';

export default class SeedAccounts extends TenantSeeder {
  /**
   * Seeds initial accounts to the organization.
   */
  up(knex) {
    // Язык берём у организации, а не из заголовков запроса: план счетов
    // создаётся один раз при её сборке и потом виден во всех отчётах.
    const lang = this.tenant?.metadata?.language ?? 'en';

    const data = AccountsData.map((account) => ({
      ...account,
      name: this.i18n.t(account.name, { lang }),
      description: account.description
        ? this.i18n.t(account.description, { lang })
        : '',
      currencyCode: this.tenant.metadata.baseCurrency,
      seededAt: new Date(),
    }));
    return knex('accounts').then(async () => {
      // Inserts seed entries.
      return knex('accounts').insert(data);
    });
  }
}
