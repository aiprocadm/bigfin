// © 2026 Bigfin
import { NotificationEvaluationProcessor } from './NotificationEvaluation.processor';

/**
 * У1 карты v27. Свежий повтор события заменяет прежнюю запись ленты.
 *
 * Ежедневный обход заводит НОВУЮ запись по тому же событию, как только
 * пройдёт срок «не повторять чаще». Для писем это правильно, но лента
 * показывала каждый суточный повтор отдельной непрочитанной строкой — у
 * демо-организации бейдж дорос до «33», хотя содержательно разных новостей
 * было три.
 *
 * Правило: перед вставкой нового уведомления прежние записи с тем же
 * dedupKey помечаются вытесненными (supersededAt), и лента их больше не
 * показывает. История срабатываний при этом остаётся — по ней считается
 * срок «не повторять чаще».
 */

const candidate = {
  eventType: 'overdue',
  dedupKey: 'overdue',
  title: 'overdue.title',
  body: 'overdue.body',
  payload: { count: 1 },
};

function makeProcessor() {
  // Порядок обращений к таблице уведомлений: вытеснение должно случиться
  // ДО вставки, иначе свежая запись вытеснит сама себя.
  const calls: string[] = [];
  const supersedeSpy = jest.fn();
  const insertSpy = jest.fn();

  const notifQuery = () => ({
    // Выборка недавних срабатываний для срока «не повторять чаще».
    whereIn: () => ({
      orderBy: () => Promise.resolve([]),
    }),
    // Вытеснение прежних записей события.
    where: (column: string, value: string) => ({
      whereNull: (nullColumn: string) => ({
        patch: (patchArg: Record<string, unknown>) => {
          calls.push('supersede');
          supersedeSpy(column, value, nullColumn, patchArg);
          return Promise.resolve(1);
        },
      }),
    }),
    insertAndFetch: (row: Record<string, unknown>) => {
      calls.push('insert');
      insertSpy(row);
      return Promise.resolve({ id: 7, ...row });
    },
    findById: () => ({ patch: () => Promise.resolve(1) }),
  });

  const processor = new NotificationEvaluationProcessor(
    // ClsService: UseCls оборачивает process() в cls.run.
    {
      set: jest.fn(),
      get: jest.fn(),
      run: (...args: any[]) => args[args.length - 1](),
    } as any,
    { accessible: jest.fn().mockResolvedValue(true) } as any,
    { get: jest.fn().mockResolvedValue({ cooldownHours: 24 }) } as any,
    { evaluate: jest.fn().mockResolvedValue([]) } as any, // cashGap
    { evaluate: jest.fn().mockResolvedValue([]) } as any, // lowBalance
    { evaluate: jest.fn().mockResolvedValue([candidate]) } as any, // overdue
    { evaluate: jest.fn().mockResolvedValue([]) } as any, // taxDue
    {
      key: 'email',
      isConfigured: jest.fn().mockResolvedValue(false),
      deliver: jest.fn(),
    } as any,
    {
      key: 'telegram',
      isConfigured: jest.fn().mockResolvedValue(false),
      deliver: jest.fn(),
    } as any,
    (() => ({
      query: () => ({
        where: () =>
          Promise.resolve([
            { eventType: 'overdue', threshold: null, channels: null },
          ]),
      }),
    })) as any,
    (() => ({ query: notifQuery })) as any,
  );

  return { processor, calls, supersedeSpy, insertSpy };
}

describe('вытеснение прежних записей ленты', () => {
  it('перед вставкой прежние записи события помечаются вытесненными', async () => {
    const { processor, calls, supersedeSpy } = makeProcessor();

    const result = await processor.process({
      data: { organizationId: 'org-1' },
    } as any);

    expect(result).toEqual({ posted: 1 });
    expect(supersedeSpy).toHaveBeenCalledWith(
      'dedupKey',
      'overdue',
      'supersededAt',
      { supersededAt: expect.any(String) },
    );
    expect(calls).toEqual(['supersede', 'insert']);
  });
});
