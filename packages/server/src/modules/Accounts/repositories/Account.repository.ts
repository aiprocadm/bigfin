import { Knex } from 'knex';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { TenantRepository } from '@/common/repository/TenantRepository';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { Account } from '../models/Account.model';
import { I18nService } from 'nestjs-i18n';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  DiscountExpenseAccount,
  OtherChargesAccount,
  OtherExpensesAccount,
  PrepardExpenses,
  PurchaseDiscountAccount,
  StripeClearingAccount,
  TaxPayableAccount,
  TaxReceivableAccount,
  UnearnedRevenueAccount,
} from '../Accounts.constants';

@Injectable({ scope: Scope.REQUEST })
export class AccountRepository extends TenantRepository {
  constructor(
    private readonly i18n: I18nService,
    private readonly tenancyContext: TenancyContext,

    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantDBKnex: () => Knex,
  ) {
    super();
  }

  /**
   * Gets the repository's model.
   */
  get model(): typeof Account {
    return Account.bindKnex(this.tenantDBKnex());
  }

  /**
   * Retrieve accounts dependency graph.
   * @param {string} withRelation
   * @param {Knex.Transaction} trx
   * @returns {}
   */
  public async getDependencyGraph(
    withRelation?: string,
    trx?: Knex.Transaction,
  ) {
    const accounts = await this.all(withRelation, trx);

    return this.model.toDependencyGraph(accounts);
  }

  /**
   * Retrieve account by slug.
   * @param {string} slug
   * @return {Promise<IAccount>}
   */
  public findBySlug(slug: string) {
    return this.findOne({ slug });
  }

  // /**
  //  * Changes account balance.
  //  * @param {number} accountId
  //  * @param {number} amount
  //  * @return {Promise<void>}
  //  */
  // async balanceChange(accountId: number, amount: number): Promise<void> {
  //   const method: string = amount < 0 ? 'decrement' : 'increment';

  //   await this.model.query().where('id', accountId)[method]('amount', amount);
  //   this.flushCache();
  // }

  /**
   * Activate user by the given id.
   * @param  {number} userId - User id.
   * @return {Promise<void>}
   */
  activateById(userId: number): Promise<number> {
    return super.update({ active: 1 }, { id: userId });
  }

  /**
   * Inactivate user by the given id.
   * @param  {number} userId - User id.
   * @return {Promise<void>}
   */
  inactivateById(userId: number): Promise<number> {
    return super.update({ active: 0 }, { id: userId });
  }

  /**
   * Activate user by the given id.
   * @param  {number} userId - User id.
   * @return {Promise<void>}
   */
  async activateByIds(userIds: number[], trx): Promise<number> {
    const results = await this.model
      .query(trx)
      .whereIn('id', userIds)
      .patch({ active: true });

    return results;
  }

  /**
   * Inactivate user by the given id.
   * @param  {number} userId - User id.
   * @return {Promise<void>}
   */
  async inactivateByIds(userIds: number[], trx): Promise<number> {
    const results = await this.model
      .query(trx)
      .whereIn('id', userIds)
      .patch({ active: false });

    return results;
  }

  /**
   *
   * @param {string} currencyCode
   * @param extraAttrs
   * @param trx
   * @returns
   */
  /**
   * Имя предопределённого счёта хранится ключом перевода: счёт создаётся
   * лениво (в момент первой скидки, комиссии, аванса), и без перевода
   * русская организация получала «Stripe Clearing» посреди русского плана
   * счетов (Р4 карты v18). Язык берём у организации, а не у запроса: счёт
   * остаётся в плане навсегда, а язык запроса зависит от того, кто первым
   * его создал.
   */
  private async withTranslatedName<T extends { name: string }>(
    account: T,
  ): Promise<T> {
    const lang = await this.organizationLanguage();

    return { ...account, name: this.i18n.t(account.name, { lang }) };
  }

  /** Язык организации (`tenants_metadata.language`), по умолчанию `en`. */
  private async organizationLanguage(): Promise<string> {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();

    return tenantMeta?.language ?? 'en';
  }

  findOrCreateAccountReceivable = async (
    currencyCode: string = '',
    extraAttrs = {},
    trx?: Knex.Transaction,
  ) => {
    let result = await this.model
      .query(trx)
      .onBuild((query) => {
        if (currencyCode) {
          query.where('currencyCode', currencyCode);
        }
        query.where('accountType', 'accounts-receivable');
      })
      .first();

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        name: this.i18n.t('account.accounts_receivable.currency', {
          args: { currency: currencyCode },
          lang: await this.organizationLanguage(),
        }),
        accountType: 'accounts-receivable',
        currencyCode,
        active: true,
        ...extraAttrs,
      });
    }
    return result;
  };

  /**
   * Find or create tax payable account.
   * @param {Record<string, string>}extraAttrs
   * @param {Knex.Transaction} trx
   * @returns
   */
  async findOrCreateTaxPayable(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    let result = await this.model
      .query(trx)
      .findOne({ slug: TaxPayableAccount.slug, ...extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(TaxPayableAccount)),
        ...extraAttrs,
      });
    }
    return result;
  }

  /**
   * Счёт входящего НДС («к вычету»). Создаётся при первой закупке с налогом.
   */
  async findOrCreateTaxReceivable(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    let result = await this.model
      .query(trx)
      .findOne({ slug: TaxReceivableAccount.slug, ...extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(TaxReceivableAccount)),
        ...extraAttrs,
      });
    }
    return result;
  }

  findOrCreateAccountsPayable = async (
    currencyCode: string = '',
    extraAttrs = {},
    trx?: Knex.Transaction,
  ) => {
    let result = await this.model
      .query(trx)
      .onBuild((query) => {
        if (currencyCode) {
          query.where('currencyCode', currencyCode);
        }
        query.where('accountType', 'accounts-payable');
      })
      .first();

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        name: this.i18n.t('account.accounts_payable.currency', {
          args: { currency: currencyCode },
          lang: await this.organizationLanguage(),
        }),
        accountType: 'accounts-payable',
        currencyCode,
        active: true,
        ...extraAttrs,
      });
    }
    return result;
  };

  /**
   * Finds or creates the unearned revenue.
   * @param {Record<string, string>} extraAttrs
   * @param {Knex.Transaction} trx
   * @returns
   */
  public async findOrCreateUnearnedRevenue(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };
    let result = await this.model
      .query(trx)
      .findOne({ slug: UnearnedRevenueAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(UnearnedRevenueAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  /**
   * Finds or creates the prepard expenses account.
   * @param {Record<string, string>} extraAttrs
   * @param {Knex.Transaction} trx
   * @returns
   */
  public async findOrCreatePrepardExpenses(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };

    let result = await this.model
      .query(trx)
      .findOne({ slug: PrepardExpenses.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(PrepardExpenses)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  /**
   * Finds or creates the stripe clearing account.
   * @param {Record<string, string>} extraAttrs
   * @param {Knex.Transaction} trx
   * @returns
   */
  public async findOrCreateStripeClearing(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };
    let result = await this.model
      .query(trx)
      .findOne({ slug: StripeClearingAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(StripeClearingAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  /**
   * Finds or creates the discount expense account.
   * @param {Record<string, string>} extraAttrs
   * @param {Knex.Transaction} trx
   * @returns
   */
  public async findOrCreateDiscountAccount(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };

    let result = await this.model
      .query(trx)
      .findOne({ slug: DiscountExpenseAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(DiscountExpenseAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  public async findOrCreatePurchaseDiscountAccount(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };

    let result = await this.model
      .query(trx)
      .findOne({ slug: PurchaseDiscountAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(PurchaseDiscountAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  public async findOrCreateOtherChargesAccount(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };

    let result = await this.model
      .query(trx)
      .findOne({ slug: OtherChargesAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(OtherChargesAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }

  public async findOrCreateOtherExpensesAccount(
    extraAttrs: Record<string, string> = {},
    trx?: Knex.Transaction,
  ) {
    const tenantMeta = await this.tenancyContext.getTenantMetadata();
    const _extraAttrs = {
      currencyCode: tenantMeta.baseCurrency,
      ...extraAttrs,
    };
    let result = await this.model
      .query(trx)
      .findOne({ slug: OtherExpensesAccount.slug, ..._extraAttrs });

    if (!result) {
      result = await this.model.query(trx).insertAndFetch({
        ...(await this.withTranslatedName(OtherExpensesAccount)),
        ..._extraAttrs,
      });
    }
    return result;
  }
}
