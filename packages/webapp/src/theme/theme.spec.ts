import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { applyTheme, readStoredTheme, resolveTheme, setThemeChoice, THEME_STORAGE_KEY } from './theme';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  document.body.className = '';
});

describe('тема оформления (R14)', () => {
  it('по умолчанию — как в системе', () => {
    expect(readStoredTheme()).toBe('system');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('тёмная ставит оба класса: токены кита и старые экраны', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.body.classList.contains('bp4-dark')).toBe(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('выбор запоминается для загрузки без вспышки', () => {
    setThemeChoice('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('скрипт до отрисовки знает те же три выбора и ставит оба класса', () => {
    const preload = fs.readFileSync(path.resolve(__dirname, '../../public/preload-theme.js'), 'utf8');
    expect(preload).toContain(THEME_STORAGE_KEY);
    expect(preload).toContain('prefers-color-scheme: dark');
    expect(preload).toContain("'dark'");
    expect(preload).toContain("'bp4-dark'");
    expect(preload).toContain('/payment');
  });
});
