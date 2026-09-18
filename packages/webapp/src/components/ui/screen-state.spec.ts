// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { pickScreenState } from './screen-state';

/**
 * Этап 5 ТЗ, §5.3. Четыре обязательных состояния экрана.
 *
 * Порядок выбора — не мелочь: перепутанный порядок даёт экран, который врёт
 * про данные, а выглядит совершенно обычно.
 */
describe('pickScreenState', () => {
  it('загрузка важнее ошибки', () => {
    // Пока идёт повторный запрос, показывать старую ошибку — значит
    // утверждать, что всё по-прежнему сломано, хотя мы проверяем обратное.
    // Человек жмёт «Повторить» и не понимает, сработало ли.
    expect(pickScreenState({ isLoading: true, isError: true })).toBe(
      'loading',
    );
  });

  it('ошибка важнее пустоты', () => {
    // Пустой экран говорит «здесь ничего нет» — это утверждение о данных.
    // При ошибке мы про данные ничего не знаем.
    expect(pickScreenState({ isError: true, isEmpty: true })).toBe('error');
  });

  it('пустота показывается, когда данных действительно нет', () => {
    expect(pickScreenState({ isEmpty: true })).toBe('empty');
  });

  it('обычный экран — состояние «данные»', () => {
    expect(pickScreenState({})).toBe('data');
  });

  it('все флаги сразу — показываем загрузку', () => {
    expect(
      pickScreenState({ isLoading: true, isError: true, isEmpty: true }),
    ).toBe('loading');
  });
});
