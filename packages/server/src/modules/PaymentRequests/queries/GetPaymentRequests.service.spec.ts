import knex from 'knex';
import { GetPaymentRequestsService } from './GetPaymentRequests.service';
import { PaymentRequest } from '../models/PaymentRequest.model';

/**
 * Р3 карты v43. Заявки на оплату ищутся по назначению.
 *
 * Реестр заявок растёт быстрее прочих новых разделов — заявку заводят на
 * каждый платёж. Найти в нём было нельзя ничего.
 */
const sqlForFilter = (filter: any): string => {
  const kb = knex({ client: 'mysql2' })
    .queryBuilder()
    .from(PaymentRequest.tableName);

  const builder: any = {
    onBuild: (cb: any) => {
      cb(builder);
      return builder;
    },
    modify: (name: string, arg: any) => {
      (PaymentRequest.modifiers as any)[name](kb, arg);
      return builder;
    },
    where: (...args: any[]) => {
      kb.where(...(args as [any]));
      return builder;
    },
    orderBy: (...args: any[]) => {
      kb.orderBy(...(args as [any]));
      return builder;
    },
    limit: (count: number) => {
      kb.limit(count);
      return builder;
    },
    then: (resolve: any) => resolve([]),
  };
  const model = () => ({ query: () => builder });

  new GetPaymentRequestsService(model as any).getPaymentRequests(filter);

  return kb.toString();
};

describe('потолок выдачи', () => {
  it('список просит на одну строку больше потолка (С1 карты v49)', () => {
    // Без потолка список отдавал всё, что накопилось, а витрина рисовала
    // это одним куском — долгая загрузка и подвисший телефон.
    expect(sqlForFilter({})).toContain('limit 201');
  });
});

describe('поиск заявок на оплату', () => {
  it('ищет по назначению заявки', () => {
    expect(sqlForFilter({ keyword: 'аренда' })).toContain(
      "`description` like '%аренда%'",
    );
  });

  it('без запроса реестр не фильтруется поиском', () => {
    expect(sqlForFilter({})).not.toContain('like');
  });

  it('поиск не размывает фильтр по состоянию заявки', () => {
    const sql = sqlForFilter({ status: 'approved', keyword: 'аренда' });

    expect(sql).toMatch(/`status` = 'approved' and \(/);
  });
});
