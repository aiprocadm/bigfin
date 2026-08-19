import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * М4 (карта v15): на пустых экранах оставались кнопки «Подробнее», которые
 * никуда не ведут, и английские тексты посреди русского интерфейса. Пустой
 * экран — первое, что видит новый пользователь: он не должен врать.
 */
const CONTAINERS = path.resolve(__dirname, '..');

const collect = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collect(full));
    } else if (
      entry.name.endsWith('.tsx') &&
      entry.name.includes('EmptyState')
    ) {
      out.push(full);
    }
  }
  return out;
};

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const short = (file: string) => path.relative(CONTAINERS, file);

describe('пустые экраны не врут', () => {
  const files = collect(CONTAINERS);

  it('пустые экраны вообще нашлись', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('ни одна кнопка не ведёт в никуда', () => {
    const dead: string[] = [];

    files.forEach((file) => {
      const source = withoutComments(fs.readFileSync(file, 'utf8'));

      for (const m of source.matchAll(/<Button\b([\s\S]*?)>/g)) {
        const props = m[1];

        if (!/onClick|href|type="submit"/.test(props)) {
          dead.push(short(file));
        }
      }
    });
    expect(dead).toEqual([]);
  });

  it('нет английских текстов вместо переводов', () => {
    const english: string[] = [];

    files.forEach((file) => {
      const source = withoutComments(fs.readFileSync(file, 'utf8'));

      // Три и больше латинских слова подряд в тексте — это забытая строка.
      for (const m of source.matchAll(
        /(?:^|[>{"'])\s*([A-Za-z][A-Za-z']*(?:\s+[A-Za-z][A-Za-z']*){2,})[\s.!,]*(?:[<}"']|$)/gm,
      )) {
        const text = m[1].trim();

        // Импорты и типы — не тексты для человека.
        if (/^(import|export|from|const|function|return|type)\b/.test(text)) {
          continue;
        }
        english.push(`${short(file)}: «${text.slice(0, 40)}»`);
      }
    });
    expect(english).toEqual([]);
  });
});
