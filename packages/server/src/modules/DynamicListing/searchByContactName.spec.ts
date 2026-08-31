import knex from 'knex';
import { DynamicFilterSearch } from './DynamicFilter/DynamicFilterSearch';
import { DynamicFilter } from './DynamicFilter/DynamicFilter';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { SaleEstimate } from '@/modules/SaleEstimates/models/SaleEstimate';
import { SaleReceipt } from '@/modules/SaleReceipts/models/SaleReceipt';
import { Bill } from '@/modules/Bills/models/Bill';
import { CreditNote } from '@/modules/CreditNotes/models/CreditNote';
import { VendorCredit } from '@/modules/VendorCredit/models/VendorCredit';
import { PaymentReceived } from '@/modules/PaymentReceived/models/PaymentReceived';
import { BillPayment } from '@/modules/BillPayments/models/BillPayment';

/** Все восемь документов, у которых есть контрагент. */
const DOCUMENTS: Array<[string, any]> = [
  ['счёт покупателю', SaleInvoice],
  ['смета', SaleEstimate],
  ['чек', SaleReceipt],
  ['счёт поставщика', Bill],
  ['кредит-нота', CreditNote],
  ['возврат поставщику', VendorCredit],
  ['оплата от клиента', PaymentReceived],
  ['оплата поставщику', BillPayment],
];

/**
 * К1 карты v41. Документы ищутся по имени контрагента.
 *
 * Самый частый способ, каким человек ищет, — «счета Ромашки». Он не
 * работал ни у одного документа: поиск смотрел только номер, ссылку и
 * сумму, то есть колонки своей же таблицы.
 *
 * Карта v39 записала, что соединений с другими таблицами в DynamicListing
 * нет вовсе и нужна новая машинерия. Это неверно: механизм есть —
 * поле с `fieldType: 'relation'` даёт соединение и сравнение по колонке
 * связанной таблицы. Им просто никто не пользовался для поиска.
 */
const sqlFor = (model: any, keyword: string): string => {
  const filter = new DynamicFilterSearch(keyword);
  filter.setModel(model);
  filter.onInitialize();

  const builder = knex({ client: 'mysql2' }).queryBuilder().from(model.tableName);
  filter.buildQuery()(builder);

  return builder.toString();
};

/**
 * Полный путь, каким пользуется живой список: условие поиска И соединение
 * с таблицей контрагентов. Соединение добавляет ДРУГОЙ метод, чем условие,
 * — проверка только условия зеленела бы на запросе, который база отвергнет
 * с «unknown column contacts.display_name».
 */
const fullSqlFor = (model: any, keyword: string): string => {
  const dynamicFilter = new DynamicFilter(model);
  dynamicFilter.setFilter(new DynamicFilterSearch(keyword));

  const builder = knex({ client: 'mysql2' }).queryBuilder().from(model.tableName);
  dynamicFilter.buildQuery()(builder);

  return builder.toString();
};

describe('поиск документа по имени контрагента', () => {
  it.each(DOCUMENTS)('%s соединяется с таблицей контрагентов', (_name, model) => {
    const sql = fullSqlFor(model, 'Ромашка');

    expect(sql).toContain('join `contacts`');
    expect(sql).toContain('`contacts`.`display_name` like');
  });

  it.each(DOCUMENTS)('%s ищет по имени контрагента', (_name, model) => {
    const sql = sqlFor(model, 'Ромашка');

    expect(sql).toContain('`contacts`.`display_name`');
    expect(sql).toContain('Ромашка');
  });

  it.each(DOCUMENTS)('%s без контрагента не теряется из поиска', (_name, model) => {
    // Колонка контрагента в базе допускает пустое значение (миграции
    // объявляют её без notNullable). Внутреннее соединение выкинуло бы
    // такой документ из выдачи ДАЖЕ при поиске по его собственному номеру:
    // человек ищет «СЧ-001» и не находит свой же счёт.
    const sql = fullSqlFor(model, 'Ромашка');

    expect(sql).toContain('left join `contacts`');
    expect(sql).not.toContain('inner join `contacts`');
  });

  it('прежние поля поиска не потерялись', () => {
    const sql = sqlFor(SaleInvoice, 'СЧ-001');

    expect(sql).toContain('invoice_no');
    expect(sql).toContain('reference_no');
  });
});
