import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'date_range.previous': 'Предыдущий период',
        'date_range.next': 'Следующий период',
        'date_range.choose': 'Выбрать период',
        'date_range.preset.this_month': 'Этот месяц',
        'date_range.preset.last_month': 'Прошлый месяц',
      })[key] ?? key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

import { DateRangePicker } from './date-range-picker';

const SEPT = { from: '2026-09-01', to: '2026-09-30' };

describe('DateRangePicker', () => {
  it('период — одним полем словами', () => {
    render(<DateRangePicker value={SEPT} onChange={() => {}} today="2026-09-24" />);

    expect(screen.getByRole('button', { name: /Выбрать период/ })).toHaveTextContent(/1\s*–\s*30 сент\. 2026/);
  });

  it('стрелки сдвигают месяц на месяц', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={SEPT} onChange={onChange} today="2026-09-24" />);

    fireEvent.click(screen.getByRole('button', { name: 'Следующий период' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31' });
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий период' }));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('готовый вариант применяется и отмечен как выбранный', async () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        value={SEPT}
        onChange={onChange}
        today="2026-09-24"
        presets={['this_month', 'last_month']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Выбрать период/ }));
    expect(await screen.findByRole('button', { name: 'Этот месяц' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Прошлый месяц' }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('без стрелок — только поле', () => {
    render(<DateRangePicker value={SEPT} onChange={() => {}} showArrows={false} />);

    expect(screen.queryByRole('button', { name: 'Следующий период' })).toBeNull();
  });
});
