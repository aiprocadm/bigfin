// © 2026 Bigfin
import { ProfitLossSheetService } from './ProfitLossSheetService';

/**
 * Два отчёта, заказанных ОДНОВРЕМЕННО, не мешают друг другу.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ. Главная за август показывала июльские
 * доходы: 183 333,33 там, где должен быть ноль. Плитка «за период» и
 * подпись «к прошлому периоду» совпадали до копейки, а изменение всегда
 * оказывалось пустым — и это выглядело как «сравнивать не с чем», а не
 * как ошибка.
 *
 * ПРИЧИНА. Хранилище отчёта держит период в своих полях, а служба —
 * одна на всё приложение. Главная зовёт отчёт дважды одновременно, второй
 * вызов переписывает период до того, как первый дочитает данные, и оба
 * получают один отчёт. На пустых данных подмена не видна: ноль равен нулю.
 *
 * Здесь воспроизводится именно эта гонка: хранилище-заглушка ведёт себя
 * как настоящее — помнит последний заданный период и отдаёт данные по
 * ПАМЯТИ, а не по переданному запросу.
 */
const buildService = () => {
  /** Хранилище с памятью — как настоящее. */
  const repository: any = {
    currentFromDate: null as string | null,
    setFilter(query: any) {
      repository.currentFromDate = query.fromDate;
    },
    async asyncInitialize() {
      // Пауза между «задали период» и «прочитали данные» — то самое окно,
      // в которое успевает влезть соседний вызов.
      await new Promise((resolve) => setTimeout(resolve, 10));
    },
  };

  const service: any = new ProfitLossSheetService(
    { meta: async () => ({ baseCurrency: 'RUB', dateFormat: 'DD.MM.YYYY' }) } as any,
    { emitAsync: async () => undefined } as any,
    { t: (key: string) => key } as any,
    repository,
    { accessible: async () => false } as any,
  );

  // Отчёт подменяем: здесь проверяется не арифметика, а то, ЗА КАКОЙ
  // период построен отчёт. Настоящий берёт период из хранилища — так же
  // поступает и заглушка.
  service.buildProfitLossSheet = async (query: any) => {
    repository.setFilter(query);
    await repository.asyncInitialize();

    return {
      query,
      data: [{ id: 'INCOME', name: 'Выручка', total: { amount: 0 } }],
      meta: { builtForFromDate: repository.currentFromDate } as any,
    };
  };

  return { service, repository };
};

describe('отчёт о прибылях и убытках: одновременные вызовы', () => {
  it('каждый вызов получает СВОЙ период', async () => {
    const { service } = buildService();

    const [august, july] = await Promise.all([
      service.profitLossSheet({ fromDate: '2026-08-01', toDate: '2026-08-31' }),
      service.profitLossSheet({ fromDate: '2026-07-01', toDate: '2026-07-31' }),
    ]);

    expect((august.meta as any).builtForFromDate).toBe('2026-08-01');
    expect((july.meta as any).builtForFromDate).toBe('2026-07-01');
  });

  it('заказанный период возвращается неизменным', async () => {
    const { service } = buildService();

    const [first, second] = await Promise.all([
      service.profitLossSheet({ fromDate: '2026-01-01', toDate: '2026-01-31' }),
      service.profitLossSheet({ fromDate: '2026-02-01', toDate: '2026-02-28' }),
    ]);

    expect(first.query.fromDate).toBe('2026-01-01');
    expect(second.query.fromDate).toBe('2026-02-01');
  });

  it('СБОЙ ОДНОГО ОТЧЁТА НЕ ЗАПИРАЕТ ОЧЕРЕДЬ', async () => {
    // Иначе одна ошибка останавливала бы отчёты до перезапуска сервера —
    // тихо и навсегда.
    const { service } = buildService();
    const good = service.buildProfitLossSheet;

    service.buildProfitLossSheet = async () => {
      throw new Error('отчёт не собрался');
    };
    await expect(
      service.profitLossSheet({ fromDate: '2026-03-01', toDate: '2026-03-31' }),
    ).rejects.toThrow('отчёт не собрался');

    service.buildProfitLossSheet = good;
    const after = await service.profitLossSheet({
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
    });

    expect(after.query.fromDate).toBe('2026-04-01');
  });

  it('проверка ловит ПРЕЖНЕЕ поведение', async () => {
    // Мутация: без очереди два одновременных вызова делят одно хранилище
    // и получают один период. Сторож, который этого не ловит, бесполезен.
    const { service, repository } = buildService();
    const withoutQueue = (query: any) => service.buildProfitLossSheet(query);

    const [august, july] = await Promise.all([
      withoutQueue({ fromDate: '2026-08-01', toDate: '2026-08-31' }),
      withoutQueue({ fromDate: '2026-07-01', toDate: '2026-07-31' }),
    ]);

    expect((august.meta as any).builtForFromDate).toBe(
      (july.meta as any).builtForFromDate,
    );
    expect(repository.currentFromDate).toBe('2026-07-01');
  });
});
