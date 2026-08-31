// © 2026 Bigfin
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) => key,
  },
}));

const push = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useHistory: () => ({ push }) };
});

import { AccountantOnly } from './accountant-only';

/**
 * Р2 карты v40. Скрытый экран объясняет себя, а не подменяет адрес.
 *
 * Шесть чисто-бухгалтерских экранов скрыты в режиме «Бизнес». Страж
 * маршрута молча заменял адрес на `/`: человек нажимал ссылку из отчётов
 * или открывал закладку — и оказывался на главной без единого слова.
 *
 * У продукта уже есть правило «выключенный раздел объясняет себя»
 * (карта v36, экран `ModuleDisabled`). Режим интерфейса — такой же случай:
 * человек сам его выбрал и сам может переключить.
 */
describe('экран, скрытый режимом интерфейса', () => {
  it('называет причину, а не оставляет человека в пустоте', () => {
    render(
      <MemoryRouter>
        <AccountantOnly />
      </MemoryRouter>,
    );

    expect(screen.getByText('accountant_only.title')).toBeTruthy();
    expect(screen.getByText('accountant_only.description')).toBeTruthy();
  });

  it('показывает дорогу к настройке режима', () => {
    render(
      <MemoryRouter>
        <AccountantOnly />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('accountant_only.open_settings'));

    expect(push).toHaveBeenCalledWith('/preferences/interface-mode');
  });

  it('подписи есть в обоих словарях', () => {
    const LANG = path.resolve(__dirname, '../../lang');
    const keys = [
      'accountant_only.title',
      'accountant_only.description',
      'accountant_only.open_settings',
    ];

    ['ru', 'en'].forEach((locale) => {
      const dictionary = JSON.parse(
        fs.readFileSync(path.join(LANG, locale, 'index.json'), 'utf8'),
      );
      const missing = keys.filter((key) => !dictionary[key]);

      expect(missing).toEqual([]);
    });
  });
});
