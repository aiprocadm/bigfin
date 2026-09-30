import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let phone = true;
vi.mock('./use-media-query', () => ({ useIsPhone: () => phone }));
vi.mock('react-intl-universal', () => ({ default: { get: (key: string) => key } }));

import { Dialog, DialogContent, DialogTitle } from './dialog';

/**
 * R13 ТЗ-4: на телефоне любое окно — шторка снизу с «ручкой»; на ноутбуке —
 * окно по центру, как было.
 */
describe('окно на телефоне и ноутбуке', () => {
  const open = () =>
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Приход</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

  it('телефон — снизу, с ручкой', () => {
    phone = true;
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('bottom-0');
    expect(dialog.querySelector('[data-dialog-handle]')).not.toBeNull();
  });

  it('ноутбук — по центру, без ручки', () => {
    phone = false;
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('top-1/2');
    expect(dialog.querySelector('[data-dialog-handle]')).toBeNull();
  });
});
