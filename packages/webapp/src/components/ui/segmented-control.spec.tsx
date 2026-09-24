import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
];

describe('SegmentedControl', () => {
  it('это группа радиокнопок с подписью, выбранный отмечен', () => {
    render(
      <SegmentedControl aria-label="Период" options={OPTIONS} value="quarter" onChange={() => {}} />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Период' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Квартал' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Месяц' })).toHaveAttribute('aria-checked', 'false');
  });

  it('в группу — одна остановка Tab: на выбранном сегменте', () => {
    render(
      <SegmentedControl aria-label="Период" options={OPTIONS} value="year" onChange={() => {}} />,
    );

    expect(screen.getByRole('radio', { name: 'Год' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Месяц' })).toHaveAttribute('tabindex', '-1');
  });

  it('нажатие выбирает сегмент', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl aria-label="Период" options={OPTIONS} value="month" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Год' }));
    expect(onChange).toHaveBeenCalledWith('year');
  });

  it('стрелки двигают выбор по кругу и пропускают недоступные', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Период"
        options={[OPTIONS[0], { ...OPTIONS[1], disabled: true }, OPTIONS[2]]}
        value="month"
        onChange={onChange}
      />,
    );
    const group = screen.getByRole('radiogroup');

    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('year');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('year');
  });
});
