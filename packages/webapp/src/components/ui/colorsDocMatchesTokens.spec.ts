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
const namedTokens = [...doc.matchAll(/--c-[a-z0-9-]+|--radius(?:-ctl|-pill)?\b/g)].map(
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

/**
 * Сторож §10.4 ТЗ-2: в компонентах нет цветов мимо токенов.
 *
 * ЗАЧЕМ. Блок `.dark` в `tokens.css` есть, а класс `dark` не ставится нигде —
 * тёмная тема сейчас мертва. Настоящее ТЗ её не чинит, но обязывает: каждый
 * новый компонент объявляет цвет ТОЛЬКО токеном. Тогда включение темы позже
 * не потребует переписывать библиотеку по файлу.
 *
 * Зашитый цвет не виден глазами при обзоре: он не ломает светлую тему и
 * проявится лишь у того, кто однажды включит тёмную, — чёрным текстом на
 * чёрном фоне. Поэтому проверка машинная.
 */
const UI_DIR = path.resolve(__dirname);

/**
 * Файлы, которым зашитый цвет разрешён, и ПОЧЕМУ. Список не растёт «потому
 * что так вышло»: каждая строка — решение, а не умолчание.
 */
const HEX_ALLOWED: Record<string, string> = {
  'QrCode.tsx':
    'QR-код обязан быть чистым чёрным на чистом белом: сканеры читают его ' +
    'по контрасту, и токен темы сделал бы код нечитаемым.',
};

/** Комментарии вырезаются: цвет, НАЗВАННЫЙ в пояснении, ничего не красит. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

describe('в компонентах нет цветов мимо токенов', () => {
  const files = fs
    .readdirSync(UI_DIR)
    .filter((name) => /\.tsx?$/.test(name))
    .filter((name) => !/\.(spec|stories)\.tsx?$/.test(name));

  it('файлы компонентов и правда найдены', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(50);
  });

  it('литеральных #HEX в коде компонентов нет', () => {
    const offenders = files.filter((name) => {
      if (name in HEX_ALLOWED) return false;

      const source = withoutComments(
        fs.readFileSync(path.join(UI_DIR, name), 'utf8'),
      );

      return /#[0-9A-Fa-f]{3,8}\b/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it('у каждого исключения записана причина', () => {
    Object.entries(HEX_ALLOWED).forEach(([name, reason]) => {
      expect(fs.existsSync(path.join(UI_DIR, name))).toBe(true);
      // Причина — не отписка: короткое «legacy» ничего не объясняет.
      expect(reason.length).toBeGreaterThan(40);
    });
  });
});
