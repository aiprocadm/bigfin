// © 2026 Bigfin
import {
  isIntercompanyReference,
  isIntercompanyTransfer,
  shouldExcludeIntercompany,
} from './intercompany';

/**
 * Этап 7 ТЗ, §7.2. Внутригрупповые обороты.
 *
 * Ошибиться тут можно в обе стороны, и обе ошибки молчаливые:
 * — исключили лишнее → консолидированный отчёт потерял настоящую выручку;
 * — не исключили нужное → отчёт завысил и выручку, и расходы.
 *
 * Вторая ошибка заметна (оборот виден в отчёте «Внутригрупповые обороты»),
 * первая — нет. Поэтому при незнании выбираем вторую.
 */

describe('isIntercompanyTransfer — перевод между юрлицами', () => {
  it('перевод между разными юрлицами — внутригрупповой', () => {
    expect(isIntercompanyTransfer(1, 2)).toBe(true);
  });

  it('перевод внутри одного юрлица — обычный', () => {
    // Со счёта на счёт той же фирмы: для группы ничего не изменилось,
    // но и исключать нечего — дохода тут и так нет.
    expect(isIntercompanyTransfer(1, 1)).toBe(false);
  });

  it('НЕИЗВЕСТНОЕ юрлицо не считается «другим»', () => {
    // Колонка юрлица заполняется отдельной задачей, и до неё у счетов
    // стоит пусто. Трактовать пустоту как «другое юрлицо» значит объявить
    // внутригрупповым КАЖДЫЙ перевод и потерять настоящую выручку.
    expect(isIntercompanyTransfer(null, 2)).toBe(false);
    expect(isIntercompanyTransfer(1, null)).toBe(false);
    expect(isIntercompanyTransfer(null, null)).toBe(false);
    expect(isIntercompanyTransfer(undefined, undefined)).toBe(false);
  });

  it('номер юрлица строкой сравнивается как число', () => {
    // База может отдать строку; «1» и 1 — одно юрлицо.
    expect(isIntercompanyTransfer(1, '1' as any)).toBe(false);
  });
});

describe('isIntercompanyReference — операция целиком', () => {
  const leg = (accountId: number, legalEntityId: number | null) => ({
    accountId,
    legalEntityId,
  });

  it('ноги в разных юрлицах — операция внутригрупповая', () => {
    expect(isIntercompanyReference([leg(1, 10), leg(2, 20)])).toBe(true);
  });

  it('ноги в одном юрлице — обычная операция', () => {
    expect(isIntercompanyReference([leg(1, 10), leg(2, 10)])).toBe(false);
  });

  it('хоть одна нога без юрлица — не знаем, значит не исключаем', () => {
    expect(isIntercompanyReference([leg(1, 10), leg(2, null)])).toBe(false);
  });

  it('одна нога внутригрупповой быть не может', () => {
    // Перемещения между юрлицами не произошло.
    expect(isIntercompanyReference([leg(1, 10)])).toBe(false);
  });

  it('пустая операция не роняет расчёт', () => {
    expect(isIntercompanyReference([])).toBe(false);
    expect(isIntercompanyReference(undefined as any)).toBe(false);
  });

  it('три ноги в двух юрлицах — внутригрупповая', () => {
    expect(
      isIntercompanyReference([leg(1, 10), leg(2, 10), leg(3, 20)]),
    ).toBe(true);
  });
});

describe('shouldExcludeIntercompany — когда исключать', () => {
  it('режим «все юрлица» — исключаем', () => {
    // Для группы это перекладывание из кармана в карман.
    expect(shouldExcludeIntercompany([])).toBe(true);
    expect(shouldExcludeIntercompany(undefined)).toBe(true);
    expect(shouldExcludeIntercompany(null)).toBe(true);
  });

  it('одно юрлицо — НЕ исключаем', () => {
    // Для этого юрлица перевод соседу — настоящий расход, а приход
    // от соседа — настоящий доход.
    expect(shouldExcludeIntercompany([7])).toBe(false);
  });

  it('произвольный набор из нескольких — исключаем', () => {
    // «Только ООО, без ИП» — тоже консолидация, просто по части группы.
    expect(shouldExcludeIntercompany([1, 2])).toBe(true);
  });
});
