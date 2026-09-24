import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * UI-042-2 ТЗ-4. НАЙДЕНО ЖИВЫМ ПРОХОДОМ: в «Деньгах» на телефоне вкладки
 * группировки налезали на галочки «Доля от итога», «Пустые строки» — текст
 * поверх текста. У полосы вкладок жёсткая высота h-10, а ей разрешали
 * перенос (`flex-wrap`): вторая строка вылезала за полосу.
 *
 * Правило: полоса вкладок — всегда одна строка и листается вбок.
 */
const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return entry.name.endsWith('.tsx') && !/\.(spec|test)\./.test(entry.name)
      ? [full]
      : [];
  });
}

describe('полоса вкладок — одна строка', () => {
  it('сама полоса не переносится и листается вбок', () => {
    const code = activeCode(
      fs.readFileSync(path.join(__dirname, 'tabs.tsx'), 'utf8'),
    );

    expect(code).toContain('flex-nowrap');
    expect(code).toContain('overflow-x-auto');
    expect(code).toContain('shrink-0');
  });

  it('никто не включает полосе перенос', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /<TabsList[^>]*className="[^"]*\bflex-wrap\b/.test(
        activeCode(fs.readFileSync(file, 'utf8')),
      ),
    );

    expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
  });
});
