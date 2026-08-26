import SeedNotificationPreferences from './20260825120000_seed_notification_preferences';
import { NOTIFICATION_EVENTS } from '@/modules/Notifications/constants';

/**
 * Г1 карты v20 + починка, найденная живой пробой Н1 карты v22.
 *
 * Сид заводил правила, передавая только `event_type` и `enabled`, и
 * полагался на значение по умолчанию у колонки `channels`. В миграции оно
 * прописано (`defaultTo('["email"]')`), но **MariaDB и MySQL не принимают
 * значения по умолчанию для колонок типа TEXT** — молча игнорируют. В итоге
 * вставка падала:
 *
 *   ER_NO_DEFAULT_FOR_FIELD: Field 'CHANNELS' doesn't have a default value
 *
 * А поскольку сиды выполняются при сборке организации, ломалось не
 * уведомление, а СОЗДАНИЕ НОВОЙ ОРГАНИЗАЦИИ целиком: с 25 августа ни одна
 * новая организация собраться не могла. Живая проба на существующей
 * организации этого не видела — там сиды уже отработали раньше.
 *
 * Отсюда правило: сид не полагается на умолчания колонок, а пишет значения
 * явно.
 */
describe('сид правил уведомлений', () => {
  const captureInsert = () => {
    const captured: any = { rows: null };
    const knex: any = (table: string) => ({
      insert: (rows: any) => {
        captured.table = table;
        captured.rows = rows;
        return Promise.resolve();
      },
    });
    return { knex, captured };
  };

  it('заводит правило на каждое событие продукта', async () => {
    const { knex, captured } = captureInsert();

    await new SeedNotificationPreferences(knex).up(knex);

    expect(captured.table).toBe('notification_preferences');
    expect(captured.rows.map((row: any) => row.event_type)).toEqual([
      ...NOTIFICATION_EVENTS,
    ]);
  });

  it('каждое правило включено сразу', async () => {
    const { knex, captured } = captureInsert();

    await new SeedNotificationPreferences(knex).up(knex);

    expect(captured.rows.every((row: any) => row.enabled === true)).toBe(true);
  });

  it('каналы записываются явно — умолчания колонки TEXT в MySQL не работают', async () => {
    const { knex, captured } = captureInsert();

    await new SeedNotificationPreferences(knex).up(knex);

    for (const row of captured.rows) {
      expect(typeof row.channels).toBe('string');
      expect(JSON.parse(row.channels)).toEqual(['email']);
    }
  });
});
