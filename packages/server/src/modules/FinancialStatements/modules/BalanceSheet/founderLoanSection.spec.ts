// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../../../testing/activeCode';
import { ACCOUNT_TYPE, ACCOUNT_TYPES } from '@/constants/accounts';

/**
 * «Заём от учредителя» в балансе (этап 8 ТЗ, §8.2, остаток К5).
 *
 * ЧТО БЫЛО НЕ ТАК. Тип счёта «Личные средства» помечен как балансовый
 * (`balanceSheet: true`), но НИ В ОДНОМ разделе схемы баланса его не было.
 * Такие счета не попадали в отчёт вообще — и баланс просто не сходился у
 * всех, кто платит за фирму личной картой. Ничего при этом не падало:
 * обе стороны считались, они просто были разными.
 *
 * ПОЧЕМУ ОБЯЗАТЕЛЬСТВО, А НЕ ИМУЩЕСТВО. Собственник платит за фирму своими
 * деньгами — значит фирма должна ему. Сам счёт дебетовый, потому что с него
 * ПЛАТЯТ, как с кассы; но принадлежат эти деньги не фирме.
 */
const ROOT = __dirname;

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf-8'));

describe('личные средства в балансе', () => {
  const schema = read('BalanceSheetSchema.ts');

  it('раздел «Заём от учредителя» есть в схеме', () => {
    expect(schema).toContain('FOUNDER_LOAN');
    expect(schema).toContain('balance_sheet.founder_loan');
  });

  it('раздел стоит в ОБЯЗАТЕЛЬСТВАХ, а не в активах', () => {
    // Место в схеме и есть смысл: попав в активы, эти деньги стали бы
    // имуществом фирмы, которым они не являются.
    const liabilities = schema.slice(
      schema.indexOf('BALANCE_SHEET_SCHEMA_NODE_ID.LIABILITY,'),
      schema.indexOf('BALANCE_SHEET_SCHEMA_NODE_ID.EQUITY'),
    );

    expect(liabilities).toContain('FOUNDER_LOAN');
  });

  it('в раздел попадают именно личные средства', () => {
    expect(schema).toContain('ACCOUNT_TYPE.PERSONAL_FUNDS');
  });

  it('тип счёта по-прежнему считается балансовым', () => {
    // Иначе раздел был бы и пустым, и правильным одновременно.
    const personal = ACCOUNT_TYPES.find(
      (type: any) => type.key === ACCOUNT_TYPE.PERSONAL_FUNDS,
    );

    expect(personal?.balanceSheet).toBe(true);
  });

  it('знак остатка разворачивается', () => {
    // Счёт дебетовый: потратил собственник — остаток ушёл в минус. На
    // стороне обязательств такое показывалось бы как «минус долг».
    const accounts = read('BalanceSheetAccounts.ts');

    expect(accounts).toContain('ACCOUNT_TYPE.PERSONAL_FUNDS');
    expect(accounts).toContain('isInverted ? -closingBalance : closingBalance');
  });

  it('разворот не задел накопленную амортизацию', () => {
    // Она разворачивалась и раньше по своей причине; правило общее, но
    // причины разные, и обе должны остаться.
    expect(read('BalanceSheetAccounts.ts')).toContain(
      'ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION',
    );
  });

  it('проверка и правда читает схему', () => {
    expect(schema.length).toBeGreaterThan(1000);
  });
});
