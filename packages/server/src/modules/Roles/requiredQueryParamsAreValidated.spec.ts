// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Сторож: обязательный довод запроса проверяется, а не берётся на веру.
 *
 * ЗАЧЕМ. Довод, взятый поштучно (`@Query('from') from: string`), не проходит
 * НИ ОДНОЙ проверки: общий страж разбора работает с видом-описанием, а
 * отдельная строка мимо него. Запрос без такого довода не падает на входе —
 * он доходит до расчёта и падает ТАМ.
 *
 * Наружу при этом уходит «Internal server error»: ответ, который не говорит
 * вызывающему ничего — ни что не так, ни что чинить. Проверено вживую на
 * стенде: `GET /api/vat-analysis` без дат отвечал ровно этим.
 *
 * Бывает и хуже — тихо. Список номеров операций без довода превращался в
 * `[undefined]`, из него получался `NaN`, и действие МОЛЧА не делало ничего:
 * человек нажимал кнопку, а операции оставались как были.
 *
 * ПРАВИЛО. Поштучный `@Query('имя')` допустим ТОЛЬКО для необязательного
 * довода (`имя?: тип`). Всё обязательное описывается видом и проверяется
 * стражем разбора до входа в метод.
 *
 * Исключений нет ни одного — и это единственное состояние, в котором такое
 * правило держится: список исключений длиннее правила отключают.
 */
const SRC = path.resolve(__dirname, '../..');

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (entry.name.endsWith('.controller.ts')) acc.push(full);
  });
  return acc;
}

/** Обязательные поштучные доводы запроса в одном файле. */
function requiredNamedQueryParams(file: string): string[] {
  const source = fs.readFileSync(file, 'utf-8');
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];

  const walk = (node: ts.Node) => {
    if (ts.isParameter(node)) {
      const decorators = ts.getDecorators
        ? ts.getDecorators(node)
        : (node as any).decorators;

      (decorators ?? []).forEach((decorator: ts.Decorator) => {
        const call = decorator.expression;
        if (!ts.isCallExpression(call)) return;
        if (call.expression.getText(parsed) !== 'Query') return;
        // `@Query()` без имени — это и есть вид-описание, он в порядке.
        if (call.arguments.length === 0) return;
        // Необязательный довод проверять незачем: его отсутствие — обычное
        // дело, и код обязан его пережить.
        if (node.questionToken) return;

        const { line } = parsed.getLineAndCharacterOfPosition(
          node.getStart(parsed),
        );
        found.push(`${call.arguments[0].getText(parsed)} (строка ${line + 1})`);
      });
    }
    ts.forEachChild(node, walk);
  };

  walk(parsed);
  return found;
}

describe('обязательные доводы запроса проверяются', () => {
  const files = collect(SRC);

  it('ручки найдены', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('нет обязательных доводов, взятых поштучно', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      requiredNamedQueryParams(file).forEach((hit) => {
        offenders.push(`${path.relative(SRC, file)}: ${hit}`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it('проверка и правда ловит такой довод', () => {
    // Без этого сторож мог бы «проходить» из-за ошибки в самом правиле.
    const sample = path.join(SRC, '__query-probe.controller.ts');
    fs.writeFileSync(
      sample,
      'class C { m(@Query("from") from: string) { return from; } }\n',
    );

    try {
      expect(requiredNamedQueryParams(sample)).toHaveLength(1);
    } finally {
      fs.unlinkSync(sample);
    }
  });

  it('необязательный довод не считается', () => {
    const sample = path.join(SRC, '__query-probe-optional.controller.ts');
    fs.writeFileSync(
      sample,
      'class C { m(@Query("from") from?: string) { return from; } }\n',
    );

    try {
      expect(requiredNamedQueryParams(sample)).toEqual([]);
    } finally {
      fs.unlinkSync(sample);
    }
  });
});
