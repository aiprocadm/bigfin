// © 2026 Bigfin
import knex from 'knex';

import { ACCOUNT_TYPE } from '@/constants/accounts';
import {
  applyDebtNatureFilter,
  parseDebtNature,
} from './applyDebtNatureFilter';

/**
 * Отбор контрагентов по природе долга (FIN-023 ТЗ-2, приёмка 3).
 *
 * Здесь смотрится ЖИВОЙ SQL, а не факт вызова: отбор, который построился, но
 * ничего не ограничивает, выглядит работающим и молча возвращает весь список.
 */
const sqlFor = (nature?: any): string => {
  const builder = knex({ client: 'mysql2' }).queryBuilder().from('contacts');

  applyDebtNatureFilter(builder, nature);

  return builder.toString();
};

describe('отбор по природе долга', () => {
  it('без отбора запрос не меняется', () => {
    expect(sqlFor(undefined)).toBe('select * from `contacts`');
  });

  it('денежная дебиторка смотрит на счета РАСЧЁТОВ С ПОКУПАТЕЛЯМИ', () => {
    const sql = sqlFor('money');

    expect(sql).toContain(ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE);
    expect(sql).toContain('group by `contact_id`');
  });

  it('денежная дебиторка — это дебет больше кредита', () => {
    expect(sqlFor('money')).toContain('SUM(`debit`) - SUM(`credit`) > 0');
  });

  it('неденежная смотрит на счета РАСЧЁТОВ С ПОСТАВЩИКАМИ', () => {
    // Нам должны поставку — значит мы заплатили вперёд.
    expect(sqlFor('goods')).toContain(ACCOUNT_TYPE.ACCOUNTS_PAYABLE);
  });

  it('«без дебиторки» исключает ОБЕ природы сразу', () => {
    // Приёмка 3 FIN-023. Исключить только денежную значило бы оставить в
    // списке тех, кому мы заплатили вперёд, — а они тоже нам должны.
    const sql = sqlFor('none');

    expect(sql.match(/not in/g)?.length).toBe(2);
    expect(sql).toContain(ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE);
    expect(sql).toContain(ACCOUNT_TYPE.ACCOUNTS_PAYABLE);
  });

  it('вид счёта берётся из базы, а не зашит номером', () => {
    // Номера счетов расчётов у каждой организации свои: зашитое число
    // работало бы у одной и молча возвращало пустоту у остальных.
    expect(sqlFor('money')).toContain('from `accounts`');
  });

  describe('разбор значения из адреса', () => {
    it('знакомые значения проходят', () => {
      expect(parseDebtNature('money')).toBe('money');
      expect(parseDebtNature('goods')).toBe('goods');
      expect(parseDebtNature('none')).toBe('none');
    });

    it('чужое значение отбором НЕ становится', () => {
      // Иначе опечатка в адресе молча показала бы пустой список.
      expect(parseDebtNature('деньги')).toBeUndefined();
      expect(parseDebtNature('')).toBeUndefined();
      expect(parseDebtNature(undefined)).toBeUndefined();
    });
  });
});
