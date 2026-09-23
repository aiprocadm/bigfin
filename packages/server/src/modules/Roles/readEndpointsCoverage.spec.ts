// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { parseEndpoints, READ_DECORATOR, endpointKey } from '@/common/utils/findUnguardedWriteEndpoints';
import { activeCode } from '../../testing/activeCode';

/**
 * Права на ЧТЕНИЕ под машинной проверкой (FT-084 ТЗ-3) — пара к
 * `writeEndpointsCoverage.spec.ts`.
 *
 * До этапа 39 у читающих ручек новых модулей не было права вовсе: бюджеты,
 * платёжный календарь, долги, сделки, кредиты, основные средства, зарплата,
 * коэффициенты, анализ НДС, капитализация, финансовая модель, качество
 * данных, главная, ИИ-аналитик. Сотрудник, которому доверены только счета,
 * видел через них всю финансовую картину организации. Они размечены.
 *
 * Ниже — ВСЕ оставшиеся ручки чтения без права, поимённо. Часть открыта
 * намеренно (вход, загрузка витрины, публичные ссылки, справочники для
 * форм), часть — старые разделы, которые ещё предстоит разметить. Правило:
 * новая ручка чтения без права красит сборку; разметили — уберите строку.
 * Список только сокращается.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

const OPEN_READS: string[] = [
  // Загрузка витрины: по ней интерфейс узнаёт права — закрыть нельзя.
  'Dashboard/Dashboard.controller.ts#getBootMeta',
  'Acquiring/Acquiring.controller.ts#status',
  'Acquiring/Acquiring.controller.ts#summary',
  'AiChat/AiChat.controller.ts#getTools',
  'Auth/Auth.controller.ts#meta',
  'Auth/Authed.controller.ts#getAuthedAcccount',
  'BankApiSync/BankApiSync.controller.ts#status',
  'BankRules/BankRules.controller.ts#getBankRule',
  'BankRules/BankRules.controller.ts#getBankRules',
  'BankRules/BankRules.controller.ts#previewBankRule',
  'BankRules/BankRules.controller.ts#transactionRuleApplications',
  'BankingAccounts/AccountGroups.controller.ts#getGroups',
  'BankingAccounts/BankAccounts.controller.ts#getBankAccountSummary',
  'BankingAccounts/BankAccounts.controller.ts#getBankAccounts',
  'BankingMatching/BankingMatching.controller.ts#getMatchedTransactions',
  'BankingTranasctionsRegonize/BankingRecognizedTransactions.controller.ts#getRecognizedTransaction',
  'BankingTranasctionsRegonize/BankingRecognizedTransactions.controller.ts#getRecognizedTransactions',
  'BankingTransactionsExclude/BankingTransactionsExclude.controller.ts#getExcludedBankTransactions',
  'BillLandedCosts/LandedCost.controller.ts#getBillLandedCostTransactions',
  'BillLandedCosts/LandedCost.controller.ts#getLandedCostTransactions',
  'Branches/Branches.controller.ts#getBranch',
  'Branches/Branches.controller.ts#getBranches',
  'CostAllocation/CostAllocation.controller.ts#getList',
  'CrmIntegration/CrmIntegration.controller.ts#status',
  'Currencies/Currencies.controller.ts#findAll',
  'Currencies/Currencies.controller.ts#findOne',
  'ExchangeRates/ExchangeRates.controller.ts#getLatestExchangeRate',
  'Features/Features.controller.ts#all',
  'Import/Import.controller.ts#downloadImportSample',
  'Import/Import.controller.ts#getImportFileMeta',
  'Import/Import.controller.ts#preview',
  'InventoryCost/InventoryCost.controller.ts#getItemsCost',
  'ItemCategories/ItemCategory.controller.ts#getItemCategories',
  'ItemCategories/ItemCategory.controller.ts#getItemCategory',
  'LegalEntities/LegalEntities.controller.ts#getIntercompanyTurnover',
  'LegalEntities/LegalEntities.controller.ts#getLegalEntities',
  'ManagementArticles/ManagementArticles.controller.ts#getArticlesPlRollup',
  'ManagementArticles/ManagementArticles.controller.ts#getManagementArticle',
  'ManagementArticles/ManagementArticles.controller.ts#getManagementArticles',
  'ManagementArticles/ManagementArticles.controller.ts#getReportMap',
  'Marketplaces/Marketplaces.controller.ts#ozonSummary',
  'Marketplaces/Marketplaces.controller.ts#status',
  'Marketplaces/Marketplaces.controller.ts#wbSummary',
  'Miscellaneous/Miscellaneous.controller.ts#getDateFormats',
  'MoySklad/MoySklad.controller.ts#preview',
  'MoySklad/MoySklad.controller.ts#status',
  'Notifications/Notifications.controller.ts#getPreferences',
  'Notifications/Notifications.controller.ts#getTelegramEntryAccount',
  'Notifications/Notifications.controller.ts#listNotifications',
  'Notifications/Notifications.controller.ts#unreadCount',
  'OneClickDemo/OneClickDemo.controller.ts#getBuildJob',
  'Organization/Organization.controller.ts#baseCurrencyMutate',
  'Organization/Organization.controller.ts#buildJob',
  'Organization/Organization.controller.ts#currentOrganization',
  'PaymentLinks/PaymentLinks.controller.ts#getPaymentLinkInvoicePdf',
  'PaymentLinks/PaymentLinks.controller.ts#getPaymentLinkPublicMeta',
  'PaymentReceived/PaymentsReceived.controller.ts#getPaymentReceiveEditPage',
  'PaymentReceived/PaymentsReceived.controller.ts#getPaymentReceiveMailOptions',
  // Заявки открыты всем участникам, но чужие видны только с правом
  // «видеть заявки всех сотрудников» — это решает сам запрос (FT-083).
  'PaymentRequests/PaymentRequests.controller.ts#get',
  'PaymentRequests/PaymentRequests.controller.ts#getList',
  'PaymentServices/PaymentServices.controller.ts#getPaymentMethodsState',
  'PaymentServices/PaymentServices.controller.ts#getPaymentService',
  'PaymentServices/PaymentServices.controller.ts#getPaymentServicesSpecificInvoice',
  'PdfTemplate/PdfTemplates.controller.ts#getPdfTemplate',
  'PdfTemplate/PdfTemplates.controller.ts#getPdfTemplateBrandingState',
  'PdfTemplate/PdfTemplates.controller.ts#getPdfTemplates',
  'PublicApi/PublicApi.controller.ts#getApiTokens',
  'PublicApi/PublicApi.controller.ts#getDeliveries',
  'PublicApi/PublicApi.controller.ts#getEvents',
  'PublicApi/PublicApi.controller.ts#getScopes',
  'PublicApi/PublicApi.controller.ts#getWebhooks',
  'Resource/Resource.controller.ts#getResourceMeta',
  'Settings/Settings.controller.ts#getDisplayPreferences',
  'Settings/Settings.controller.ts#getSettings',
  'StripePayment/StripePayment.controller.ts#getStripeConnectLink',
  'Subscription/Subscriptions.controller.ts#getSubscriptions',
  'System/SystemDB/SystemDB.controller.ts#ping',
  'TransactionsLocking/TransactionsLocking.controller.ts#getTransactionLockingMeta',
  'TransactionsLocking/TransactionsLocking.controller.ts#getTransactionLockingMetaList',
  'TwoFactor/TwoFactor.controller.ts#getState',
  'UsersModule/Users.controller.ts#getUser',
  'UsersModule/Users.controller.ts#listUsers',
  'UsersModule/UsersInvitePublic.controller.ts#checkInvite',
  'Views/Views.controller.ts#getResourceViews',
  'Warehouses/WarehouseItems.controller.ts#getItemWarehouses',
  'Warehouses/Warehouses.controller.ts#getWarehouse',
  'Warehouses/Warehouses.controller.ts#getWarehouses',
  'WarehousesTransfers/WarehouseTransfers.controller.ts#getWarehouseTransfer',
  'WarehousesTransfers/WarehouseTransfers.controller.ts#getWarehousesTransfers',
  'ZenmoneyImport/ZenmoneyImport.controller.ts#status',
  'ee/Workspaces/Workspaces.controller.ts#buildJobStatus',
  'ee/Workspaces/Workspaces.controller.ts#listWorkspaces',
];

const controllerFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

const allReads = () =>
  controllerFiles(MODULES_DIR).flatMap((file) =>
    parseEndpoints(
      activeCode(fs.readFileSync(file, 'utf8')),
      path.relative(MODULES_DIR, file).split(path.sep).join('/'),
      READ_DECORATOR,
    ),
  );

describe('каждая ручка чтения спрашивает права или названа поимённо', () => {
  const reads = allReads();
  const openKeys = reads.filter((endpoint) => !endpoint.guarded).map(endpointKey);

  it('ручки чтения найдены', () => {
    expect(reads.length).toBeGreaterThan(250);
  });

  it('новых ручек чтения без права не появилось', () => {
    expect(openKeys.filter((key) => !OPEN_READS.includes(key))).toEqual([]);
  });

  it('в списке нет устаревших строк', () => {
    expect(OPEN_READS.filter((key) => !openKeys.includes(key))).toEqual([]);
  });

  it.each([
    'PaymentCalendar/PaymentCalendar.controller.ts#getForecast',
    'Budgets/Budgets.controller.ts#getPlanFact',
    'Debts/Debts.controller.ts#getOverview',
    'Deals/Deals.controller.ts#getList',
    'Dashboard/Dashboard.controller.ts#getMoneyWidget',
  ])('ручка из списка дефектов 7.3 закрыта правом: %s', (key) => {
    expect(openKeys).not.toContain(key);
    expect(reads.map(endpointKey)).toContain(key);
  });
});
