import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д3 карты v60. Ввоз, который никуда не ведёт.
 *
 * Файл может ввозить пакет, которого нет в проекте, или соседний модуль по
 * несуществующему пути. Продукт при этом собирается — если до такого файла
 * никто не доходит. А значит, поломка живёт в коде месяцами и всплывает в тот
 * день, когда файл кому-то понадобится.
 *
 * Так нашлись 34 мёртвых файла, удалённых картой v60: они ввозили
 * `react-grid-system` и `@tanem/react-nprogress` (таких пакетов в проекте
 * нет), `@/store/media/media.actions` и `../../ReceiptMailDialog/…` (таких
 * модулей нет). Именно несуществующий ввоз и был признаком, по которому их
 * удалось найти — надёжнее, чем дерево доходимости.
 *
 * Правило: каждый ввоз из кода витрины ведёт в существующий файл или в пакет,
 * который стоит в проекте.
 */
const SRC = path.resolve(__dirname);
const WEBAPP = path.resolve(SRC, '..');
const ROOT = path.resolve(WEBAPP, '..', '..');

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
/** Не файлы кода: их подключает сборщик по своим правилам. */
const ASSETS = /\.(s?css|sass|less|svg|png|jpe?g|gif|webp|woff2?|ttf|mp4|md)(\?.*)?$/;

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** Все строки ввоза файла: import, export … from, import(). */
const specifiersOf = (file: string): string[] => {
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      out.push(n.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      out.push((n.arguments[0] as ts.StringLiteral).text);
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return out;
};

const fileExists = (base: string): boolean =>
  EXTENSIONS.some((e) => {
    const p = base + e;
    return fs.existsSync(p) && fs.statSync(p).isFile();
  }) ||
  EXTENSIONS.some((e) => {
    const p = path.join(base, 'index' + e);
    return e !== '' && fs.existsSync(p) && fs.statSync(p).isFile();
  });

/** Встроенные модули Node: их в node_modules нет и быть не должно. */
const isBuiltin = (spec: string): boolean =>
  spec.startsWith('node:') ||
  (require('module') as { builtinModules: string[] }).builtinModules.includes(
    spec.split('/')[0],
  );

const packageExists = (spec: string): boolean => {
  const name = spec.startsWith('@')
    ? spec.split('/').slice(0, 2).join('/')
    : spec.split('/')[0];
  return [WEBAPP, ROOT].some((dir) =>
    fs.existsSync(path.join(dir, 'node_modules', name)),
  );
};

describe('каждый ввоз ведёт куда-то', () => {
  // Проверка читает все файлы витрины (больше трёх тысяч) и под общей
  // нагрузкой не укладывается в пять секунд по умолчанию — в одиночку идёт
  // три, в полном прогоне почти семь (карта v73).
  it('нет ввозов в несуществующие файлы и пакеты', { timeout: 30_000 }, () => {
    const broken: string[] = [];

    for (const file of sourceFiles()) {
      for (const spec of specifiersOf(file)) {
        if (ASSETS.test(spec) || isBuiltin(spec)) continue;
        const rel = path.relative(SRC, file);

        if (spec.startsWith('.')) {
          if (!fileExists(path.resolve(path.dirname(file), spec))) {
            broken.push(`${rel} → ${spec}`);
          }
        } else if (spec.startsWith('@/')) {
          if (!fileExists(path.join(SRC, spec.slice(2)))) {
            broken.push(`${rel} → ${spec}`);
          }
        } else if (!packageExists(spec)) {
          broken.push(`${rel} → ${spec} (пакета нет в проекте)`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('проверка действительно читает ввозы', () => {
    const total = sourceFiles()
      .slice(0, 50)
      .reduce((n, f) => n + specifiersOf(f).length, 0);
    expect(total).toBeGreaterThan(50);
  });
});
