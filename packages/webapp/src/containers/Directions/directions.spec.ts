import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import {
  canDeleteDirection,
  DIRECTION_STATUS,
  isDirectionActive,
  shouldShowDirectionBreakdown,
  type ProjectRow,
} from './directionView';

/**
 * Справочник направлений (проектов).
 *
 * ЗАЧЕМ ОН ПОЯВИЛСЯ. Поля «Проект» стояли в формах операций с самого начала,
 * колонка `project_id` была у проводок — а заводить направления было НЕГДЕ:
 * серверных ручек не существовало ни одной. Поля всегда оставались пустыми.
 *
 * ЧЕМ НАПРАВЛЕНИЕ НЕ ЯВЛЯЕТСЯ. Не проектом с задачами, сроками и часами:
 * этим в Bigfin заняты «Сделки». Направление — ярлык для раскладки денег.
 */
const direction = (over: Partial<ProjectRow> = {}): ProjectRow => ({
  id: 1,
  name: 'Розница',
  status: DIRECTION_STATUS.ACTIVE,
  contactId: null,
  deadline: null,
  costEstimate: null,
  transactionsCount: 0,
  ...over,
});

describe('состояние направления', () => {
  it('обычное направление действует', () => {
    expect(isDirectionActive(direction())).toBe(true);
  });

  it('убранное не предлагается', () => {
    expect(
      isDirectionActive(direction({ status: DIRECTION_STATUS.ARCHIVED })),
    ).toBe(false);
  });

  it('пустой статус считается действующим', () => {
    // Направления, заведённые до появления статуса, не должны молча
    // исчезнуть из выбора.
    expect(isDirectionActive(direction({ status: '' }))).toBe(true);
  });
});

describe('удаление направления', () => {
  it('без операций удалить можно', () => {
    expect(canDeleteDirection(direction())).toBe(true);
  });

  it('с операциями — нельзя', () => {
    // Прошлые операции остались бы со ссылкой в никуда: отчёт по
    // направлению показал бы пустоту, а деньги были потрачены.
    expect(canDeleteDirection(direction({ transactionsCount: 3 }))).toBe(false);
  });

  it('кнопка прячется там, где сервер откажет', () => {
    // Предлагать действие, которое не выполнится, хуже, чем не предлагать.
    const page = activeCode(
      fs.readFileSync(path.join(__dirname, 'DirectionsPage.tsx'), 'utf8'),
    );

    expect(page).toContain('canDeleteDirection(direction)');
  });
});

describe('правило «не навязывать»', () => {
  it('одно направление — разрез не показывается', () => {
    expect(shouldShowDirectionBreakdown([direction()])).toBe(false);
  });

  it('два — показывается', () => {
    expect(
      shouldShowDirectionBreakdown([direction(), direction({ id: 2 })]),
    ).toBe(true);
  });

  it('убранное направление не считается', () => {
    expect(
      shouldShowDirectionBreakdown([
        direction(),
        direction({ id: 2, status: DIRECTION_STATUS.ARCHIVED }),
      ]),
    ).toBe(false);
  });
});

describe('экран справочника', () => {
  const page = activeCode(
    fs.readFileSync(path.join(__dirname, 'DirectionsPage.tsx'), 'utf8'),
  );

  it('полей в форме ровно два', () => {
    // Лишние поля — это вопросы, на которые предприниматель не знает
    // ответа и которые всё равно останутся пустыми.
    const fields = page.split('<FormField').length - 1;

    expect(fields).toBe(2);
  });

  it('пустой справочник объясняет, что делать', () => {
    // Пустой экран без слов читается как поломка.
    expect(page).toContain('directions.empty');
  });

  it('есть состояния загрузки и ошибки', () => {
    expect(page).toContain('<Skeleton');
    expect(page).toContain('<ScreenError');
  });

  it('проверка и правда читает экран', () => {
    expect(page.length).toBeGreaterThan(2000);
  });
});
