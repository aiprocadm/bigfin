// © 2026 Bigfin
import {
  ACCOUNT_GROUP_ERRORS,
  AccountGroupsService,
} from './AccountGroups.service';

/**
 * Группы денежных счетов (FIN-017 ТЗ-2).
 *
 * Главное правило здесь одно: УДАЛЕНИЕ ГРУППЫ НЕ УДАЛЯЕТ СЧЕТА. Человек,
 * убирающий кучку «Депозиты», хочет убрать кучку, а не депозиты; вместе со
 * счётом ушла бы вся его история операций, и восстановить её было бы нечем.
 */
type Row = Record<string, any>;

/** Подделка хранилища: настоящие вставки, правки и удаления в памяти. */
const makeStore = (groups: Row[], accounts: Row[]) => {
  const state = { groups: [...groups], accounts: [...accounts] };

  const table = (rows: () => Row[], replace: (next: Row[]) => void) => {
    const filters: Array<(row: Row) => boolean> = [];
    const api: any = {
      where: (column: string, value: any) => {
        filters.push((row) => row[column] === value);
        return api;
      },
      whereNot: (column: string, value: any) => {
        filters.push((row) => row[column] !== value);
        return api;
      },
      findById: (id: number) => {
        const found = rows().find((row) => row.id === id);
        return Promise.resolve(found) as any;
      },
      findOne: (column: string, value: any) => {
        const q: any = {
          onBuild: (apply: any) => {
            apply(api);
            const matched = rows().filter((row) =>
              filters.every((check) => check(row)),
            );
            return Promise.resolve(
              matched.find((row) => row[column] === value),
            );
          },
        };
        return q;
      },
      insertAndFetch: (values: Row) => {
        const row = { id: rows().length + 1, ...values };
        replace([...rows(), row]);
        return Promise.resolve(row);
      },
      patchAndFetchById: (id: number, values: Row) => {
        const next = rows().map((row) =>
          row.id === id ? { ...row, ...values } : row,
        );
        replace(next);
        return Promise.resolve(next.find((row) => row.id === id));
      },
      patch: (values: Row) => {
        const matched = rows().filter((row) =>
          filters.every((check) => check(row)),
        );
        replace(
          rows().map((row) =>
            matched.includes(row) ? { ...row, ...values } : row,
          ),
        );
        return Promise.resolve(matched.length);
      },
      deleteById: (id: number) => {
        replace(rows().filter((row) => row.id !== id));
        return Promise.resolve(1);
      },
      orderBy: () => Promise.resolve(rows()),
      then: (resolve: any) => resolve(rows()),
    };
    return api;
  };

  const groupModel = () => ({
    query: () =>
      table(
        () => state.groups,
        (next) => {
          state.groups = next;
        },
      ),
  });
  const accountModel = () => ({
    query: () =>
      table(
        () => state.accounts,
        (next) => {
          state.accounts = next;
        },
      ),
  });

  return { state, groupModel, accountModel };
};

const buildService = (groups: Row[], accounts: Row[]) => {
  const store = makeStore(groups, accounts);
  const service = new AccountGroupsService(
    store.groupModel as any,
    store.accountModel as any,
  );
  return { service, store };
};

const errorTypeOf = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error: any) {
    return error?.errorType ?? error?.message;
  }
  return 'ошибки не было';
};

describe('группы счетов', () => {
  it('считает, сколько счетов в каждой группе', () => {
    // Число нужно и списку, и подтверждению удаления: «перенести 2 счёта»
    // человек понимает, «удалить группу» — нет.
    const { service } = buildService(
      [{ id: 1, name: 'Операционные', sortOrder: 0 }],
      [
        { id: 10, name: 'Расчётный', accountGroupId: 1 },
        { id: 11, name: 'Касса', accountGroupId: 1 },
        { id: 12, name: 'Депозит', accountGroupId: null },
      ],
    );

    return service.getGroups().then((groups: any[]) => {
      expect(groups[0].accountsCount).toBe(2);
    });
  });

  describe('удаление группы', () => {
    it('НЕ УДАЛЯЕТ СЧЕТА — переносит их в «Нераспределённые»', async () => {
      const { service, store } = buildService(
        [{ id: 1, name: 'Депозиты', sortOrder: 0 }],
        [
          { id: 10, name: 'Вклад А', accountGroupId: 1 },
          { id: 11, name: 'Вклад Б', accountGroupId: 1 },
        ],
      );

      const result = await service.deleteGroup(1);

      expect(result.movedAccounts).toBe(2);
      expect(store.state.accounts).toHaveLength(2);
      expect(
        store.state.accounts.every((a) => a.accountGroupId === null),
      ).toBe(true);
      expect(store.state.groups).toEqual([]);
    });

    it('счета чужой группы не трогает', async () => {
      const { service, store } = buildService(
        [
          { id: 1, name: 'Депозиты', sortOrder: 0 },
          { id: 2, name: 'Личные', sortOrder: 1 },
        ],
        [
          { id: 10, name: 'Вклад', accountGroupId: 1 },
          { id: 11, name: 'Карта', accountGroupId: 2 },
        ],
      );

      await service.deleteGroup(1);

      expect(
        store.state.accounts.find((a) => a.id === 11)?.accountGroupId,
      ).toBe(2);
    });

    it('несуществующую группу удалить нельзя', async () => {
      const { service } = buildService([], []);

      expect(await errorTypeOf(() => service.deleteGroup(99))).toBe(
        ACCOUNT_GROUP_ERRORS.NOT_FOUND,
      );
    });
  });

  describe('перенос счёта', () => {
    it('счёт может быть ровно в ОДНОЙ группе', async () => {
      const { service, store } = buildService(
        [
          { id: 1, name: 'Операционные', sortOrder: 0 },
          { id: 2, name: 'Депозиты', sortOrder: 1 },
        ],
        [{ id: 10, name: 'Расчётный', accountGroupId: 1 }],
      );

      await service.assignAccount(10, 2);

      expect(store.state.accounts[0].accountGroupId).toBe(2);
    });

    it('пустая группа означает «вынуть из группы»', async () => {
      const { service, store } = buildService(
        [{ id: 1, name: 'Депозиты', sortOrder: 0 }],
        [{ id: 10, name: 'Вклад', accountGroupId: 1 }],
      );

      await service.assignAccount(10, null);

      expect(store.state.accounts[0].accountGroupId).toBeNull();
    });

    it('в несуществующую группу счёт не переносится', async () => {
      const { service } = buildService([], [{ id: 10, name: 'Вклад' }]);

      expect(await errorTypeOf(() => service.assignAccount(10, 99))).toBe(
        ACCOUNT_GROUP_ERRORS.NOT_FOUND,
      );
    });
  });

  describe('имя группы', () => {
    it('пустое имя отвергается', async () => {
      const { service } = buildService([], []);

      expect(await errorTypeOf(() => service.createGroup('   '))).toBe(
        ACCOUNT_GROUP_ERRORS.NAME_REQUIRED,
      );
    });

    it('слишком длинное имя отвергается', async () => {
      const { service } = buildService([], []);

      expect(await errorTypeOf(() => service.createGroup('я'.repeat(61)))).toBe(
        ACCOUNT_GROUP_ERRORS.NAME_REQUIRED,
      );
    });

    it('две группы с одним именем не заводятся', async () => {
      // Иначе в панели две одинаковые кучки, и человек кладёт счета в
      // разные, считая их одной.
      const { service } = buildService(
        [{ id: 1, name: 'Депозиты', sortOrder: 0 }],
        [],
      );

      expect(await errorTypeOf(() => service.createGroup('Депозиты'))).toBe(
        ACCOUNT_GROUP_ERRORS.NAME_EXISTS,
      );
    });

    it('пробелы по краям обрезаются', async () => {
      const { service, store } = buildService([], []);

      await service.createGroup('  Личные  ');

      expect(store.state.groups[0].name).toBe('Личные');
    });
  });
});
