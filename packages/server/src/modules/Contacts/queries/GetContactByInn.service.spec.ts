import { GetContactByInnService } from './GetContactByInn.service';

describe('GetContactByInnService', () => {
  /**
   * Строим минимальный мок модели:
   * contactModel — функция, возвращающая объект с .query().findOne().
   */
  function makeModel(findOneResult: unknown) {
    return () => ({
      query: () => ({
        findOne: jest.fn().mockResolvedValue(findOneResult),
      }),
    });
  }

  it('возвращает undefined без запроса к БД, если inn пустая строка', async () => {
    const findOne = jest.fn();
    const model = () => ({ query: () => ({ findOne }) });
    const service = new GetContactByInnService(model as any);

    const result = await service.getByInn('');

    expect(result).toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('возвращает контрагента, если он найден по ИНН', async () => {
    const contact = { id: 42, inn: '7701234567', displayName: 'ООО Ромашка' };
    const model = makeModel(contact);
    const service = new GetContactByInnService(model as any);

    const result = await service.getByInn('7701234567');

    expect(result).toEqual(contact);
  });

  it('вызывает findOne с правильным фильтром', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const model = () => ({ query: () => ({ findOne }) });
    const service = new GetContactByInnService(model as any);

    await service.getByInn('7701234567');

    expect(findOne).toHaveBeenCalledWith({ inn: '7701234567' });
  });

  it('возвращает undefined, если контрагент не найден', async () => {
    const model = makeModel(undefined);
    const service = new GetContactByInnService(model as any);

    const result = await service.getByInn('0000000000');

    expect(result).toBeUndefined();
  });
});
