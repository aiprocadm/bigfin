// © 2026 Bigfin
import {
  BULK_APPLY_CONFIDENCE,
  computeAccuracy,
  countBulkApplicable,
} from './accuracy';

/**
 * Этап 12 ТЗ, §12.2. Счётчик точности и массовое применение.
 */
describe('computeAccuracy', () => {
  it('считает долю принятых подсказок', () => {
    const records = [
      ...Array.from({ length: 218 }, () => ({ accepted: true })),
      ...Array.from({ length: 22 }, () => ({ accepted: false })),
    ];

    expect(computeAccuracy(records)).toEqual({
      suggested: 240,
      accepted: 218,
      rate: 0.91,
    });
  });

  it('ноль предложений — это НЕ точность 0%', () => {
    // Ноль процентов читается как «подсказки всегда неверны», а на деле
    // их просто не было: нечего принимать и нечего отвергать.
    expect(computeAccuracy([])).toEqual({
      suggested: 0,
      accepted: 0,
      rate: null,
    });
  });

  it('все отвергнуты — это настоящие 0%', () => {
    // Здесь ноль осмыслен: подсказки были и все мимо.
    expect(computeAccuracy([{ accepted: false }]).rate).toBe(0);
  });
});

describe('countBulkApplicable', () => {
  it('считает подсказки выше порога массового применения', () => {
    // Кнопка обязана называть количество: «применить 2 подсказки»
    // человек нажимает осознанно, а «применить все» — нет.
    const count = countBulkApplicable([
      { confidence: 0.95 },
      { confidence: 0.91 },
      { confidence: 0.8 },
      null,
    ]);

    expect(count).toBe(2);
  });

  it('ровно порог не считается «выше порога»', () => {
    expect(countBulkApplicable([{ confidence: BULK_APPLY_CONFIDENCE }])).toBe(
      0,
    );
  });

  it('порог именно такой, как требует ТЗ', () => {
    expect(BULK_APPLY_CONFIDENCE).toBe(0.9);
  });

  it('пустой список не роняет счёт', () => {
    expect(countBulkApplicable([])).toBe(0);
  });
});
