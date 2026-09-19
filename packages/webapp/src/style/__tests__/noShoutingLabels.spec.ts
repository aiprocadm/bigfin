import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: подписи не кричат ПРОПИСНЫМИ.
 *
 * Зачем. Заголовок колонки и подпись над блоком, набранные прописными
 * вразрядку, кричат громче самих данных, ради которых они и стоят. И читаются
 * медленнее: у слова из прописных нет привычного глазу силуэта — его
 * приходится разбирать по буквам.
 *
 * Приём приходит в продукт сам собой: он стоит по умолчанию в чужих наборах
 * компонентов и в примерах. За один заход его сняли с шестнадцати файлов; без
 * сторожа он вернётся со следующим экраном.
 *
 * Правило про оформление, не про данные. Если прописные — часть самого
 * значения (код валюты «RUB», номер «А-1»), они приходят из данных и этого
 * сторожа не касаются.
 */
const SRC = path.resolve(__dirname, '../..');

/** Места, где прописные разрешены. Пусто — и пусть остаётся пустым. */
const ALLOWED: string[] = [];

const WALK_SKIP = /node_modules|\/lang\/|\.spec\.|\.stories\./;

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (WALK_SKIP.test(full.replace(/\\/g, '/'))) return;
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (/\.(tsx|ts|scss|css)$/.test(entry.name)) acc.push(full);
  });

  return acc;
}

/** Строка кода без комментариев — закомментированный приём не в счёт. */
const activeLines = (source: string): Array<{ line: number; text: string }> =>
  source.split('\n').map((text, i) => ({ line: i + 1, text })).filter(
    ({ text }) => {
      const trimmed = text.trim();

      return !(
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*')
      );
    },
  );

describe('подписи не кричат прописными', () => {
  const files = collect(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(500);
  });

  it('нет утилиты `uppercase` в классах', () => {
    const offenders: string[] = [];

    files
      .filter((file) => /\.tsx?$/.test(file))
      .forEach((file) => {
        activeLines(fs.readFileSync(file, 'utf8')).forEach(({ line, text }) => {
          if (/\buppercase\b/.test(text)) {
            const rel = path.relative(SRC, file);

            if (!ALLOWED.includes(rel)) offenders.push(`${rel}:${line}`);
          }
        });
      });

    expect(offenders).toEqual([]);
  });

  it('нет `text-transform: uppercase` в стилях', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      activeLines(fs.readFileSync(file, 'utf8')).forEach(({ line, text }) => {
        if (/text-transform:\s*uppercase/.test(text)) {
          const rel = path.relative(SRC, file);

          if (!ALLOWED.includes(rel)) offenders.push(`${rel}:${line}`);
        }
      });
    });

    expect(offenders).toEqual([]);
  });
});
