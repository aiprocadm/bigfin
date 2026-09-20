// © 2026 Bigfin
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { GetContactDebtBreakdownService } from './GetContactDebtBreakdown.service';

/**
 * FIN-023 ТЗ-2: денежная и неденежная задолженность на настоящих сальдо.
 *
 * Чистый расчёт проверен отдельно (`computeDebtBreakdown.spec.ts`). Здесь
 * проверяется то, что чистая функция проверить не может: ЗНАК. Дебиторка
 * считается от дебета, кредиторка — от кредита, и перепутать их значит
 * превратить «нам должны» в «мы должны».
 */
const RECEIVABLE_ID = 11;
const PAYABLE_ID = 22;

/** Справочник счетов: один дебиторский, один кредиторский. */
const accountModel = () => ({
  query: () => {
    let type: string | null = null;
    const chain: any = {
      where: (_column: string, value: string) => {
        type = value;
        return chain;
      },
      select: async () => {
        if (type === ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE) {
          return [{ id: RECEIVABLE_ID }];
        }
        if (type === ACCOUNT_TYPE.ACCOUNTS_PAYABLE) return [{ id: PAYABLE_ID }];
        return [];
      },
    };
    return chain;
  },
});

/** Проводки: свой набор строк для каждого набора счетов. */
const transactionModel = (rows: Record<number, any[]>) => () => ({
  query: () => {
    const captured: { accountIds: number[]; modifiers: any[] } = {
      accountIds: [],
      modifiers: [],
    };
    const qb: any = {
      sum: () => qb,
      groupBy: () => qb,
      select: () => qb,
      whereNotNull: () => qb,
      whereIn: (_column: string, ids: number[]) => {
        captured.accountIds = ids;
        return qb;
      },
      modify: (...args: any[]) => {
        captured.modifiers.push(args);
        return qb;
      },
    };

    return {
      onBuild: (build: (builder: any) => void) => {
        build(qb);
        return Promise.resolve(rows[captured.accountIds[0]] ?? []);
      },
      captured,
    };
  },
});

const buildService = (rows: Record<number, any[]>) =>
  new GetContactDebtBreakdownService(
    accountModel as any,
    transactionModel(rows) as any,
  );

describe('разбор долга по контрагентам', () => {
  it('отгрузка без оплаты — НАМ должны деньги', async () => {
    const service = buildService({
      [RECEIVABLE_ID]: [{ contactId: 5, debit: 100_000, credit: 0 }],
      [PAYABLE_ID]: [],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts[0].receivable.money).toBe(100_000);
    expect(result.contacts[0].payable.total).toBe(0);
  });

  it('аванс от покупателя — МЫ должны исполнение', async () => {
    // Кредит на дебиторском счёте больше дебета: деньги получены вперёд.
    const service = buildService({
      [RECEIVABLE_ID]: [{ contactId: 5, debit: 0, credit: 60_000 }],
      [PAYABLE_ID]: [],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts[0].payable.goods).toBe(60_000);
    expect(result.contacts[0].payable.money).toBe(0);
  });

  it('счёт поставщика — МЫ должны деньги', async () => {
    const service = buildService({
      [RECEIVABLE_ID]: [],
      [PAYABLE_ID]: [{ contactId: 7, debit: 0, credit: 40_000 }],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts[0].payable.money).toBe(40_000);
  });

  it('аванс поставщику — НАМ должны поставку', async () => {
    const service = buildService({
      [RECEIVABLE_ID]: [],
      [PAYABLE_ID]: [{ contactId: 7, debit: 25_000, credit: 0 }],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts[0].receivable.goods).toBe(25_000);
  });

  it('контрагент по обе стороны собирается в ОДНУ строку', async () => {
    const service = buildService({
      [RECEIVABLE_ID]: [{ contactId: 9, debit: 70_000, credit: 0 }],
      [PAYABLE_ID]: [{ contactId: 9, debit: 0, credit: 30_000 }],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0].receivable.money).toBe(70_000);
    expect(result.contacts[0].payable.money).toBe(30_000);
  });

  it('нулевое сальдо не попадает в ответ', async () => {
    // Приёмка 2 FIN-023: аванс и отгрузка на равные суммы.
    const service = buildService({
      [RECEIVABLE_ID]: [{ contactId: 5, debit: 50_000, credit: 50_000 }],
      [PAYABLE_ID]: [],
    });

    const result = await service.getDebtBreakdown();

    expect(result.contacts).toEqual([]);
  });

  it('без счетов расчётов ответ пустой, а не сломанный', async () => {
    const service = new GetContactDebtBreakdownService(
      (() => ({ query: () => ({ where: () => ({ select: async () => [] }) }) })) as any,
      transactionModel({}) as any,
    );

    const result = await service.getDebtBreakdown();

    expect(result.contacts).toEqual([]);
    expect(result.totals.receivable.total).toBe(0);
  });
});
