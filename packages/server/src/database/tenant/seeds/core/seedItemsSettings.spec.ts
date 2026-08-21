import SeedSettings from './20200810121909_seed_items_settings';

// Фейковый knex: отдаёт счета по слагам из подготовленной карты и
// записывает то, что сид вставляет в settings.
const makeFakeKnex = (accountsBySlug: Record<string, { id: number }>) => {
  const inserted: any[] = [];

  const knex: any = (table: string) => {
    if (table === 'accounts') {
      let slug = '';
      return {
        where: (_col: string, value: string) => {
          slug = value;
          return {
            first: async () => accountsBySlug[slug],
          };
        },
      };
    }
    if (table === 'settings') {
      return {
        insert: async (rows: any[]) => {
          inserted.push(...rows);
          return rows;
        },
      };
    }
    throw new Error(`Неожиданная таблица: ${table}`);
  };
  return { knex, inserted };
};

describe('Сид настроек товара (префил счетов)', () => {
  it('кладёт три настройки, когда все счета-слаги существуют', async () => {
    const { knex, inserted } = makeFakeKnex({
      'cost-of-goods-sold': { id: 11 },
      'sales-of-product-income': { id: 22 },
      'inventory-asset': { id: 33 },
    });
    await new SeedSettings(knex).up(knex);

    expect(inserted).toHaveLength(3);
    expect(inserted.map((r) => r.value)).toEqual(
      expect.arrayContaining([11, 22, 33]),
    );
  });

  it('НЕ кладёт настройку с пустым значением, когда счёта-слага нет', async () => {
    // До фикса: сид клал { value: undefined } — префил формы товара молча
    // пропадал, и новичок видел пустые обязательные поля (линия 5 карты v17).
    const { knex, inserted } = makeFakeKnex({
      'cost-of-goods-sold': { id: 11 },
      // 'sales-of-product-income' отсутствует
      'inventory-asset': { id: 33 },
    });
    await new SeedSettings(knex).up(knex);

    expect(inserted.every((r) => r.value !== undefined && r.value !== null)).toBe(
      true,
    );
    expect(inserted).toHaveLength(2);
  });

  it('не падает, когда нет ни одного счёта-слага', async () => {
    const { knex, inserted } = makeFakeKnex({});
    await new SeedSettings(knex).up(knex);

    expect(inserted).toHaveLength(0);
  });
});
