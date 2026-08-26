import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * О2 карты v23. Никакой файл стилей не вправе объявлять глобальный сброс
 * полей и отступов.
 *
 * Что случилось. В стилях ОДНОЙ страницы — формы регистрации организации —
 * первой строкой стоял сброс `* { margin: 0; padding: 0 }`. Файл
 * импортируется в общий `App.scss`, поэтому правило действовало на всё
 * приложение. А Tailwind 4 кладёт свои утилиты в каскадный слой
 * (`@layer utilities`); объявления ВНЕ слоёв сильнее любых объявлений
 * внутри слоя, независимо от специфичности. В итоге во всём новом
 * интерфейсе молча не работали `p-*`, `px-*`, `py-*`, `m-*`, `space-*` —
 * элементы слипались, а пункты меню вместо 36 px были 20 px, и попасть по
 * ним пальцем на телефоне было трудно.
 *
 * Сброс сам по себе не запрещён — запрещён ГЛОБАЛЬНЫЙ: правило должно
 * начинаться с класса страницы, а не с `*`.
 */
const STYLE_DIRS = [
  path.resolve(__dirname),
  path.resolve(__dirname, '../styles'),
];

const styleFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return styleFiles(full);
    return /\.(css|scss)$/.test(entry.name) ? [full] : [];
  });
};

/**
 * Правило `*` НА ВЕРХНЕМ УРОВНЕ файла — то есть без отступа слева.
 *
 * Отступ означает вложенность в SCSS-блок: `.форма { * { … } }` действует
 * только внутри своей области и утилитам не мешает. Именно так и стоит
 * писать сброс, когда он действительно нужен.
 */
const GLOBAL_SELECTOR = /^\*(\s*,\s*\*(::?[a-z-]+)?)*\s*\{/;

describe('глобальные сбросы в стилях', () => {
  const files = STYLE_DIRS.flatMap(styleFiles);

  it('файлы стилей вообще нашлись', () => {
    // Иначе сломанный обход сделал бы проверку ниже пустой и зелёной.
    expect(files.length).toBeGreaterThan(10);
  });

  it('ни один файл не сбрасывает отступы у всех элементов сразу', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const lines = fs.readFileSync(file, 'utf8').split('\n');

      lines.forEach((line, index) => {
        if (!GLOBAL_SELECTOR.test(line)) return;

        // Смотрим тело правила: сброс полей и отступов — то, что ломает
        // утилиты Tailwind. Другие глобальные свойства (например,
        // box-sizing) такого эффекта не дают.
        const body = lines.slice(index, index + 8).join(' ');
        if (/\b(margin|padding)\s*:/.test(body)) {
          offenders.push(
            `${path.relative(path.resolve(__dirname, '..'), file)}:${index + 1}`,
          );
        }
      });
    });

    expect(offenders).toEqual([]);
  });
});
