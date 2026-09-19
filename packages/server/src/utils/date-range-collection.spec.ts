// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../testing/activeCode';
import {
  dateRangeCollection,
  dateRangeFromToCollection,
} from './date-range-collection';

/**
 * Шаг по периодам не должен зацикливаться.
 *
 * ПОЧЕМУ ЭТО ВАЖНЕЕ ВСЕГО ОСТАЛЬНОГО В ЭТОМ ФАЙЛЕ. `moment` НЕ РУГАЕТСЯ на
 * неизвестную единицу времени — он молча ничего не делает: `add` возвращает ту
 * же дату, `startOf` и `endOf` её не двигают. Условие выхода из цикла тогда не
 * выполняется никогда.
 *
 * Итог: цикл крутится вечно, складывая записи в список, пока не кончится
 * память — и падает ВЕСЬ СЕРВЕР, а не один запрос.
 *
 * Так и было. На главной странице у запроса отчёта стояло
 * `displayColumnsBy: 'date_periods'` вместо `'month'`. Главный экран продукта
 * убивал сервер сообщением «JavaScript heap out of memory», и найти это можно
 * было только замером времени ответа: ни один тест сюда не заглядывал, а
 * запрос просто «долго думал».
 */
describe('шаг по периодам', () => {
  it('месяцы разбиваются по месяцам', () => {
    const periods = dateRangeFromToCollection(
      '2026-01-01',
      '2026-03-31',
      'month',
    );

    expect(periods).toHaveLength(3);
    expect(periods[0].fromDate).toBe('2026-01-01');
    expect(periods[2].toDate).toBe('2026-03-31');
  });

  it('дни разбиваются по дням', () => {
    const periods = dateRangeFromToCollection(
      '2026-01-01',
      '2026-01-05',
      'day',
    );

    expect(periods).toHaveLength(5);
  });

  it('годы разбиваются по годам', () => {
    expect(
      dateRangeCollection('2024-01-01', '2026-12-31', 'year'),
    ).toHaveLength(3);
  });

  describe('неизвестная единица времени', () => {
    it('не вешает сервер, а сразу говорит об ошибке', () => {
      // Главная проверка файла. Без неё — вечный цикл и смерть процесса.
      expect(() =>
        dateRangeFromToCollection(
          '2026-01-01',
          '2026-12-31',
          'date_periods' as any,
        ),
      ).toThrow(/не двигает/);
    });

    it('то же самое у второго помощника', () => {
      expect(() =>
        dateRangeCollection('2026-01-01', '2026-12-31', 'date_periods' as any),
      ).toThrow(/не двигает/);
    });

    it('в сообщении названы ожидаемые единицы', () => {
      // Человек, увидевший отказ, должен сразу понять, что писать вместо.
      expect(() =>
        dateRangeCollection('2026-01-01', '2026-12-31', 'нечто' as any),
      ).toThrow(/month/);
    });
  });

  it('главная страница просит разрез по месяцам', () => {
    // Ровно та опечатка, что убивала сервер.
    //
    // Читаем исходник БЕЗ КОММЕНТАРИЕВ: в пояснении к правке ошибочное
    // значение названо дословно, и проверка «такого текста нет в файле»
    // спотыкалась о собственное объяснение.
    const source = activeCode(
      fs.readFileSync(
        path.resolve(
          __dirname,
          '../modules/Dashboard/queries/GetDashboardOverview.service.ts',
        ),
        'utf-8',
      ),
    );

    expect(source).toContain("displayColumnsBy: 'month'");
    expect(source).not.toContain("displayColumnsBy: 'date_periods'");
  });
});
