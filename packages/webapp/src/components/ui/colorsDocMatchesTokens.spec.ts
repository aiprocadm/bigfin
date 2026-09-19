import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: описание палитры не расходится с самой палитрой.
 *
 * ЗАЧЕМ. Устаревшее описание ХУЖЕ отсутствующего. Так и было: документ
 * описывал тёмную тему как основную и жёлтые кнопки — палитру, от которой
 * продукт давно ушёл. Следующий человек построил бы по нему тёмный экран с
 * жёлтой кнопкой, и никакая проверка бы не возразила.
 *
 * Проверяем не «красиво ли написано», а два факта:
 * 1. каждое имя токена, названное в документе, существует в `tokens.css`;
 * 2. каждое значение `#HEX`, названное в документе, там же и встречается.
 */
const DOC = path.resolve(__dirname, 'colors.mdx');
const TOKENS = path.resolve(__dirname, '../../styles/tokens.css');

const doc = fs.readFileSync(DOC, 'utf8');
const tokens = fs.readFileSync(TOKENS, 'utf8');

/** Имена токенов, упомянутые в документе. */
const namedTokens = [...doc.matchAll(/--c-[a-z-]+|--radius(?:-ctl)?\b/g)].map(
  (match) => match[0],
);

/** Значения цветов, названные в документе. */
const namedHex = [...doc.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((match) =>
  match[0].toUpperCase(),
);

describe('описание палитры сходится с палитрой', () => {
  it('документ и токены и правда прочитаны', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(doc.length).toBeGreaterThan(1000);
    expect(tokens.length).toBeGreaterThan(1000);
    expect(namedTokens.length).toBeGreaterThan(5);
    expect(namedHex.length).toBeGreaterThan(3);
  });

  it('все упомянутые токены существуют', () => {
    const missing = [...new Set(namedTokens)].filter(
      (name) => !tokens.includes(`${name}:`),
    );

    expect(missing).toEqual([]);
  });

  it('все упомянутые значения встречаются в токенах', () => {
    const missing = [...new Set(namedHex)].filter(
      (hex) => !tokens.toUpperCase().includes(hex),
    );

    expect(missing).toEqual([]);
  });

  it('главное правило записано', () => {
    // «Расход — не красный» — правило, которое ломают чаще всего, потому что
    // красный минус кажется очевидным.
    expect(doc).toContain('Расход — не красный');
  });

  it('светлая тема названа основной', () => {
    // Документ описывал обратное и вводил в заблуждение.
    expect(doc).toContain('Светлая тема — основная');
    expect(doc).not.toContain('Тёмная тема — primary');
  });
});
