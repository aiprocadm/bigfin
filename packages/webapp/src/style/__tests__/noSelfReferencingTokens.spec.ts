import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: токен не ссылается сам на себя.
 *
 * Как это случилось. В `@theme` стояло `--radius-control: var(--radius-control)`
 * — имя токена Tailwind совпало с именем сырого токена из `tokens.css`.
 * По правилам CSS такое свойство недействительно, и скругление пропадало
 * СОВСЕМ у всех кнопок и полей продукта.
 *
 * Поломка молчаливая: сборка зелёная, ошибок в journal нет, предупреждений
 * нет. Просто углы прямые — а заметить это можно только глазами и только
 * если знаешь, что они должны быть круглыми.
 */
const STYLES = path.resolve(__dirname, '../../styles');

const DECLARATION = /^\s*(--[\w-]+)\s*:\s*([^;]+);/;

function selfReferencing(source: string): string[] {
  return source
    .split('\n')
    .map((line) => {
      const match = DECLARATION.exec(line);

      if (!match) return null;

      const [, name, value] = match;

      return value.includes(`var(${name})`) ? name : null;
    })
    .filter((name): name is string => name !== null);
}

describe('токены не ссылаются сами на себя', () => {
  const files = fs
    .readdirSync(STYLES)
    .filter((name) => name.endsWith('.css'))
    .map((name) => path.join(STYLES, name));

  it('файлы токенов читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(0);
  });

  it('ни один токен не объявлен через самого себя', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      selfReferencing(fs.readFileSync(file, 'utf8')).forEach((name) =>
        offenders.push(`${path.basename(file)}: ${name}`),
      );
    });

    expect(offenders).toEqual([]);
  });
});
