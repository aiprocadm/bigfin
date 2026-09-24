import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({ default: { get: (key: string) => ({ close: 'Закрыть' })[key] ?? key } }));

import { Sheet, SWIPE_CLOSE_DISTANCE } from './sheet';

const phone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as any;
};

afterEach(() => {
  // @ts-expect-error очистка подмены
  delete window.matchMedia;
});

describe('Sheet', () => {
  it('открытая шторка — окно с заголовком и кнопкой «Закрыть»', () => {
    phone(false);
    render(
      <Sheet open onOpenChange={() => {}} title="Фильтры">
        содержимое
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Фильтры' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeInTheDocument();
  });

  it('на ноутбуке ручки нет, на телефоне — есть', () => {
    phone(false);
    const { unmount } = render(<Sheet open onOpenChange={() => {}} title="Ф">x</Sheet>);
    expect(screen.queryByTestId('sheet-handle')).toBeNull();
    unmount();

    phone(true);
    render(<Sheet open onOpenChange={() => {}} title="Ф">x</Sheet>);
    expect(screen.getByTestId('sheet-handle')).toBeInTheDocument();
  });

  it('стянули ручку дальше порога — шторка закрывается, чуть-чуть — нет', () => {
    phone(true);
    const onOpenChange = vi.fn();
    render(<Sheet open onOpenChange={onOpenChange} title="Ф">x</Sheet>);
    const handle = screen.getByTestId('sheet-handle');

    // В jsdom нет PointerEvent — координату несёт MouseEvent того же типа.
    const swipe = (type: string, clientY: number) =>
      fireEvent(handle, new MouseEvent(type, { bubbles: true, clientY }));

    swipe('pointerdown', 100);
    swipe('pointermove', 130);
    swipe('pointerup', 130);
    expect(onOpenChange).not.toHaveBeenCalled();

    swipe('pointerdown', 100);
    swipe('pointermove', 100 + SWIPE_CLOSE_DISTANCE + 10);
    swipe('pointerup', 100 + SWIPE_CLOSE_DISTANCE + 10);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('полоса действий внизу', () => {
    phone(false);
    render(
      <Sheet open onOpenChange={() => {}} title="Ф" footer={<button type="button">Применить</button>}>
        x
      </Sheet>,
    );

    expect(screen.getByRole('button', { name: 'Применить' })).toBeInTheDocument();
  });
});
