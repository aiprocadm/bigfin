// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { ForbiddenException } from '@nestjs/common';

import { activeCode } from '../../../testing/activeCode';
import { GetLegalEntityAccessService } from './GetLegalEntityAccess.service';

/**
 * Разрешённые юрлица роли (этап 8 ТЗ, §8.4, остаток К6).
 *
 * ТЗ формулирует правило одной фразой: «бухгалтеру ИП видно только ИП,
 * владельцу — всё». Само правило отбора было написано и проверено давно, но
 * ЕГО НИКТО НЕ ЗВАЛ: хранить список было негде, спросить роль — неоткуда.
 * Возможность существовала на бумаге.
 *
 * Ошибка здесь — это показанные чужие деньги.
 */
const buildService = (allowed: number[] | null, userId: number | null = 7) => {
  const cls = { get: () => userId };

  const tenantUserModel = () => ({
    query: () => ({
      findOne: () => ({
        withGraphFetched: async () =>
          userId === null
            ? null
            : { id: userId, role: { allowedLegalEntityIds: allowed } },
      }),
    }),
  });

  return new GetLegalEntityAccessService(cls as any, tenantUserModel as any);
};

describe('какие юрлица видно пользователю', () => {
  it('роль без ограничений видит всё', () => {
    // Пусто значит «все». Владелец не должен ничего настраивать, чтобы
    // видеть свою же организацию целиком.
    return expect(buildService(null).allowedLegalEntityIds()).resolves.toEqual(
      [],
    );
  });

  it('роль с ограничением отдаёт свой список', () => {
    return expect(
      buildService([2, 3]).allowedLegalEntityIds(),
    ).resolves.toEqual([2, 3]);
  });

  it('без пользователя ограничений нет', () => {
    // Фоновые задачи и системные вызовы ходят без пользователя; запрещать им
    // всё значило бы сломать рассылки и пересчёты.
    return expect(
      buildService([2], null).allowedLegalEntityIds(),
    ).resolves.toEqual([]);
  });
});

describe('сужение отбора до разрешённого', () => {
  it('без ограничений запрос проходит как есть', async () => {
    await expect(buildService(null).narrowToAllowed([5])).resolves.toEqual([5]);
  });

  it('пустой запрос у ограниченной роли — это ЕЁ юрлица', async () => {
    // Важнее, чем кажется: «все юрлица» для ограниченного пользователя
    // означает «все ЕГО юрлица», а не все вообще.
    await expect(buildService([2, 3]).narrowToAllowed([])).resolves.toEqual([
      2, 3,
    ]);
  });

  it('свои юрлица отбираются', async () => {
    await expect(buildService([2, 3]).narrowToAllowed([3])).resolves.toEqual([
      3,
    ]);
  });

  it('чужое юрлицо — ОТКАЗ, а не пустой отчёт', async () => {
    // Молча вернуть пустоту значит сказать «у этого юрлица нет операций».
    // Человек поверит и будет неправ — это хуже честного «нельзя».
    await expect(buildService([2, 3]).narrowToAllowed([9])).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('смешанный запрос тоже отказ, а не тихое усечение', async () => {
    // Иначе человек увидел бы отчёт по одному юрлицу там, где просил два,
    // и не заметил подмены.
    await expect(buildService([2, 3]).narrowToAllowed([3, 9])).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('правило подключено во всех трёх отчётах', () => {
  const read = (file: string) =>
    activeCode(
      fs.readFileSync(path.resolve(__dirname, '../../FinancialStatements', file), 'utf-8'),
    );

  const CONTROLLERS = [
    ['Баланс', 'modules/BalanceSheet/BalanceSheet.controller.ts'],
    ['Прибыли и убытки', 'modules/ProfitLossSheet/ProfitLossSheet.controller.ts'],
    ['Движение денег', 'modules/CashFlowStatement/Cashflow.controller.ts'],
  ];

  CONTROLLERS.forEach(([name, file]) => {
    it(`${name}: сужает отбор до разрешённого`, () => {
      // Забытый отчёт не падает: он просто показывает чужие деньги.
      expect(read(file)).toContain('narrowToAllowed');
    });
  });
});

describe('выбор роли переживает сохранение', () => {
  const readRoles = (file: string) =>
    activeCode(
      fs.readFileSync(path.resolve(__dirname, '../../Roles', file), 'utf-8'),
    );

  it('роль знает о своих юрлицах', () => {
    expect(readRoles('models/Role.model.ts')).toContain(
      'allowedLegalEntityIds',
    );
  });

  it('список читается как список, а не как строка', () => {
    // MySQL отдаёт колонку JSON то массивом, то строкой. Прочитанная
    // строкой, она стала бы «списком из одного непонятного элемента» — и
    // роль потеряла бы доступ ко всем юрлицам сразу.
    expect(readRoles('models/Role.model.ts')).toContain('jsonAttributes');
  });

  it('и создание, и правка сохраняют выбор', () => {
    // Сохранить при создании и потерять при правке — обычная половинчатость:
    // человек настроил доступ, поправил название роли и остался без него.
    expect(readRoles('commands/CreateRole.service.ts')).toContain(
      'allowedLegalEntityIds',
    );
    expect(readRoles('commands/EditRole.service.ts')).toContain(
      'allowedLegalEntityIds',
    );
  });

  it('запрос принимает поле', () => {
    expect(readRoles('dtos/Role.dto.ts')).toContain('allowedLegalEntityIds');
  });
});
