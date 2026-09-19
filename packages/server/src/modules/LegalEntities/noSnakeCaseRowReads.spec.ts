// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Сторож: в модуле юрлиц не читают свойства строк змеиным именем.
 *
 * ЗАЧЕМ. knex настроен с отображением имён
 * (`knexSnakeCaseMappers({ upperCase: true })`): в запрос уходит
 * `legal_entity_id`, в базе колонка `LEGAL_ENTITY_ID`, а В ОТВЕТ приходит
 * `legalEntityId`. Чтение `row.legal_entity_id` даёт `undefined` ВСЕГДА.
 *
 * Молчаливость этой ошибки — главное в ней. Ничего не падает:
 *
 *   - счётчик счетов у юрлица показывал «0» у каждого, хотя счета были;
 *   - отчёт «Внутригрупповые обороты» складывал ВСЕ ноги в одну группу
 *     (ключ получался «undefined:undefined») и показывал одну строку-
 *     бессмыслицу вместо переводов между юрлицами.
 *
 * Тесты при этом были зелёными: подделка knex в них отдавала строки
 * змеиными именами, то есть повторяла ту же ошибку.
 *
 * Почему сторож только на этот модуль. По всему серверу змеиные имена
 * законны: так говорят внешние службы (Plaid, Ozon, Telegram, Stripe), так
 * называются флаги команд и поля публичного API. Общий запрет пришлось бы
 * снабдить списком исключений длиннее самого правила — а правило, которое
 * больше про исключения, отключают. Здесь же весь модуль работает только со
 * своей базой, и исключений не нужно ни одного.
 *
 * Проверяем РАЗБОРОМ КОДА, а не поиском по тексту: иначе в улов попали бы
 * строки вроде `.select('legal_entity_id')`, которые как раз правильны —
 * имена в запросе отображение переводит само.
 */
const MODULE_DIR = __dirname;

/** Имя вида `legal_entity_id`. */
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (entry.name.endsWith('.ts')) acc.push(full);
  });
  return acc;
}

/** Обращения к свойствам со змеиным именем в одном файле. */
function snakeReads(file: string): string[] {
  const source = fs.readFileSync(file, 'utf-8');
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];

  const walk = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.name) &&
      SNAKE.test(node.name.text)
    ) {
      const { line } = parsed.getLineAndCharacterOfPosition(
        node.name.getStart(parsed),
      );
      found.push(`${node.name.text} (строка ${line + 1})`);
    }
    ts.forEachChild(node, walk);
  };

  walk(parsed);
  return found;
}

describe('в модуле юрлиц не читают строки змеиным именем', () => {
  const files = collect(MODULE_DIR);

  it('файлы модуля найдены', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('обращений вида row.legal_entity_id нет', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      snakeReads(file).forEach((hit) => {
        offenders.push(`${path.relative(MODULE_DIR, file)}: ${hit}`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it('проверка и правда ловит такое обращение', () => {
    // Без этого сторож мог бы «проходить» из-за ошибки в самом правиле.
    const sample = path.join(MODULE_DIR, '__snake-probe.ts');
    fs.writeFileSync(sample, 'const x: any = {};\nconst y = x.legal_entity_id;\n');

    try {
      expect(snakeReads(sample)).toHaveLength(1);
    } finally {
      fs.unlinkSync(sample);
    }
  });

  it('имя колонки В ЗАПРОСЕ строкой — это правильно и не считается', () => {
    const sample = path.join(MODULE_DIR, '__snake-probe-ok.ts');
    fs.writeFileSync(
      sample,
      "const knex: any = {};\nconst q = knex('accounts').select('legal_entity_id');\n",
    );

    try {
      expect(snakeReads(sample)).toEqual([]);
    } finally {
      fs.unlinkSync(sample);
    }
  });
});
