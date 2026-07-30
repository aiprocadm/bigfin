import { ImportCommerceMlService } from './ImportCommerceMl.service';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.05">
  <Каталог>
    <Товары>
      <Товар>
        <Ид>item-1</Ид>
        <Артикул>ART-1</Артикул>
        <Наименование>Стул</Наименование>
      </Товар>
    </Товары>
  </Каталог>
  <Контрагенты>
    <Контрагент>
      <Ид>c-1</Ид>
      <Наименование>ООО Ромашка</Наименование>
      <ИНН>7707083893</ИНН>
    </Контрагент>
  </Контрагенты>
</КоммерческаяИнформация>`;

/** Заглушки моделей: связи и поиск сущностей по ИНН/артикулу. */
function makeDeps(options: {
  links?: any[];
  items?: any[];
  contacts?: any[];
} = {}) {
  const links = [...(options.links ?? [])];
  const items = [...(options.items ?? [])];
  const contacts = [...(options.contacts ?? [])];

  const query = (rows: any[], onInsert?: (data: any) => any) => ({
    findOne: (where: any) =>
      Promise.resolve(
        rows.find((r) =>
          Object.entries(where).every(([k, v]) => r[k] === v),
        ) ?? undefined,
      ),
    insert: (data: any) => {
      const row = { id: rows.length + 1, ...data };
      rows.push(row);
      onInsert?.(row);
      return Promise.resolve(row);
    },
    patch: () => Promise.resolve(1),
    findById: (id: number) => ({
      patch: (attrs: any) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, attrs);
        return Promise.resolve(1);
      },
    }),
  });

  const linkModel = () => ({ query: () => query(links) });
  const itemModel = () => ({ query: () => query(items) });
  const contactModel = () => ({ query: () => query(contacts) });

  const createItem = {
    createItem: jest.fn(async (dto: any) => {
      const row = { id: items.length + 100, ...dto };
      items.push(row);
      return row.id;
    }),
  };
  const createCustomer = {
    createCustomer: jest.fn(async (dto: any) => {
      const row = { id: contacts.length + 200, ...dto };
      contacts.push(row);
      return row;
    }),
  };
  const uow = {
    withTransaction: (fn: any) => fn({} as any),
  };

  const service = new ImportCommerceMlService(
    uow as any,
    linkModel as any,
    itemModel as any,
    contactModel as any,
    createItem as any,
    createCustomer as any,
  );
  return { service, links, items, contacts, createItem, createCustomer };
}

describe('ImportCommerceMlService.preview', () => {
  it('показывает, что будет создано, ничего не записывая', async () => {
    const { service, createItem, createCustomer, links } = makeDeps();

    const report = await service.preview(Buffer.from(XML, 'utf8'));

    expect(report.items).toMatchObject({ toCreate: 1, toUpdate: 0 });
    expect(report.contacts).toMatchObject({ toCreate: 1, toUpdate: 0 });
    expect(createItem.createItem).not.toHaveBeenCalled();
    expect(createCustomer.createCustomer).not.toHaveBeenCalled();
    expect(links).toHaveLength(0);
  });

  it('учитывает уже связанные записи как обновление', async () => {
    const { service } = makeDeps({
      links: [
        { id: 1, entityType: 'item', externalId: 'item-1', entityId: 5 },
      ],
      items: [{ id: 5, name: 'Старое имя' }],
    });

    const report = await service.preview(Buffer.from(XML, 'utf8'));

    expect(report.items).toMatchObject({ toCreate: 0, toUpdate: 1 });
  });
});

describe('ImportCommerceMlService.import', () => {
  it('создаёт товар и контрагента и заводит связи', async () => {
    const { service, createItem, createCustomer, links } = makeDeps();

    const report = await service.import(Buffer.from(XML, 'utf8'));

    expect(report.items.created).toBe(1);
    expect(report.contacts.created).toBe(1);
    expect(createItem.createItem).toHaveBeenCalledTimes(1);
    expect(createCustomer.createCustomer).toHaveBeenCalledTimes(1);

    // Товар из справочника — без счетов: они неизвестны из выгрузки.
    const itemDto = createItem.createItem.mock.calls[0][0];
    expect(itemDto).toMatchObject({
      name: 'Стул',
      code: 'ART-1',
      type: 'service',
      sellable: false,
      purchasable: false,
    });
    expect(links).toHaveLength(2);
  });

  it('повторный импорт того же файла обновляет, а не задваивает', async () => {
    const deps = makeDeps();
    await deps.service.import(Buffer.from(XML, 'utf8'));
    const report = await deps.service.import(Buffer.from(XML, 'utf8'));

    expect(report.items.created).toBe(0);
    expect(report.items.updated).toBe(1);
    expect(deps.createItem.createItem).toHaveBeenCalledTimes(1);
    expect(deps.links).toHaveLength(2);
  });

  it('подхватывает существующего контрагента по ИНН вместо дубликата', async () => {
    const { service, createCustomer, links } = makeDeps({
      contacts: [{ id: 42, inn: '7707083893', displayName: 'Ромашка' }],
    });

    const report = await service.import(Buffer.from(XML, 'utf8'));

    expect(createCustomer.createCustomer).not.toHaveBeenCalled();
    expect(report.contacts.updated).toBe(1);
    expect(
      links.find((l) => l.entityType === 'contact')?.entityId,
    ).toBe(42);
  });

  it('на битом XML бросает понятную ошибку', async () => {
    const { service } = makeDeps();

    await expect(
      service.import(Buffer.from('<a><b></a>', 'utf8')),
    ).rejects.toThrow();
  });
});
