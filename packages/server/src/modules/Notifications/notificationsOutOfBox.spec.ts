// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { NOTIFICATION_EVENTS } from './constants';

/**
 * Г1 карты v20: продукт должен предупреждать сам.
 *
 * Одного включения модуля мало: ежедневный обход берёт правила из таблицы
 * организации, а она создавалась пустой — и уведомления молчали бы всё
 * равно. Поэтому новая организация получает три правила сразу.
 */
const SEED = path.resolve(
  __dirname,
  '../../database/tenant/seeds/core/20260825120000_seed_notification_preferences.ts',
);

describe('уведомления из коробки', () => {
  const seed = fs.readFileSync(SEED, 'utf8');

  it('сид заводит правила для всех событий, какие умеет продукт', () => {
    // Список берётся из констант, а не переписывается руками: новое
    // событие не должно молча остаться без правила.
    expect(seed).toContain('NOTIFICATION_EVENTS');
    expect(seed).toContain("knex('notification_preferences')");
    expect(NOTIFICATION_EVENTS).toEqual(
      expect.arrayContaining(['overdue', 'low_balance', 'cash_gap']),
    );
  });

  it('правила заводятся включёнными — иначе обход их пропустит', () => {
    // Обход отбирает строки по `enabled = true`.
    expect(seed).toMatch(/enabled:\s*true/);
  });

  it('канал доставки не переопределяется — письма без адреса не уходят', () => {
    // В схеме таблицы канал по умолчанию «email», а он считается
    // ненастроенным, пока владелец не укажет адрес получателя. Задавать
    // канал в сиде значило бы обещать доставку, которой нет.
    expect(seed).not.toContain('channels');
  });

  it('пороги не задаются — у каждого правила есть своё разумное значение', () => {
    expect(seed).not.toContain('threshold');
  });
});
