import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * И1 карты v33. Таблица не вылезает за край телефона.
 *
 * Замер на 390 px: «Финмодель» рисует таблицы шириной до 421 px,
 * «Зарплата» — до 439 px, «Платёжный календарь» — 544 px, и ни одна не
 * прокручивается: правый край просто обрезан, последние столбцы человеку
 * недоступны. Основатель пользуется продуктом с телефона — это не мелочь.
 *
 * Здоровые разделы («Кредиты», «Основные средства») заворачивают таблицу
 * в прокручиваемый контейнер:
 *
 *   <div className="overflow-x-auto rounded-md border">
 *     <table …>
 *
 * Правило: файл, который рисует таблицу, либо заворачивает её, либо
 * перечислен в исключениях — с причиной.
 *
 * Дополнение этапа 3 ТЗ (шаг 3.7). Новые экраны рисуют таблицу не сами, а
 * через примитивы `components/ui`. Сторож их не смотрел вовсе: разделы
 * проверялись по наличию `<table` в своём файле, а у такого экрана его нет.
 * Значит стоило убрать обёртку из примитива — и таблицы поехали бы вбок сразу
 * на всех новых экранах, молча. Теперь примитивы проверяются отдельно.
 */
const SRC = path.resolve(__dirname, '..');

/** Таблицы, которым прокрутка не нужна — с причиной. */
const ALLOWED = [
  // Печатный шаблон счёта: это лист А4 постоянной ширины, а не список.
  // Прокручивается лист целиком, вместе с полями и подписями.
  'containers/Sales/Invoices/InvoiceCustomize/PaperTemplate.tsx',
];

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!entry.name.endsWith('.tsx')) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

/** Примитивы дизайн-системы, рисующие таблицу: за них отвечает обёртка. */
const UI_DIR = path.join(SRC, 'components', 'ui');

describe('таблицы на телефоне', () => {
  const files = sourceFiles(path.join(SRC, 'containers'));

  it('исходники разделов читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('каждая таблица живёт в прокручиваемом контейнере', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const relative = path.relative(SRC, file).split(path.sep).join('/');
      if (ALLOWED.includes(relative)) return;

      const code = fs.readFileSync(file, 'utf8');
      if (!/<table[\s>]/.test(code)) return;
      if (/overflow-x-auto|overflow-auto/.test(code)) return;

      offenders.push(relative);
    });

    expect(offenders).toEqual([]);
  });

  it('список исключений не устарел', () => {
    // Экран перестал рисовать таблицу — строка должна уйти из списка.
    const stale = ALLOWED.filter((relative) => {
      const full = path.join(SRC, relative);
      if (!fs.existsSync(full)) return true;
      return !/<table[\s>]/.test(fs.readFileSync(full, 'utf8'));
    });

    expect(stale).toEqual([]);
  });

  it('примитивы дизайн-системы сами заворачивают таблицу', () => {
    const primitives = sourceFiles(UI_DIR).filter((file) =>
      /<table[\s>]/.test(fs.readFileSync(file, 'utf8')),
    );

    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(primitives.length).toBeGreaterThan(0);

    const offenders = primitives
      .filter(
        (file) =>
          !/overflow-x-auto|overflow-auto/.test(fs.readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

    expect(offenders).toEqual([]);
  });
});
