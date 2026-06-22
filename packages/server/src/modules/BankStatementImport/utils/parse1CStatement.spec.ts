import { decodeStatementBuffer } from './decodeStatement';

describe('decodeStatementBuffer', () => {
  it('декодирует windows-1251 в кириллицу', () => {
    // 0xCE 0xCE 0xCE = "ООО" в cp1251
    const buf = Buffer.from([0xce, 0xce, 0xce]);
    expect(decodeStatementBuffer(buf)).toBe('ООО');
  });

  it('декодирует UTF-8 с BOM', () => {
    const buf = Buffer.from('﻿Привет', 'utf8');
    expect(decodeStatementBuffer(buf)).toBe('Привет');
  });
});
