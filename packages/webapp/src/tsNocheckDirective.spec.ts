// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import { findOffenders } from '../../../scripts/check-no-new-ts-nocheck.mjs';

/**
 * П3 карты v42. Сторож не путает упоминание с директивой.
 *
 * Запрет новых `@ts-nocheck` искал подстроку в любой добавленной строке.
 * Поэтому он останавливал коммит, в котором про этот самый запрет
 * НАПИСАНО словами: комментарий «запрет новых @ts-nocheck» он считал
 * нарушением. Сторожа, о котором нельзя написать в документации, обходят
 * флагом `--no-verify` — и тогда он не сторожит вовсе.
 *
 * Директива TypeScript — это комментарий, который с неё и начинается.
 * Упоминание внутри фразы директивой не является.
 */
const diff = (file: string, ...lines: string[]) =>
  [`+++ b/${file}`, '@@ -0,0 +1 @@', ...lines.map((l) => `+${l}`)].join('\n');

describe('запрет новых @ts-nocheck', () => {
  it('ловит настоящую директиву', () => {
    expect(findOffenders(diff('a.ts', '// @ts-nocheck'))).toEqual(['a.ts:1']);
  });

  it('ловит директиву с пояснением и лишними пробелами', () => {
    expect(findOffenders(diff('a.ts', '//   @ts-nocheck — легаси'))).toEqual([
      'a.ts:1',
    ]);
  });

  it('ловит директиву в блочном комментарии', () => {
    expect(findOffenders(diff('a.ts', ' * @ts-nocheck'))).toEqual(['a.ts:1']);
  });

  it('не считает нарушением упоминание в тексте', () => {
    const text = '// Хук блокирует новые @ts-nocheck в коде проекта.';

    expect(findOffenders(diff('a.ts', text))).toEqual([]);
  });

  it('не считает нарушением упоминание в строке кода', () => {
    const code = "const TS_NOCHECK = /@ts-nocheck/;";

    expect(findOffenders(diff('a.ts', code))).toEqual([]);
  });
});
