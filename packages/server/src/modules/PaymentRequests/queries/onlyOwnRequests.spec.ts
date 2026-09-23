// © 2026 Bigfin
import knex from 'knex';
import { createMongoAbility } from '@casl/ability';
import { GetPaymentRequestsService } from './GetPaymentRequests.service';
import { GetPaymentRequestService } from './GetPaymentRequest.service';
import { PaymentRequest } from '../models/PaymentRequest.model';
import { onlyOwnRequests } from '../PaymentRequests.controller';
import { AbilitySchema } from '@/modules/Roles/AbilitySchema';
import { AbilitySubject, PaymentRequestAction } from '@/modules/Roles/Roles.types';

/**
 * FT-083 ТЗ-3: заявки на оплату «только свои».
 *
 * Сотрудник без права «видеть заявки всех сотрудников» видит в реестре только
 * заявки, которые завёл сам, и чужую не откроет даже по прямой ссылке.
 */
const tenancy = (id: number | null) => ({ getSystemUser: async () => (id ? { id } : null) });

async function listSql(onlyOwn: boolean, userId: number | null = 7): Promise<string> {
  const kb = knex({ client: 'mysql2' }).queryBuilder().from(PaymentRequest.tableName);
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
  await new GetPaymentRequestsService(model as any, tenancy(userId) as any).getPaymentRequests({} as any, onlyOwn);
  return kb.toString();
}

function card(createdBy: number, userId: number) {
  const row = { id: 5, createdBy };
  const query: any = { findById: () => query, withGraphFetched: async () => row };
  const model = () => ({ query: () => query });
  return new GetPaymentRequestService(model as any, tenancy(userId) as any);
}

describe('заявки «только свои»', () => {
  it('без права — реестр отфильтрован по автору в самом запросе', async () => {
    expect(await listSql(true)).toContain('`createdBy` = 7');
    expect(await listSql(false)).not.toContain('createdBy');
  });

  it('неизвестный пользователь не видит ничего, а не всё', async () => {
    expect(await listSql(true, null)).toContain('`createdBy` = -1');
  });

  it('чужая заявка по ссылке — «не найдена», своя — открывается', async () => {
    await expect(card(8, 7).getPaymentRequest(5, true)).rejects.toMatchObject({
      errorType: 'PAYMENT_REQUEST_NOT_FOUND',
    });
    await expect(card(7, 7).getPaymentRequest(5, true)).resolves.toMatchObject({ id: 5 });
    await expect(card(8, 7).getPaymentRequest(5, false)).resolves.toMatchObject({ id: 5 });
  });

  it('кто видит всё: владелец и роль с правом; сотрудник — только своё', () => {
    const viewAll = { action: PaymentRequestAction.ViewAll, subject: AbilitySubject.PaymentRequest };
    expect(onlyOwnRequests({ ability: createMongoAbility([{ action: 'manage', subject: 'all' }]) })).toBe(false);
    expect(onlyOwnRequests({ ability: createMongoAbility([viewAll]) })).toBe(false);
    expect(onlyOwnRequests({ ability: createMongoAbility([]) })).toBe(true);
    expect(onlyOwnRequests({})).toBe(true);
  });

  it('право выдаётся в форме роли', () => {
    const subject = AbilitySchema.find((s) => s.subject === AbilitySubject.PaymentRequest);
    expect(subject?.extraAbilities?.map((a) => a.key)).toEqual([PaymentRequestAction.ViewAll]);
  });
});
