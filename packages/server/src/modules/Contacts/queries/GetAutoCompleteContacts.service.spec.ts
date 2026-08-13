// © 2026 Bigfin
import { GetAutoCompleteContactsService } from './GetAutoCompleteContacts.service';

/**
 * Подсказка контрагентов отдаёт только доверенную сторону (шаг В3 карты v9):
 * роль «только поставщики» не должна видеть покупателей с их долгами.
 */
const buildService = () => {
  const calls: Record<string, any[][]> = { where: [], whereIn: [], limit: [] };

  const builder = {
    where: (...args: any[]) => calls.where.push(args),
    whereIn: (...args: any[]) => calls.whereIn.push(args),
    limit: (...args: any[]) => calls.limit.push(args),
  };

  const contactModel = () => ({
    query: () => ({
      onBuild: async (cb: (b: typeof builder) => void) => {
        cb(builder);
        return [{ id: 1 }];
      },
    }),
  });

  const service = new GetAutoCompleteContactsService(contactModel as any);

  return { service, calls };
};

describe('подсказка контрагентов', () => {
  it('роли с одной стороной выдача сужается до неё', async () => {
    const { service, calls } = buildService();

    await service.autocompleteContacts({} as any, ['vendor']);

    expect(calls.whereIn).toEqual([['contactService', ['vendor']]]);
  });

  it('роли с обеими сторонами видны обе', async () => {
    const { service, calls } = buildService();

    await service.autocompleteContacts({} as any, ['customer', 'vendor']);

    expect(calls.whereIn).toEqual([['contactService', ['customer', 'vendor']]]);
  });

  it('без единого права выдача пуста и запрос не делается', async () => {
    const { service, calls } = buildService();

    const result = await service.autocompleteContacts({} as any, []);

    expect(result).toEqual([]);
    expect(calls.whereIn).toEqual([]);
  });
});
