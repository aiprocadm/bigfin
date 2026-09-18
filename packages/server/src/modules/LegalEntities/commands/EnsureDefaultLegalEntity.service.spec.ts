// © 2026 Bigfin
import { EnsureDefaultLegalEntityService } from './EnsureDefaultLegalEntity.service';

/**
 * Этап 6 ТЗ, §6.3 шаг 2. Юрлицо по умолчанию создаётся ЛЕНИВО и ОДИН РАЗ.
 *
 * Ленивый сидер по определению вызывается часто — при каждом открытии
 * справочника, из разных вкладок. Неидемпотентность здесь означала бы
 * справочник из десятка одинаковых «Моя компания», а за ними разъехавшийся
 * разрез по юрлицу.
 */
const buildService = (options: {
  primary?: any;
  any?: any;
  metadata?: any;
  onInsert?: (draft: any) => void;
}) => {
  const inserted: any[] = [];

  const legalEntityModel = () => ({
    query: () => {
      const chain: any = {
        where: (column: string, value: any) => {
          chain.filtered = { column, value };
          return chain;
        },
        orderBy: () => chain,
        first: async () =>
          chain.filtered?.column === 'isPrimary'
            ? options.primary ?? null
            : options.any ?? null,
        insertAndFetch: async (draft: any) => {
          options.onInsert?.(draft);
          inserted.push(draft);
          return { id: 1, ...draft };
        },
      };
      return chain;
    },
  });

  const tenancyContext = {
    getTenantMetadata: async () => options.metadata ?? {},
  };

  const service = new EnsureDefaultLegalEntityService(
    tenancyContext as any,
    legalEntityModel as any,
  );

  return { service, inserted };
};

describe('EnsureDefaultLegalEntityService', () => {
  it('создаёт юрлицо из реквизитов организации, когда справочник пуст', async () => {
    const { service, inserted } = buildService({
      metadata: {
        name: 'Ромашка',
        inn: '7701234567',
        legalForm: 'ООО',
        taxRegime: 'УСН_Д',
      },
    });

    const result = await service.ensure();

    expect(inserted.length).toBe(1);
    expect(result).toMatchObject({
      name: 'Ромашка',
      inn: '7701234567',
      isPrimary: true,
      ownershipShare: 100,
    });
  });

  it('второй вызов ничего не создаёт', async () => {
    // Справочник открывают часто и из разных вкладок.
    const { service, inserted } = buildService({
      primary: { id: 7, name: 'Ромашка', isPrimary: true },
    });

    const result = await service.ensure();

    expect(inserted.length).toBe(0);
    expect(result).toMatchObject({ id: 7 });
  });

  it('не заводит второе юрлицо, если головное сняли руками', async () => {
    // Головного нет, но справочник не пуст — добавлять «по умолчанию»
    // поверх заведённых юрлиц нельзя.
    const { service, inserted } = buildService({
      primary: null,
      any: { id: 3, name: 'Ромашка', isPrimary: false },
    });

    const result = await service.ensure();

    expect(inserted.length).toBe(0);
    expect(result).toMatchObject({ id: 3 });
  });

  it('пустые реквизиты организации не роняют создание', async () => {
    // Организацию могли завести и не заполнить ничего, кроме названия.
    const { service, inserted } = buildService({ metadata: null });

    const result = await service.ensure();

    expect(inserted.length).toBe(1);
    expect(result.inn).toBeNull();
    expect(result.isPrimary).toBe(true);
  });
});
