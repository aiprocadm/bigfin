import { ForeignKeyViolationError } from 'objection';
import { ForeignKeyViolationFilter } from './foreign-key-violation.filter';

/**
 * С1 срез 2 (карта v14): падение по внешнему ключу БД не должно уходить
 * пользователю голым 500 — это всегда «запись связана с другими данными»
 * (при удалении) или «ссылка на несуществующую запись» (при записи).
 */
describe('ForeignKeyViolationFilter', () => {
  const build = (method: string) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host: any = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method }),
      }),
    };
    return { host, status, json };
  };
  const error = Object.create(ForeignKeyViolationError.prototype);

  it('удаление: 409 с кодом «есть связанные данные»', () => {
    const { host, status, json } = build('DELETE');
    new ForeignKeyViolationFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].errors[0].type).toBe('MODEL_HAS_RELATIONS');
  });

  it('запись: 409 с кодом «битая ссылка»', () => {
    const { host, status, json } = build('POST');
    new ForeignKeyViolationFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].errors[0].type).toBe('FOREIGN_KEY_VIOLATION');
  });
});
