import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Дата словами говорится ОДНИМ способом.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ. На главной рядом стояли две одинаковые даты:
 * лента денег писала «5 октября», а блок «Требует внимания» — «5 October».
 * Английский месяц посреди русской фразы.
 *
 * Причина не в одной ошибке, а в том, что способов было ДВА: лента считала
 * через `Intl`, блок внимания — через `moment` с глобальной локалью.
 * Глобальная локаль это состояние: её кто-то должен успеть выставить, файл
 * локали должен попасть в сборку, порядок загрузки должен сойтись. Не
 * сошлось — и месяц молча стал английским.
 */
const SRC = path.resolve(__dirname, '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full, acc);
    if (!/\.tsx?$/.test(entry.name)) return;
    if (/\.spec\.tsx?$/.test(entry.name)) return;

    acc.push(full);
  });

  return acc;
}

describe('дата словами — один способ на продукт', () => {
  it('никто не собирает «день и месяц» через moment', () => {
    // Формат «D MMMM» у moment берёт месяц из ГЛОБАЛЬНОЙ локали. Общий
    // помощник спрашивает язык у интерфейса в момент вызова, и ошибиться
    // порядком загрузки там негде.
    const offenders = sourceFiles(SRC)
      .filter((file) =>
        /\.format\(\s*['"`][^'"`]*MMMM[^'"`]*['"`]\s*\)/.test(
          activeCode(fs.readFileSync(file, 'utf8')),
        ),
      )
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    expect(offenders).toEqual([]);
  });

  it('файлы вообще нашлись', () => {
    // Иначе проверка выше молча позеленеет на пустом списке.
    expect(sourceFiles(SRC).length).toBeGreaterThan(500);
  });

  it('месяц называется по-русски', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { getInitOptions: () => ({ currentLocale: 'ru' }) },
    }));
    const { formatDayMonth } = await import('./formatDayMonth');

    expect(formatDayMonth('2026-10-05')).toBe('5 октября');
  });

  it('язык берётся у интерфейса, а не зашит', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { getInitOptions: () => ({ currentLocale: 'en' }) },
    }));
    const { formatDayMonth } = await import('./formatDayMonth');

    expect(formatDayMonth('2026-10-05')).toContain('October');
  });

  it('битая дата не роняет экран и не пишет «Invalid Date»', async () => {
    vi.resetModules();
    vi.doMock('react-intl-universal', () => ({
      default: { getInitOptions: () => ({ currentLocale: 'ru' }) },
    }));
    const { formatDayMonth } = await import('./formatDayMonth');

    expect(formatDayMonth('не дата')).toBe('не дата');
    expect(formatDayMonth(null)).toBe('');
    expect(formatDayMonth(undefined)).toBe('');
  });
});
