import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Accordion } from './accordion';
import { InsetGroup, InsetRow } from './inset-group';
import { RadioGroup } from './radio-group';
import { ToggleGroup } from './toggle-group';

describe('RadioGroup', () => {
  const options = [
    { value: 'cash', label: 'По деньгам', description: 'когда деньги пришли' },
    { value: 'accrual', label: 'По начислению' },
  ];

  it('группа радиокнопок, выбранная отмечена, стрелка двигает выбор', () => {
    const onChange = vi.fn();
    render(<RadioGroup aria-label="Как считать" options={options} value="cash" onChange={onChange} />);

    expect(screen.getByRole('radio', { name: /По деньгам/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(screen.getByRole('radiogroup', { name: 'Как считать' }), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('accrual');
  });
});

describe('Accordion', () => {
  const items = [
    { id: 'a', title: 'Реквизиты', content: 'ИНН' },
    { id: 'b', title: 'Банк', content: 'БИК' },
  ];

  it('заголовок — кнопка с aria-expanded; одиночный режим закрывает прежний раздел', () => {
    render(<Accordion items={items} defaultOpen={['a']} />);
    const first = screen.getByRole('button', { name: 'Реквизиты' });
    const second = screen.getByRole('button', { name: 'Банк' });

    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Реквизиты' })).toBeVisible();
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('множественный режим держит открытыми несколько', () => {
    render(<Accordion items={items} type="multiple" />);
    fireEvent.click(screen.getByRole('button', { name: 'Реквизиты' }));
    fireEvent.click(screen.getByRole('button', { name: 'Банк' }));

    expect(screen.getByRole('button', { name: 'Реквизиты' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Банк' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('ToggleGroup', () => {
  it('кнопки с aria-pressed включаются и выключаются независимо', () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup
        aria-label="Вид"
        options={[
          { value: 'percent', label: 'Доля от итога' },
          { value: 'empty', label: 'Пустые строки' },
        ]}
        value={['percent']}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Доля от итога' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Пустые строки' }));
    expect(onChange).toHaveBeenCalledWith(['percent', 'empty']);
    fireEvent.click(screen.getByRole('button', { name: 'Доля от итога' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});

describe('InsetGroup', () => {
  it('раздел с заголовком, подпись связана с полем', () => {
    render(
      <InsetGroup title="Организация" footer="Печатается в счёте">
        <InsetRow label="ИНН" htmlFor="inn">
          <input id="inn" />
        </InsetRow>
      </InsetGroup>,
    );

    expect(screen.getByRole('region', { name: 'Организация' })).toBeInTheDocument();
    expect(screen.getByLabelText('ИНН')).toBeInTheDocument();
    expect(screen.getByText('Печатается в счёте')).toBeInTheDocument();
  });
});
