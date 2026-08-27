// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Д1 карты v30. Знак валюты не глушится молча.
 *
 * Изъян жил в одной строке общего помощника: `money: false` по умолчанию.
 * Общая утилита продукта печатает суммы СО знаком, а помощник его снимал —
 * и каждый трансформер обязан был вспомнить про `money: true` руками.
 * Вспомнили 14 раз, забыли 90.
 *
 * Сторож держит две вещи: умолчание помощника и короткий список мест, где
 * знак снимают ОСОЗНАННО. Новое такое место придётся вписать в список
 * руками — тогда это решение автора, а не забытый флаг.
 */
const SRC = path.resolve(__dirname, '../..');
const HELPER = path.resolve(__dirname, 'Transformer.ts');

/** Места, где сумма показывается голым числом намеренно. */
const ALLOWED_BARE = [
  // Ставка и итог строки документа: значения подставляются в поля ввода
  // формы, знак валюты там мешает вводу.
  'modules/TransactionItemEntry/ItemEntry.transformer.ts',
  // Сумма статьи расхода — то же самое: правится в форме расхода.
  'modules/Expenses/queries/ExpenseCategory.transformer.ts',
];

/** Аргументы вызова со сбалансированными скобками. */
const calls = (source: string): { position: number; args: string }[] => {
  const needle = 'this.formatNumber(';
  const found: { position: number; args: string }[] = [];
  let i = source.indexOf(needle);

  while (i !== -1) {
    let j = i + needle.length;
    let depth = 1;
    while (j < source.length && depth > 0) {
      const ch = source[j];
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
      j += 1;
    }
    found.push({ position: i, args: source.slice(i + needle.length, j - 1) });
    i = source.indexOf(needle, j);
  }
  return found;
};

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!entry.name.endsWith('.ts')) return [];
    if (entry.name.endsWith('.spec.ts')) return [];
    return [full];
  });

const bareMoneyCalls = () => {
  const offenders: string[] = [];

  sourceFiles(SRC).forEach((file) => {
    const code = fs.readFileSync(file, 'utf8');
    const relative = path.relative(SRC, file).split(path.sep).join('/');

    calls(code).forEach(({ position, args }) => {
      if (!args.includes('currencyCode')) return;
      if (!/money:\s*false/.test(args)) return;

      const line = code.slice(0, position).split('\n').length;
      offenders.push(`${relative}:${line}`);
    });
  });
  return offenders;
};

describe('знак валюты не глушится молча', () => {
  it('общий помощник не выключает знак по умолчанию', () => {
    const helper = fs.readFileSync(HELPER, 'utf8');
    const call = helper.match(
      /protected formatNumber\([\s\S]*?return formatNumber\(([\s\S]*?)\);/,
    );

    expect(call).not.toBeNull();
    // Умолчание считается по валюте, а не прибито к «без знака».
    expect(call?.[1]).toContain('currencyCode');
    expect(call?.[1]).not.toMatch(/money:\s*false/);
  });

  it('голым числом сумма показывается только в перечисленных местах', () => {
    const unexpected = bareMoneyCalls().filter(
      (place) => !ALLOWED_BARE.some((allowed) => place.startsWith(allowed)),
    );

    expect(unexpected).toEqual([]);
  });

  it('список исключений не устарел', () => {
    // Место починили — строка должна уйти из списка, а не висеть вечно.
    const places = bareMoneyCalls();
    const stale = ALLOWED_BARE.filter(
      (allowed) => !places.some((place) => place.startsWith(allowed)),
    );

    expect(stale).toEqual([]);
  });
});
