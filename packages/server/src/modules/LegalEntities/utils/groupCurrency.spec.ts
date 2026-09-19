// © 2026 Bigfin
import { describeGroupCurrency } from './groupCurrency';

/**
 * Валюта группы (§7.4, остаток К4).
 *
 * Ошибка здесь тихая в обе стороны: объявить многовалютной обычную группу —
 * значит навесить лишнюю подпись на каждый отчёт у всех; не объявить
 * настоящую — значит показать сводную цифру, про которую непонятно, в чём она.
 */
describe('валюта группы', () => {
  it('одна валюта у всех — подписи не нужно', () => {
    const meta = describeGroupCurrency('RUB', [
      { baseCurrency: 'RUB' },
      { baseCurrency: 'RUB' },
    ]);

    expect(meta.isMultiCurrency).toBe(false);
    expect(meta.groupCurrency).toBe('RUB');
    expect(meta.currencies).toEqual(['RUB']);
  });

  it('юрлицо с другой валютой — подпись нужна', () => {
    const meta = describeGroupCurrency('RUB', [
      { baseCurrency: 'RUB' },
      { baseCurrency: 'KZT' },
    ]);

    expect(meta.isMultiCurrency).toBe(true);
    expect(meta.currencies).toEqual(['RUB', 'KZT']);
  });

  it('ПУСТАЯ валюта юрлица — это «как у группы», а не «другая»', () => {
    // Колонка появилась позже самих юрлиц, и у заведённых раньше она пуста.
    // Считать пустое за другую валюту значило бы объявить многовалютной
    // каждую вторую группу.
    const meta = describeGroupCurrency('RUB', [
      { baseCurrency: null },
      { baseCurrency: '' },
      { baseCurrency: undefined },
    ]);

    expect(meta.isMultiCurrency).toBe(false);
  });

  it('регистр не создаёт второй валюты', () => {
    // «rub» и «RUB» — одна валюта. Иначе подпись вылезет на ровном месте.
    const meta = describeGroupCurrency('RUB', [{ baseCurrency: 'rub' }]);

    expect(meta.isMultiCurrency).toBe(false);
    expect(meta.currencies).toEqual(['RUB']);
  });

  it('совсем нет юрлиц — валюта группы всё равно известна', () => {
    const meta = describeGroupCurrency('RUB', []);

    expect(meta.groupCurrency).toBe('RUB');
    expect(meta.isMultiCurrency).toBe(false);
  });

  it('пустой список не ломает подсчёт', () => {
    expect(describeGroupCurrency('RUB', null).isMultiCurrency).toBe(false);
    expect(describeGroupCurrency('RUB', undefined).currencies).toEqual(['RUB']);
  });

  it('валюта группы всегда первая в списке', () => {
    // Порядок — не косметика: первая валюта и есть та, в которой построен
    // отчёт, и подпись берёт её.
    const meta = describeGroupCurrency('RUB', [
      { baseCurrency: 'KZT' },
      { baseCurrency: 'RUB' },
    ]);

    expect(meta.currencies[0]).toBe('RUB');
  });
});
