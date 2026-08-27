import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { accountBalanceText } from './accountBalance';

/**
 * С2 карты v29. Счёт без движений показывает ноль, а не прочерк.
 *
 * В плане счетов и в списке касс баланс печатался прочерком, когда сервер
 * присылал `amount: null`. Замер показал: пустой баланс бывает РОВНО там,
 * где по счёту ноль проводок, — то есть это самый обыкновенный ноль, а не
 * «неизвестно». Продукт при этом сам себе противоречил: уведомление
 * говорило «остаток ниже минимума», сводка на главной писала «0,00 ₽», а
 * экран счетов — прочерк.
 *
 * Для человека прочерк выглядит поломкой («деньги не посчитались»), ноль —
 * спокойным ответом.
 */
const NBSP = '\u00A0';
const SRC = path.resolve(__dirname, '..');

describe('баланс счёта', () => {
  it('счёт без движений показывает ноль в валюте счёта', () => {
    expect(accountBalanceText(null, null, 'RUB')).toBe(`0,00${NBSP}₽`);
  });

  it('готовую подпись сервера не переписываем', () => {
    expect(accountBalanceText(1628838.59, `1${NBSP}628${NBSP}838,59${NBSP}₽`, 'RUB')).toBe(
      `1${NBSP}628${NBSP}838,59${NBSP}₽`,
    );
  });

  it('число без готовой подписи форматируется само', () => {
    expect(accountBalanceText(1500, null, 'RUB')).toBe(`1${NBSP}500,00${NBSP}₽`);
  });

  it('ноль на счёте остаётся нулём, а не пустотой', () => {
    // formattedAmount умеет печатать ноль пустой строкой (noZero) — здесь
    // это было бы той же бедой, что прочерк.
    expect(accountBalanceText(0, null, 'RUB')).toBe(`0,00${NBSP}₽`);
  });

  it('без валюты счёта печатаем рублями — продукт российский', () => {
    expect(accountBalanceText(null, null, null)).toContain('₽');
  });
});

describe('прочерков вместо баланса не осталось', () => {
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (!/\.(ts|tsx)$/.test(entry.name)) return [];
      if (/\.spec\.tsx?$/.test(entry.name)) return [];
      return [full];
    });

  it('никто не подставляет прочерк вместо суммы счёта', () => {
    const offenders: string[] = [];

    sourceFiles(SRC).forEach((file) => {
      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      // Три способа, какими прочерк попадал на экран вместо суммы:
      // тернарник по amount, «заглушка» с длинным тире и мнемоника &mdash;
      // рядом с проверкой amount.
      const dashFallback =
        /amount[^\n]{0,80}\?[^\n]{0,120}:\s*['"][—-]['"]/.test(code) ||
        /className=["']placeholder["'][^>]*>\s*[—-]/.test(code) ||
        /amount\s*!==?\s*null[\s\S]{0,200}?&mdash;/.test(code);

      if (dashFallback) offenders.push(path.relative(SRC, file));
    });

    expect(offenders).toEqual([]);
  });
});
