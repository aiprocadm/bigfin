// © 2026 Bigfin
import knex from 'knex';

import { applyTransactionFilters } from './applyTransactionFilters';

/**
 * Отбор реестра по состоянию операции (FIN-003 ТЗ-2, T-32).
 *
 * НАЙДЕНО СВЕРКОЙ ЗАДЕЛА. Расчёт состояний (`resolveTransactionState`) был
 * написан и покрыт спекой, бейджи были нарисованы — а соединено это не было
 * НИЧЕМ: сервер состояний не отдавал, таблица их не показывала, отбора не
 * существовало. Три готовые части и ни одной работающей.
 *
 * Здесь смотрится ЖИВОЙ SQL: отбор, который построился, но ничего не
 * ограничивает, выглядит работающим и молча возвращает весь список.
 */
const sqlFor = (...states: string[]): string => {
  const query = knex({ client: 'mysql2' })
    .queryBuilder()
    .from('accounts_transactions');

  applyTransactionFilters(query, states.length ? { states } : {});

  return query.toString();
};

describe('отбор реестра по состоянию', () => {
  it('без отбора запрос не ограничивается', () => {
    expect(sqlFor()).toBe('select * from `accounts_transactions`');
  });

  it('«нам должны» смотрит на СЧЕТА ПОКУПАТЕЛЯМ с остатком', () => {
    const sql = sqlFor('receivable');

    expect(sql).toContain('SaleInvoice');
    expect(sql).toContain('sales_invoices');
  });

  it('«мы должны» смотрит на СЧЕТА ПОСТАВЩИКОВ с остатком', () => {
    const sql = sqlFor('payable');

    expect(sql).toContain('`bills`');
  });

  it('«просрочено» берёт ОБЕ СТОРОНЫ', () => {
    // Человек спрашивает «что горит», а не «что горит у покупателей».
    const sql = sqlFor('overdue');

    expect(sql).toContain('sales_invoices');
    expect(sql).toContain('`bills`');
    expect(sql).toContain('due_date');
  });

  it('«просрочено» сравнивает срок с сегодняшним днём', () => {
    const today = new Date().toISOString().slice(0, 10);

    expect(sqlFor('overdue')).toContain(today);
  });

  it('ФОРМУЛА ДОЛГА ОБЩАЯ, а не своя копия', () => {
    // Своя копия однажды разойдётся с карточкой документа на налог или
    // скидку, и человек увидит «просрочено» там, где документ закрыт.
    // Признаки общей формулы: в итог документа входит налог, а долг
    // гасится не только оплатой, но и списанием и зачётом кредит-нот.
    // Наивное «оплата < подытога» не содержит ни того, ни другого.
    const sql = sqlFor('receivable');

    expect(sql).toContain('TAX_AMOUNT_WITHHELD');
    expect(sql).toContain('PAYMENT_AMOUNT');
    expect(sql).toContain('CREDITED_AMOUNT');
  });

  it('НЕСКОЛЬКО состояний объединяются по «ИЛИ»', () => {
    // Человек спрашивает «покажи, что горит И что мне должны», а не
    // пересечение: пересечение почти всегда пусто.
    const sql = sqlFor('receivable', 'payable');

    expect(sql).toContain('sales_invoices');
    expect(sql).toContain('`bills`');
    expect(sql.toLowerCase()).toContain(' or ');
  });

  it('чужое состояние отбором НЕ становится', () => {
    // Опечатка в адресе не должна молча показывать пустой список.
    expect(sqlFor('просрочено')).toBe('select * from `accounts_transactions`');
  });
});
