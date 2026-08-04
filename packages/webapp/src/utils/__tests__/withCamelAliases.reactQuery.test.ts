import { describe, it, expect } from 'vitest';
import { QueryClient } from 'react-query';
import { withCamelAliases } from '../withCamelAliases';

/**
 * react-query переиспользует ссылки на неизменившиеся куски данных
 * (structural sharing) и при этом пересобирает объекты. Псевдонимы обязаны это
 * пережить — иначе всё лечение работало бы только до первого обновления кэша.
 */
const fetchLike = (payload: any) => withCamelAliases(JSON.parse(JSON.stringify(payload)));

const serverResponse = {
  receivable: {
    overdue_total: 100000,
    contacts: [{ contact_id: 1, contact_name: 'ООО «Ромашка»' }],
  },
  net: 160000,
};

describe('псевдонимы и кэш запросов', () => {
  it('переживают запись в кэш', async () => {
    const client = new QueryClient();

    await client.prefetchQuery(['debts'], () => fetchLike(serverResponse));
    const cached: any = client.getQueryData(['debts']);

    expect(cached.receivable.overdueTotal).toBe(100000);
    expect(cached.receivable.contacts[0].contactName).toBe('ООО «Ромашка»');
  });

  it('переживают повторную загрузку тех же данных', async () => {
    const client = new QueryClient();

    await client.prefetchQuery(['debts'], () => fetchLike(serverResponse));
    // Второй раз приходит идентичный ответ — здесь и включается переиспользование.
    await client.refetchQueries(['debts']);
    client.setQueryData(['debts'], () => fetchLike(serverResponse));

    const cached: any = client.getQueryData(['debts']);
    expect(cached.receivable.overdueTotal).toBe(100000);
    expect(cached.receivable.contacts[0].contactId).toBe(1);
  });

  it('переживают частичное изменение данных', async () => {
    const client = new QueryClient();

    await client.prefetchQuery(['debts'], () => fetchLike(serverResponse));
    client.setQueryData(['debts'], () =>
      fetchLike({
        ...serverResponse,
        receivable: { ...serverResponse.receivable, overdue_total: 50000 },
      }),
    );

    const cached: any = client.getQueryData(['debts']);
    expect(cached.receivable.overdueTotal).toBe(50000);
    // Не изменившаяся ветка тоже обязана сохранить псевдонимы.
    expect(cached.receivable.contacts[0].contactName).toBe('ООО «Ромашка»');
  });
});
