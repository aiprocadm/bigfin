import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, vars?: { count?: number }) =>
      ({
        'filter_bar.button': 'Фильтры',
        'filter_bar.button_count': `Фильтры (${vars?.count})`,
        'filter_bar.title': 'Фильтры',
        'filter_bar.reset': 'Сбросить',
        'filter_bar.done': 'Готово',
        close: 'Закрыть',
      })[key] ?? key,
  },
}));

import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  it('главное — в строке, остальное — по кнопке в шторке', () => {
    render(
      <FilterBar filters={<label>Статья</label>}>
        <input aria-label="Поиск" />
      </FilterBar>,
    );

    expect(screen.getByLabelText('Поиск')).toBeInTheDocument();
    expect(screen.queryByText('Статья')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
    expect(screen.getByText('Статья')).toBeInTheDocument();
  });

  it('число включённых отборов на кнопке и «Сбросить» в шторке', () => {
    const onReset = vi.fn();
    render(
      <FilterBar filters={<span>поля</span>} activeCount={2} onReset={onReset}>
        <span />
      </FilterBar>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Фильтры (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('ничего не включено — «Сбросить» не показывается', () => {
    render(
      <FilterBar filters={<span>поля</span>} activeCount={0} onReset={() => {}}>
        <span />
      </FilterBar>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
    expect(screen.queryByRole('button', { name: 'Сбросить' })).toBeNull();
  });

  it('без дополнительных отборов нет и кнопки', () => {
    render(
      <FilterBar>
        <span />
      </FilterBar>,
    );
    expect(screen.queryByRole('button', { name: /Фильтры/ })).toBeNull();
  });
});
