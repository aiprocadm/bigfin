import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * М3 срез 4 (карта v15): сервер теперь честно отказывает, когда выгрузка не
 * помещается. Но одиночная выгрузка показывала безликое «что-то пошло не
 * так» (ошибку даже не принимала в аргумент), а выгрузка PDF молчала вовсе —
 * `.catch` не было. Причина отказа до человека не доходила.
 */
const WEBAPP_SRC = path.resolve(__dirname, '../../../..');

const read = (relative: string) =>
  fs.readFileSync(path.join(WEBAPP_SRC, relative), 'utf8');

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const PLACES = [
  'containers/Dialogs/ExportDialog/ExportDialogForm.tsx',
  'hooks/query/FinancialReports/use-export-pdf.ts',
];

describe('отказ выгрузки виден человеку', () => {
  it('файлы выгрузки на месте', () => {
    PLACES.forEach((file) => {
      expect(() => read(file)).not.toThrow();
    });
  });

  it('везде показывается причина отказа', () => {
    const silent = PLACES.filter(
      (file) => !withoutComments(read(file)).includes('showApiError'),
    );

    expect(silent).toEqual([]);
  });

  it('одиночная выгрузка не подменяет причину общим текстом', () => {
    const source = withoutComments(
      read('containers/Dialogs/ExportDialog/ExportDialogForm.tsx'),
    );

    // «Что-то пошло не так» вместо кода ошибки — это и есть потеря причины.
    expect(source).not.toContain("intl.get('something_went_wrong')");
  });

  it('выгрузка PDF ловит ошибку, а не роняет её в пустоту', () => {
    const source = withoutComments(
      read('hooks/query/FinancialReports/use-export-pdf.ts'),
    );

    expect(source).toContain('.catch(');
  });
});
