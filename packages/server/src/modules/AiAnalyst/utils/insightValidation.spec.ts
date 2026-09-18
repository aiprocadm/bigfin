// © 2026 Bigfin
import {
  MAX_INSIGHT_LENGTH,
  checkInsight,
  collectKnownNumbers,
  extractNumbers,
  selectInsights,
} from './insightValidation';

/**
 * Этап 13 ТЗ, §13.1 п. 1 и §13.4: «Модель не считает цифры» и «Ни одно число
 * в тексте не расходится с отчётом».
 *
 * Беда не в том, что модель ошибётся, а в том, что НЕВЕРНОЕ ЧИСЛО ВЫГЛЯДИТ
 * ТОЧНО ТАК ЖЕ, как верное.
 */
const data = {
  rows: [
    { label: 'Закупки', amount: 2_800_000, previousAmount: 1_000_000 },
    { label: 'Розница', amount: -180_000 },
  ],
  share: 0.64,
};

describe('extractNumbers', () => {
  it('понимает разделители разрядов', () => {
    // «2 800 000 ₽» — это одно число, а не три.
    expect(extractNumbers('Закупки выросли до 2 800 000 ₽')).toEqual([
      2_800_000,
    ]);
  });

  it('понимает неразрывный пробел', () => {
    // Текст из отчёта приходит именно с ним.
    expect(extractNumbers('Сумма 1 500 000 ₽')).toEqual([1_500_000]);
  });

  it('понимает запятую как дробную часть', () => {
    expect(extractNumbers('выросли в 2,8 раза')).toEqual([2.8]);
  });

  it('понимает минус длинным тире', () => {
    // Отчёты печатают минус тире, и «−180 000» должно читаться как минус.
    expect(extractNumbers('убыток −180 000 ₽')).toEqual([-180_000]);
  });

  it('понимает проценты', () => {
    expect(extractNumbers('доля 64% выручки')).toEqual([64]);
  });
});

describe('collectKnownNumbers', () => {
  it('собирает числа из глубины', () => {
    const known = collectKnownNumbers(data);

    expect(known).toContain(2_800_000);
    expect(known).toContain(-180_000);
  });

  it('доля 0,64 считается тем же, что 64%', () => {
    // Иначе нормальная фраза «64% выручки» была бы отбракована.
    expect(collectKnownNumbers({ share: 0.64 })).toContain(64);
  });
});

describe('checkInsight', () => {
  const known = collectKnownNumbers(data);
  const link = '/financial-reports/profit-loss-sheet';

  it('наблюдение по нашим числам принимается', () => {
    const result = checkInsight(
      { text: 'Направление «Розница» убыточно: −180 000 ₽ за квартал.', link },
      known,
    );

    expect(result.rejection).toBeNull();
  });

  it('ВЫДУМАННОЕ число отбраковывает наблюдение', () => {
    // Главная защита этапа: модель охотно сложит две суммы в уме и ошибётся,
    // а человек примет решение по цифре, которой нет ни в одном отчёте.
    const result = checkInsight(
      { text: 'Выручка составила 7 350 000 ₽.', link },
      known,
    );

    expect(result.rejection).toBe('number_not_in_data');
    expect(result.unknownNumbers).toEqual([7_350_000]);
  });

  it('округление в тексте допустимо', () => {
    // Агрегат 2 800 000 человек читает как «2,79 млн» — требовать точного
    // совпадения значило бы выбрасывать все живые формулировки.
    const result = checkInsight(
      { text: 'Закупки выросли до 2 790 000 ₽.', link },
      known,
    );

    expect(result.rejection).toBeNull();
  });

  it('отклонение больше допуска отбраковывается', () => {
    // 5% — это уже другое число, а не округление.
    const result = checkInsight(
      { text: 'Закупки выросли до 2 940 000 ₽.', link },
      known,
    );

    expect(result.rejection).toBe('number_not_in_data');
  });

  it('мелкие числа речи не сверяются', () => {
    // «третий месяц» и «в 2 раза» — это не утверждения о суммах.
    const result = checkInsight(
      { text: 'Направление «Розница» третий месяц убыточно: −180 000 ₽.', link },
      known,
    );

    expect(result.rejection).toBeNull();
  });

  it('наблюдение без ссылки не проходит', () => {
    // §13.1 п. 3: каждый вывод кликабелен. Непроверяемое утверждение
    // о деньгах хуже молчания.
    const result = checkInsight(
      { text: 'Закупки выросли до 2 800 000 ₽.', link: null },
      known,
    );

    expect(result.rejection).toBe('no_link');
  });

  it('пустое наблюдение не проходит', () => {
    expect(checkInsight({ text: '   ', link }, known).rejection).toBe('empty');
  });

  it('слишком длинное наблюдение не проходит', () => {
    // Это уже не наблюдение, а сочинение.
    const result = checkInsight(
      { text: 'а'.repeat(MAX_INSIGHT_LENGTH + 1), link },
      known,
    );

    expect(result.rejection).toBe('too_long');
  });
});

describe('selectInsights', () => {
  const link = '/financial-reports/profit-loss-sheet';

  it('выдуманное выбрасывается, верное остаётся', () => {
    const { accepted, rejected } = selectInsights(
      [
        { text: 'Закупки: 2 800 000 ₽.', link },
        { text: 'Выручка: 9 999 999 ₽.', link },
        { text: 'Розница: −180 000 ₽.', link },
      ],
      data,
    );

    expect(accepted.map((i) => i.text)).toEqual([
      'Закупки: 2 800 000 ₽.',
      'Розница: −180 000 ₽.',
    ]);
    expect(rejected).toHaveLength(1);
  });

  it('недобор НЕ добирается выброшенными', () => {
    // Иначе в отчёт вернулись бы ровно те выводы, которые мы признали
    // недостоверными, — лишь бы набрать количество.
    const { accepted } = selectInsights(
      [
        { text: 'Выдумка: 9 999 999 ₽.', link },
        { text: 'Ещё выдумка: 8 888 888 ₽.', link },
        { text: 'Закупки: 2 800 000 ₽.', link },
      ],
      data,
    );

    expect(accepted).toHaveLength(1);
  });

  it('больше пяти не показываем', () => {
    // §13.3: 3–5 наблюдений.
    const many = Array.from({ length: 9 }, () => ({
      text: 'Закупки: 2 800 000 ₽.',
      link,
    }));

    expect(selectInsights(many, data).accepted).toHaveLength(5);
  });

  it('пустой список не роняет разбор', () => {
    expect(selectInsights([], data).accepted).toEqual([]);
    expect(selectInsights(null as any, data).accepted).toEqual([]);
  });
});
