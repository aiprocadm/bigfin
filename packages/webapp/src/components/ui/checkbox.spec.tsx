import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

/**
 * К4 карты v19 — мобильный замер. На ширине телефона (390 px) чекбокс
 * выбора строки в списках оказался целью нажатия ровно 16×16 без всякой
 * увеличенной области: ячейка тоже 16 px шириной. Пальцем в такое попасть
 * трудно (рекомендации — от 44 px).
 *
 * Вид чекбокса менять нельзя — он одинаков во всех списках; увеличивается
 * только область нажатия, и только на узких экранах.
 */
describe('Checkbox — область нажатия на телефоне', () => {
  const classesOf = () => screen.getByRole('checkbox').className;

  it('на узких экранах область нажатия расширена псевдоэлементом', () => {
    render(<Checkbox aria-label="Выбрать строку" />);

    const cls = classesOf();
    // Псевдоэлемент растягивается за пределы самого квадратика.
    expect(cls).toContain('max-md:after:absolute');
    expect(cls).toMatch(/max-md:after:-inset-\[14px\]/);
    // Без relative псевдоэлемент считался бы от другого предка.
    expect(cls).toContain('relative');
  });

  it('размер самого квадратика не изменился', () => {
    // Иначе поедут ширины колонок во всех списках сразу.
    render(<Checkbox aria-label="Выбрать строку" />);

    expect(classesOf()).toContain('h-4 w-4');
  });

  it('переданный извне класс по-прежнему применяется', () => {
    render(<Checkbox aria-label="Выбрать строку" className="ml-2" />);

    expect(classesOf()).toContain('ml-2');
  });
});
