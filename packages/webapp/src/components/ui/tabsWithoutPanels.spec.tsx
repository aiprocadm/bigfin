import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger } from './tabs';

/**
 * Вкладки-переключатели без панелей (этап 55 ТЗ-4, axe aria-valid-attr-value).
 * Файл, где вкладки есть, а `TabsContent` нет, помечает каждую вкладку
 * `noPanel` — иначе `aria-controls` ведёт в пустоту.
 */
const SRC = path.join(__dirname, '../..');

function tsxUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : tsxUnder(full);
    return /\.tsx$/.test(entry.name) && !/\.(spec|test|stories)\.tsx$/.test(entry.name) ? [full] : [];
  });
}

export function triggersWithoutNoPanel(source: string): number {
  if (/<TabsContent\b/.test(source)) return 0;
  return [...source.matchAll(/<TabsTrigger\b[^>]*>/g)].filter((m) => !/\bnoPanel\b/.test(m[0])).length;
}

describe('вкладки без панелей', () => {
  it('noPanel убирает ссылку на несуществующую панель', () => {
    render(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a" noPanel>
            А
          </TabsTrigger>
          <TabsTrigger value="b">Б</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'А' })).not.toHaveAttribute('aria-controls');
    expect(screen.getByRole('tab', { name: 'Б' })).toHaveAttribute('aria-controls');
  });

  it('на экранах каждая вкладка без панели помечена', () => {
    const offenders = tsxUnder(SRC)
      .filter((file) => !file.endsWith(path.join('components', 'ui', 'tabs.tsx')))
      .map((file) => [path.relative(SRC, file), triggersWithoutNoPanel(fs.readFileSync(file, 'utf8'))] as const)
      .filter(([, n]) => n > 0)
      .map(([rel, n]) => `${rel}: ${n}`);
    expect(offenders).toEqual([]);
  });

  it('сторож ловит поломку (подсаженная)', () => {
    expect(triggersWithoutNoPanel('<Tabs><TabsTrigger value="a">А</TabsTrigger></Tabs>')).toBe(1);
    expect(triggersWithoutNoPanel('<TabsTrigger value="a">А</TabsTrigger><TabsContent value="a" />')).toBe(0);
  });
});
