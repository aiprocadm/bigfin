// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: сервер и правда соберётся.
 *
 * ЗАЧЕМ. Это самая тихая поломка из всех возможных: сборка проходит, типы
 * сходятся, все проверки зелёные — а СЕРВЕР НЕ СТАРТУЕТ ВОВСЕ. Nest
 * отказывается собрать зависимость и падает при запуске:
 *
 *   Nest can't resolve dependencies of the GetBalanceStructureService (?).
 *   Please make sure that the argument BalanceSheetApplication at index [0]
 *   is available in the FinancialStatementsModule context.
 *
 * Так и случилось: класс был объявлен в своём модуле, но не вынесен в
 * `exports`. Стенд лёг сразу после обновления, и узнать об этом можно было
 * только по журналу службы.
 *
 * ДВА УСЛОВИЯ, А НЕ ОДНО. Чтобы класс из соседнего модуля был доступен,
 * нужно И чтобы хозяин его экспортировал, И чтобы модуль-потребитель этого
 * хозяина импортировал. Забыть можно любое из двух, и обе забывчивости дают
 * одну и ту же тихую поломку.
 *
 * ПРОВЕРЯЮТСЯ И СЕРВИСЫ, И КОНТРОЛЛЕРЫ. Первая версия смотрела только
 * сервисы — и пропустила бы зависимость, добавленную в контроллер отчёта.
 */
const REPORTS_ROOT = __dirname;

const read = (file: string) => activeCode(fs.readFileSync(file, 'utf-8'));

/** Все файлы каталога с нужным окончанием. */
function collect(dir: string, suffix: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collect(full, suffix, acc);
      return;
    }
    if (entry.name.endsWith(suffix) && !entry.name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  });

  return acc;
}

/** Корень `src`, от которого считаются пути вида `@/modules/...`. */
const SRC_ROOT = path.resolve(REPORTS_ROOT, '../..');

interface Injection {
  /** Файл, который просит зависимость. */
  consumer: string;
  /** Класс, который просят. */
  className: string;
  /** Файл класса — от него ищется модуль-хозяин. */
  ownerFile: string;
}

/** Классы из ДРУГИХ модулей, которые файл требует в конструкторе. */
function injectionsOf(file: string): Injection[] {
  const source = read(file);
  const found: Injection[] = [];

  const importRe = /import\s*\{([^}]*)\}\s*from\s*'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = importRe.exec(source)) !== null) {
    const from = match[2];

    // Интересуют только чужие модули: `@/modules/X/...` и `../modules/X/...`.
    const isOtherModule =
      from.startsWith('@/modules/') || from.includes('../modules/');

    if (!isOtherModule) continue;

    const resolved = from.startsWith('@/')
      ? path.resolve(SRC_ROOT, from.slice(2))
      : path.resolve(path.dirname(file), from);

    match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((className) => {
        const askedInConstructor = new RegExp(`:\\s*${className}\\b`).test(
          source,
        );

        if (!askedInConstructor) return;

        found.push({ consumer: file, className, ownerFile: resolved });
      });
  }

  return found;
}

/** Файл модуля в каталоге, если он там есть. */
function moduleFileIn(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;

  const name = fs
    .readdirSync(dir)
    .find((file) => file.endsWith('.module.ts') && !file.endsWith('.spec.ts'));

  return name ? path.join(dir, name) : null;
}

/** Ближайший модуль, которому принадлежит файл. */
function owningModuleOf(file: string): string | null {
  let dir = path.dirname(file);

  for (let depth = 0; depth < 6; depth += 1) {
    const found = moduleFileIn(dir);

    if (found) return found;
    dir = path.dirname(dir);
  }
  return null;
}

/** Блок `exports: [...]` / `imports: [...]` модуля. */
function moduleBlock(moduleFile: string, key: string): string {
  const source = read(moduleFile);
  const at = source.indexOf(`${key}: [`);

  if (at < 0) return '';

  return source.slice(at, source.indexOf(']', at) + 1);
}

/** Имя класса модуля: `export class FooModule {}`. */
function moduleClassName(moduleFile: string): string {
  const match = /export class (\w+)/.exec(read(moduleFile));

  return match ? match[1] : '';
}

describe('сервер и правда соберётся: зависимости доступны', () => {
  const files = [
    ...collect(REPORTS_ROOT, '.service.ts'),
    ...collect(REPORTS_ROOT, '.controller.ts'),
  ];

  it('файлы модуля отчётов и правда найдены', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(files.length).toBeGreaterThan(10);
    expect(
      files.some((file) => file.endsWith('BalanceSheet.controller.ts')),
    ).toBe(true);
  });

  it('каждая зависимость экспортирована своим модулем', () => {
    const broken: string[] = [];

    files.forEach((file) => {
      injectionsOf(file).forEach((injection) => {
        // ВАЖНО: модуль ищется ВВЕРХ от файла класса. Первая версия смотрела
        // только в его собственный каталог — и не находила модуль для класса
        // из `queries/`, то есть молча пропускала ровно тот случай, ради
        // которого сторож и писался. Поймал мутацией.
        const ownerModule = owningModuleOf(injection.ownerFile);

        // Модуль-хозяин не найден — класс лежит вне модулей (общий helper,
        // тип, модель): Nest такие не собирает, проверять нечего.
        if (!ownerModule) return;

        const exports = moduleBlock(ownerModule, 'exports');

        if (!exports.includes(injection.className)) {
          broken.push(
            `${path.basename(file)} просит ${injection.className}, ` +
              `а ${path.basename(ownerModule)} его не экспортирует`,
          );
        }
      });
    });

    expect(broken).toEqual([]);
  });

  it('модуль-хозяин импортирован модулем-потребителем', () => {
    // Экспорта мало: без импорта класс так же недоступен, и сервер так же
    // не стартует.
    const broken: string[] = [];

    files.forEach((file) => {
      const consumerModule = owningModuleOf(file);

      if (!consumerModule) return;

      injectionsOf(file).forEach((injection) => {
        const ownerModule = owningModuleOf(injection.ownerFile);

        if (!ownerModule || ownerModule === consumerModule) return;

        const ownerName = moduleClassName(ownerModule);
        const imports = moduleBlock(consumerModule, 'imports');
        const providers = moduleBlock(consumerModule, 'providers');

        // Класс может быть объявлен прямо у потребителя — тогда импорт
        // модуля-хозяина не нужен.
        if (providers.includes(injection.className)) return;

        if (ownerName && !imports.includes(ownerName)) {
          broken.push(
            `${path.basename(consumerModule)} не импортирует ${ownerName}, ` +
              `хотя ${path.basename(file)} просит ${injection.className}`,
          );
        }
      });
    });

    expect(broken).toEqual([]);
  });

  it('проверка умеет отличить закрытый класс от открытого', () => {
    // Без этого сторож мог бы «проходить», ничего не находя.
    const balanceModule = moduleFileIn(
      path.join(REPORTS_ROOT, 'modules/BalanceSheet'),
    );

    expect(balanceModule).not.toBeNull();
    expect(moduleBlock(balanceModule!, 'exports')).toContain(
      'BalanceSheetApplication',
    );
    expect(moduleBlock(balanceModule!, 'exports')).not.toContain(
      'ТакогоКлассаНет',
    );
  });
});
