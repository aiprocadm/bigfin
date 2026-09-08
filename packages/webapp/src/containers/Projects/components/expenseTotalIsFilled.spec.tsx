import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Formik, useFormikContext } from 'formik';

import { FInputGroupComponent } from './FInputGroupComponent';

/**
 * Д2 карты v71. Итог расхода, который никогда не заполнялся.
 *
 * `FInputGroupComponent` перемножает два поля и по уходу из поля записывает
 * произведение в третье — имя которого приходит в `toField`.
 *
 * Свойства компонента не были объявлены, поэтому проверка типов считала
 * `toField` обязательным и ругалась на все четыре места использования. Но
 * молчал продукт: **ни одно из четырёх мест `toField` не передавало**, и
 * запись уходила в `setFieldValue(undefined, …)` — итог не заполнялся никогда.
 *
 * Хуже того, в окне плановых расходов компонент перемножал `expenseQuantity`
 * и `expenseUnitPrice`, а поля там называются `quantity` и `unitPrice`: даже
 * с правильным `toField` он записал бы `NaN`. Поэтому пара полей теперь
 * задаётся доводом `fromFields`.
 */
function ShowTotal() {
  const { values } = useFormikContext<any>();
  return <div data-testid="total">{String(values.expenseTotal)}</div>;
}

const renderWith = (fromFields: [string, string], values: Record<string, any>) =>
  render(
    <Formik initialValues={{ ...values, expenseTotal: 0 }} onSubmit={() => {}}>
      <>
        <FInputGroupComponent
          name={fromFields[0]}
          toField={'expenseTotal'}
          fromFields={fromFields}
        />
        <ShowTotal />
      </>
    </Formik>,
  );

describe('итог расхода заполняется', () => {
  it('перемножает поля формы расхода проекта', async () => {
    renderWith(['expenseQuantity', 'expenseUnitPrice'], {
      expenseQuantity: 3,
      expenseUnitPrice: 4,
    });

    fireEvent.focusOut(screen.getByRole('textbox'));

    expect(await screen.findByTestId('total')).toHaveTextContent('12');
  });

  it('перемножает поля окна плановых расходов — у них другие имена', async () => {
    renderWith(['quantity', 'unitPrice'], { quantity: 5, unitPrice: 6 });

    fireEvent.focusOut(screen.getByRole('textbox'));

    expect(await screen.findByTestId('total')).toHaveTextContent('30');
  });

  it('не пишет NaN, если одно из полей пустое', async () => {
    renderWith(['quantity', 'unitPrice'], { quantity: 5 });

    fireEvent.focusOut(screen.getByRole('textbox'));

    expect(await screen.findByTestId('total')).toHaveTextContent('0');
  });
});
