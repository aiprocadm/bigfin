import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Combobox } from './combobox';

const items = [
  { value: 'RUB', label: 'Российский рубль' },
  { value: 'USD', label: 'Доллар США' },
  { value: 'EUR', label: 'Евро' },
];

describe('Combobox', () => {
  it('показывает label выбранного значения на триггере', () => {
    render(<Combobox items={items} value="USD" onChange={() => {}} placeholder="—" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Доллар США');
  });

  it('фильтрует список по вводу и вызывает onChange при выборе', async () => {
    const onChange = vi.fn();
    render(
      <Combobox
        items={items}
        value=""
        onChange={onChange}
        placeholder="—"
        searchPlaceholder="Поиск"
        emptyText="Пусто"
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(await screen.findByPlaceholderText('Поиск'), {
      target: { value: 'евр' },
    });
    expect(screen.queryByText('Доллар США')).toBeNull();
    fireEvent.click(screen.getByText('Евро'));
    expect(onChange).toHaveBeenCalledWith('EUR');
  });

  it('показывает emptyText, когда нет совпадений', async () => {
    render(
      <Combobox
        items={items}
        value=""
        onChange={() => {}}
        placeholder="—"
        searchPlaceholder="Поиск"
        emptyText="Пусто"
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(await screen.findByPlaceholderText('Поиск'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText('Пусто')).toBeInTheDocument();
  });
});
