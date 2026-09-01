import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

vi.mock('react-intl-universal', () => ({
  default: { get: (key: string) => key },
}));

import { DescriptionAccessor } from './components';

/**
 * Д2 карты v30. Описание расхода видно без наведения.
 *
 * В таблице расходов есть столбец «ОПИСАНИЕ», но в нём стоял не текст, а
 * маленький значок: описание показывалось подсказкой при наведении мышью.
 * На телефоне наведения нет — столбец с таким заголовком не показывал
 * описания вовсе, хотя оно записано (в базе лежит «Аренда офиса за
 * месяц»). Продукт мобильный по приоритету основателя.
 */
describe('описание расхода в списке', () => {
  it('печатается текстом, а не значком с подсказкой', () => {
    render(<div>{DescriptionAccessor({ description: 'Аренда офиса за месяц' })}</div>);

    expect(screen.getByText('Аренда офиса за месяц')).toBeTruthy();
  });

  it('пустое описание оставляет ячейку пустой', () => {
    const { container } = render(
      <div data-testid="ячейка">{DescriptionAccessor({ description: '' })}</div>,
    );

    expect(container.textContent).toBe('');
  });

  it('новая таблица расходов тоже печатает текст, а не значок', () => {
    // Живой экран рисует ИМЕННО новый вариант таблицы: починки одного
    // легаси-варианта мало (урок «✅ по перечислению не доказывает ВСЕ»).
    const source = fs.readFileSync(
      path.resolve(__dirname, 'v2/useExpensesTableColumnsV2.tsx'),
      'utf8',
    );
    const column = source.slice(source.indexOf("id: 'description'"));
    const cell = column.slice(0, column.indexOf('__actions__'));

    expect(cell).toContain('{row.original.description}');
    expect(cell).not.toContain('<FileText');
  });

  it('длинное описание не растягивает строку', () => {
    const длинное = 'Аренда офиса за месяц по договору с ООО «Ромашка» '.repeat(4);
    const { container } = render(<div>{DescriptionAccessor({ description: длинное })}</div>);

    // Текст на месте целиком (его читает и поиск, и подсказка), но ячейка
    // усечена стилем — иначе одна строка расползётся на весь экран.
    const node = container.querySelector('[class*="truncate"], [class*="overview"]');
    expect(node).not.toBeNull();
  });
});
