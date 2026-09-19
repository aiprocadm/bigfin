// © 2026 Bigfin
import { GetIntercompanyTurnoverService } from './GetIntercompanyTurnover.service';

/**
 * Этап 7 ТЗ, §7.2 п. 5. Отчёт «Внутригрупповые обороты».
 *
 * Он делает исключение таких оборотов ПРОВЕРЯЕМЫМ: без него человек видит,
 * что сводная выручка меньше суммы выручек юрлиц, и не может убедиться, что
 * разница именно та.
 */
const buildService = (options: {
  legs?: any[];
  entities?: any[];
  hasColumn?: boolean;
}) => {
  const knex: any = () => {
    const chain: any = {
      select: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: async () => options.legs ?? [],
    };
    return chain;
  };
  // Наличие колонки спрашивают запросом к `information_schema`, а не через
  // `schema.hasColumn` — подделка повторяет настоящий способ.
  knex.raw = async () => [[{ count: (options.hasColumn ?? true) ? 1 : 0 }]];

  const legalEntityModel = () => ({
    query: async () => options.entities ?? [],
  });

  return new GetIntercompanyTurnoverService(
    (() => knex) as any,
    legalEntityModel as any,
  );
};

const entities = [
  { id: 1, name: 'ООО Ромашка' },
  { id: 2, name: 'ИП Иванов' },
];

/**
 * ВАЖНО ПРО ИМЕНА В ПОДДЕЛКЕ. Строки здесь отдаются в ВЕРБЛЮЖЬЕМ виде —
 * ровно так, как их возвращает настоящий knex: отображение
 * `knexSnakeCaseMappers` переводит `LEGAL_ENTITY_ID` в `legalEntityId`.
 *
 * Сначала подделка отдавала змеиные имена, и тесты были зелёными, пока
 * отчёт на живой базе показывал бессмыслицу: ключ группировки получался
 * «undefined:undefined». Подделка, говорящая не на языке базы, не стережёт
 * ничего — она лишь повторяет ошибку кода.
 */
describe('GetIntercompanyTurnoverService', () => {
  it('складывает ноги в строку «кто кому»', async () => {
    const service = buildService({
      entities,
      legs: [
        {
          referenceType: 'Transfer',
          referenceId: 5,
          date: '2026-03-10',
          legalEntityId: 1,
          credit: 500000,
          debit: 0,
        },
        {
          referenceType: 'Transfer',
          referenceId: 5,
          date: '2026-03-10',
          legalEntityId: 2,
          credit: 0,
          debit: 500000,
        },
      ],
    });

    const result = await service.getTurnover('2026-01-01', '2026-12-31');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      fromLegalEntityId: 1,
      fromLegalEntityName: 'ООО Ромашка',
      toLegalEntityId: 2,
      toLegalEntityName: 'ИП Иванов',
      amount: 500000,
    });
  });

  it('сумма перевода не удваивается', async () => {
    // Обе ноги одной операции равны: сложить их значит показать
    // перевод вдвое больше настоящего.
    const service = buildService({
      entities,
      legs: [
        {
          referenceType: 'Transfer',
          referenceId: 5,
          date: '2026-03-10',
          legalEntityId: 1,
          credit: 500000,
          debit: 0,
        },
        {
          referenceType: 'Transfer',
          referenceId: 5,
          date: '2026-03-10',
          legalEntityId: 2,
          credit: 0,
          debit: 500000,
        },
      ],
    });

    const result = await service.getTurnover('2026-01-01', '2026-12-31');

    expect(result.total).toBe(500000);
  });

  it('разные операции — разные строки', async () => {
    const service = buildService({
      entities,
      legs: [
        {
          referenceType: 'Transfer',
          referenceId: 5,
          date: '2026-03-10',
          legalEntityId: 1,
          credit: 100,
          debit: 0,
        },
        {
          referenceType: 'Transfer',
          referenceId: 6,
          date: '2026-03-11',
          legalEntityId: 2,
          credit: 0,
          debit: 200,
        },
      ],
    });

    const result = await service.getTurnover('2026-01-01', '2026-12-31');

    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(300);
  });

  it('без колонки признака отчёт пустой, а не сломанный', async () => {
    // Миграция могла ещё не доехать до этой базы.
    const service = buildService({ hasColumn: false });

    const result = await service.getTurnover('2026-01-01', '2026-12-31');

    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('неизвестное юрлицо не роняет строку', async () => {
    // Колонка юрлица заполняется отдельной задачей.
    const service = buildService({
      entities,
      legs: [
        {
          referenceType: 'Transfer',
          referenceId: 7,
          date: '2026-03-10',
          legalEntityId: null,
          credit: 100,
          debit: 0,
        },
      ],
    });

    const result = await service.getTurnover('2026-01-01', '2026-12-31');

    expect(result.rows[0].fromLegalEntityName).toBeNull();
    expect(result.total).toBe(100);
  });
});
