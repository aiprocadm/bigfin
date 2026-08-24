import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// В тестах словари не загружены и `intl.get` возвращает пустую строку —
// подписи было бы не отличить от их отсутствия. Подменяем перевод на сам
// ключ, чтобы проверять именно факт подписи.
vi.mock('react-intl-universal', () => ({
  default: { get: (key: string) => key },
}));

import { DataTablePagination } from './data-table-pagination';

/**
 * К4 карты v19 — мобильный замер. Кнопки листания страниц выходили целью
 * 18×32: попасть пальцем тяжело. Вдобавок внутри них только иконка без
 * подписи — чтение с экрана произносило просто «кнопка».
 */
const renderPagination = (props = {}) =>
  render(
    <DataTablePagination
      pageIndex={1}
      pageSize={20}
      pageCount={5}
      total={100}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      {...props}
    />,
  );

describe('листание страниц на телефоне', () => {
  it('у кнопок есть подпись для чтения с экрана', () => {
    renderPagination();

    expect(screen.getByLabelText('data_table.aria.prev_page')).toBeTruthy();
    expect(screen.getByLabelText('data_table.aria.next_page')).toBeTruthy();
  });

  it('на узких экранах кнопки крупнее', () => {
    renderPagination();

    for (const key of ['data_table.aria.prev_page', 'data_table.aria.next_page']) {
      const cls = screen.getByLabelText(key).className;
      expect(cls).toContain('max-md:h-11');
      expect(cls).toContain('max-md:w-11');
    }
  });

  it('крайние страницы по-прежнему запирают листание', () => {
    // Иначе увеличение кнопок легко «оживило» бы недоступное действие.
    renderPagination({ pageIndex: 0 });

    expect(
      screen.getByLabelText('data_table.aria.prev_page').hasAttribute('disabled'),
    ).toBe(true);
  });
});
