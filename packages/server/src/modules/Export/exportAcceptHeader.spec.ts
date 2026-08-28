// © 2026 Bigfin
import { ExportController } from './Export.controller';

/**
 * Н2 карты v35. Выгрузка отвечает осмысленно на любой заголовок.
 *
 * Контроллер читал заголовок, не проверив его:
 *
 *   if (acceptHeader.includes(AcceptType.ApplicationCsv)) { … }
 *
 * Витрина шлёт `application/xlsx` и получает файл. А запрос без заголовка
 * ронял ответ пятисотой («Cannot read properties of undefined»), запрос с
 * «звёздочка/звёздочка» (обычная ссылка в браузере) отдавала 200 с
 * ПУСТЫМ телом.
 *
 * Соседний контроллер баланса от этого защищён (`acceptHeader || ''`) —
 * здесь защиты не было.
 */
const ФАЙЛ = Buffer.from('содержимое выгрузки');

function makeController() {
  const exportResource = jest.fn().mockResolvedValue(ФАЙЛ);
  const controller = new ExportController(
    { export: exportResource } as any,
    { exportAll: jest.fn() } as any,
  );

  const headers: Record<string, unknown> = {};
  const res = {
    setHeader: (k: string, v: unknown) => {
      headers[k] = v;
    },
    set: (obj: Record<string, unknown>) => Object.assign(headers, obj),
    send: jest.fn(),
  };
  return { controller, res, headers, send: res.send };
}

describe('выгрузка и заголовок запроса', () => {
  it('витрина просит xlsx — отдаём файл', async () => {
    const { controller, res, headers, send } = makeController();

    await controller.export({ resource: 'Account' } as any, res as any, 'application/xlsx');

    expect(send).toHaveBeenCalledWith(ФАЙЛ);
    expect(String(headers['Content-Type'])).toContain('spreadsheetml');
  });

  it('заголовка нет — отдаём файл, а не пятисотую', async () => {
    const { controller, res, send } = makeController();

    await expect(
      controller.export({ resource: 'Account' } as any, res as any, undefined as any),
    ).resolves.not.toThrow();
    expect(send).toHaveBeenCalledWith(ФАЙЛ);
  });

  it('обычная ссылка из браузера получает файл, а не пустоту', async () => {
    const { controller, res, headers, send } = makeController();

    await controller.export({ resource: 'Account' } as any, res as any, '*/*');

    expect(send).toHaveBeenCalledWith(ФАЙЛ);
    expect(headers['Content-Disposition']).toBeDefined();
  });

  it('csv просят — отдаём csv', async () => {
    const { controller, res, headers } = makeController();

    await controller.export({ resource: 'Account' } as any, res as any, 'application/csv');

    expect(String(headers['Content-Type'])).toContain('csv');
  });
});
