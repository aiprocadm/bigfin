// © 2026 Bigfin
import { Transformer } from './Transformer';

/**
 * Д1 карты v30. Раз валюту передали — это деньги, знак печатается.
 *
 * Общий помощник всех трансформеров глушил знак валюты по умолчанию:
 *
 *   protected formatNumber(number, props?) {
 *     return formatNumber(number, { money: false, ...props });
 *   }
 *
 * Общая утилита продукта печатает суммы СО знаком, а помощник его снимал —
 * и каждый трансформер обязан был вспомнить про `money: true` руками.
 * Вспомнили 16 раз, забыли 91. Отсюда «25 000,00» на экране расходов
 * рядом с «31 500,00 ₽» на экране счетов покупателям.
 *
 * Отчёты это не задевает: они форматируют суммы вообще без валюты
 * (`FinancialSheet.getAmountMeta`), а знак ставят отдельно на итогах.
 */
const NBSP = ' ';

/** Наследник ради доступа к защищённому помощнику — как у настоящих. */
class ПробныйТрансформер extends Transformer {
  public рубли(value: number) {
    return this.formatNumber(value, { currencyCode: 'RUB' });
  }
  public безВалюты(value: number) {
    return this.formatNumber(value);
  }
  public явноБезЗнака(value: number) {
    return this.formatNumber(value, { currencyCode: 'RUB', money: false });
  }
  public явноСоЗнаком(value: number) {
    return this.formatNumber(value, { currencyCode: 'RUB', money: true });
  }
}

describe('знак валюты в трансформерах', () => {
  const t = new ПробныйТрансформер();

  it('валюта передана — печатаем со знаком', () => {
    expect(t.рубли(25000)).toBe(`25${NBSP}000,00${NBSP}₽`);
  });

  it('валюты нет — печатаем голое число (количества, курсы)', () => {
    expect(t.безВалюты(3)).toBe('3.00');
  });

  it('явное «без знака» сильнее умолчания', () => {
    expect(t.явноБезЗнака(25000)).toBe(`25${NBSP}000,00`);
  });

  it('явное «со знаком» продолжает работать', () => {
    expect(t.явноСоЗнаком(25000)).toBe(`25${NBSP}000,00${NBSP}₽`);
  });
});
