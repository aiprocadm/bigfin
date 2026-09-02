import knex from 'knex';
import { GetPlannedOperationsService } from './GetPlannedOperations.service';
import { PlannedOperation } from '../models/PlannedOperation.model';

/**
 * Ш4 карты v48. Плановые операции ищутся по описанию.
 *
 * Самое рискованное место карты: у этого списка уже четыре фильтра —
 * направление, счёт и две границы дат. Поиск добавляется к ним, а не
 * вместо них, и «или» из поиска не должно размыть ни один.
 */
const sqlFor = (filter: any): string => {
  const kb = knex({ client: 'mysql2' })
    .queryBuilder()
    .from(PlannedOperation.tableName);

  const builder: any = {
    onBuild: (cb: any) => {
      cb(builder);
      return builder;
    },
    modify: (name: string, arg: any) => {
      (PlannedOperation.modifiers as any)[name](kb, arg);
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

  new GetPlannedOperationsService(model as any).getPlannedOperations(filter);

  return kb.toString();
};

describe('поиск плановых операций', () => {
  it('ищет по описанию операции', () => {
    expect(sqlFor({ keyword: 'аренда' })).toContain(
      "`description` like '%аренда%'",
    );
  });

  it('без запроса список не фильтруется поиском', () => {
    expect(sqlFor({})).not.toContain('like');
  });

  it('поиск не размывает фильтр по направлению', () => {
    const sql = sqlFor({ direction: 'outflow', keyword: 'аренда' });

    expect(sql).toMatch(/`direction` = 'outflow' and \(/);
  });

  it('поиск не размывает границы дат', () => {
    // Без скобок «или» из поиска утащило бы в выдачу операции за пределами
    // выбранного периода — человек увидел бы в календаре чужие месяцы.
    const sql = sqlFor({
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      keyword: 'аренда',
    });

    expect(sql).toContain("`plannedDate` >= '2026-09-01'");
    expect(sql).toContain("`plannedDate` <= '2026-09-30'");
    expect(sql).toMatch(/'2026-09-30' and \(/);
  });
});
