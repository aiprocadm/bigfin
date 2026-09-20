import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ScreenHelp } from './screen-help';

/**
 * Контекстная справка (FIN-025 ТЗ-2).
 *
 * Проверяется поведение, а не текст: тексты сторожит
 * `containers/screenHelpPresence.spec.ts`.
 */
describe('справка на экране', () => {
  it('у экрана с текстом появляется кнопка', () => {
    render(<ScreenHelp topic="budgets" />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('у экрана БЕЗ текста кнопки нет', () => {
    // Приёмка 2 FIN-025. Пустая подсказка хуже её отсутствия: человек
    // нажимает и получает пустоту, то есть обещание без содержания.
    render(<ScreenHelp topic="такого_экрана_нет" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('объяснение открывается по нажатию', () => {
    render(<ScreenHelp topic="budgets" />);
    fireEvent.click(screen.getByRole('button'));

    // Первый абзац справки о бюджетах.
    expect(
      screen.getByText(/план по статьям на период/i),
    ).toBeInTheDocument();
  });

  it('текст разбит на абзацы, а не слеплен в один', () => {
    render(<ScreenHelp topic="budgets" />);
    fireEvent.click(screen.getByRole('button'));

    const dialog = screen.getByRole('dialog');

    // Заголовок плюс не меньше двух абзацев: справка объясняет, а не
    // отговаривается одной строкой.
    expect(dialog.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
  });

  it('перенос строки не печатается как текст', () => {
    // Если бы тело выводилось одной строкой, знак переноса остался бы виден.
    render(<ScreenHelp topic="budgets" />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog').textContent).not.toContain('\\n');
  });
});
