// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: класс, который берёт себе сервис отчётов, отдан наружу своим модулем.
 *
 * ЗАЧЕМ. Это самая тихая поломка из всех возможных: сборка проходит, типы
 * сходятся, все 2800 проверок зелёные — а СЕРВЕР НЕ СТАРТУЕТ ВОВСЕ. Nest
 * отказывается собрать зависимость и падает при запуске:
 *
 *   Nest can't resolve dependencies of the GetBalanceStructureService (?).
 *   Please make sure that the argument BalanceSheetApplication at index [0]
 *   is available in the FinancialStatementsModule context.
 *
 * Так и случилось с картинкой структуры баланса: класс был объявлен в своём
 * модуле, но не вынесен в `exports`. Стенд лёг сразу после обновления, и
 * узнать об этом можно было только по журналу службы.
 *
 * КАК ПРОВЕРЯЕМ. Читаем сервисы модуля отчётов, достаём из их конструкторов
 * классы, привезённые из соседних модулей (`../modules/...`), и убеждаемся,
 * что модуль-хозяин каждого из них этот класс экспортирует.
 */
const ROOT = __dirname;
const QUERIES = path.join(ROOT, 'queries');

/** Сервисы модуля отчётов — те, что перечислены в его `providers`. */
function moduleProviders(): string[] {
  const source = activeCode(
    fs.readFileSync(path.join(ROOT, 'FinancialStatements.module.ts'), 'utf-8'),
  );
  const providers = source.slice(source.indexOf('providers: ['));

  return fs
    .readdirSync(QUERIES)
    .filter((file) => file.endsWith('.service.ts'))
    .filter((file) => {
      const className = file.replace('.service.ts', 'Service');

      return providers.includes(className);
    });
}

/** Классы из соседних модулей, которые сервис требует в конструкторе. */
function injectedFromModules(serviceFile: string): string[] {
  const source = activeCode(fs.readFileSync(path.join(QUERIES, serviceFile), 'utf-8'));
  const found: string[] = [];

  // `import { X } from '../modules/Foo/Bar';`
  const importRe = /import\s*\{([^}]*)\}\s*from\s*'(\.\.\/modules\/[^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = importRe.exec(source)) !== null) {
    match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .forEach((name) => {
        // Интересует только то, что и правда просят в конструкторе.
        const askedInConstructor = new RegExp(`:\\s*${name}\\b`).test(source);

        if (askedInConstructor) found.push(`${match![2]}::${name}`);
      });
  }

  return found;
}

/** Экспортирует ли модуль-хозяин этот класс. */
function ownerExports(importPath: string, className: string): boolean {
  // '../modules/BalanceSheet/BalanceSheetApplication' → каталог модуля.
  // Путь записан ОТ ФАЙЛА СЕРВИСА, то есть от каталога `queries`, а не от
  // корня модуля: первая версия считала от корня и искала несуществующий
  // `modules/modules/...`.
  const dir = path.resolve(QUERIES, path.dirname(importPath));
  const moduleFile = fs
    .readdirSync(dir)
    .find((file) => file.endsWith('.module.ts'));

  if (!moduleFile) return false;

  const source = activeCode(fs.readFileSync(path.join(dir, moduleFile), 'utf-8'));
  const exportsAt = source.indexOf('exports: [');

  if (exportsAt < 0) return false;

  const exportsBlock = source.slice(
    exportsAt,
    source.indexOf(']', exportsAt) + 1,
  );

  return exportsBlock.includes(className);
}

describe('сервер и правда соберётся: зависимости отдаются наружу', () => {
  const providers = moduleProviders();

  it('сервисы модуля отчётов и правда найдены', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(providers.length).toBeGreaterThan(2);
  });

  providers.forEach((file) => {
    it(`${file}: всё, что просит, доступно ему`, () => {
      const missing = injectedFromModules(file).filter((entry) => {
        const [importPath, className] = entry.split('::');

        return !ownerExports(importPath, className);
      });

      expect(missing).toEqual([]);
    });
  });

  it('проверка умеет отличить закрытый класс от открытого', () => {
    // Без этого сторож мог бы «проходить», ничего не находя.
    expect(
      ownerExports(
        '../modules/BalanceSheet/BalanceSheetApplication',
        'BalanceSheetApplication',
      ),
    ).toBe(true);
    expect(
      ownerExports(
        '../modules/BalanceSheet/BalanceSheetApplication',
        'ТакогоКлассаНет',
      ),
    ).toBe(false);
  });
});
