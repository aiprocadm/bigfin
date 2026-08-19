import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * М3 срез 3 (карта v15). Сервер теперь честно отказывает, когда отчёт не
 * помещается («сузьте период»). Но на экране это было не увидеть: провайдеры
 * отчётов не читали ошибку вовсе, а компоненты лезли в `отчёт.meta` у пустых
 * данных — экран падал в общую заглушку «Что-то пошло не так».
 *
 * Сторож держит обе половины: причина показывается, экран не падает.
 */
const REPORTS = path.resolve(__dirname, '..');

const read = (relative: string) =>
  fs.readFileSync(path.join(REPORTS, relative), 'utf8');

/** Комментарии вырезаем — иначе упоминание в пояснении даёт ложное «ок». */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const PROVIDERS = [
  'GeneralLedger/GeneralLedgerProvider.tsx',
  'Journal/JournalProvider.tsx',
];

const SCREENS = [
  'GeneralLedger/components.tsx',
  'GeneralLedger/GeneralLedgerTable.tsx',
  'Journal/components.tsx',
  'Journal/JournalTable.tsx',
];

describe('отказ тяжёлого отчёта виден человеку', () => {
  it('файлы отчётов на месте', () => {
    // Иначе переименование папки сделало бы сторожа ложно-зелёным.
    [...PROVIDERS, ...SCREENS].forEach((file) => {
      expect(() => read(file)).not.toThrow();
    });
  });

  it('оба провайдера показывают причину отказа', () => {
    const silent = PROVIDERS.filter((file) => {
      const source = withoutComments(read(file));

      return !(source.includes('onError') && source.includes('showApiError'));
    });

    expect(silent).toEqual([]);
  });

  it('экраны отчётов не лезут в meta у пустых данных', () => {
    const unsafe: string[] = [];

    SCREENS.forEach((file) => {
      const source = withoutComments(read(file));

      // `отчёт.meta.` без вопросительного знака = падение при отказе сервера.
      if (/\w\.meta\.\w/.test(source)) {
        unsafe.push(`${file}: обращение к meta без защиты`);
      }
      // Разбор `{ table, meta }` у пустого отчёта тоже роняет экран.
      if (/:\s*\{\s*table,\s*meta\s*\}/.test(source)) {
        unsafe.push(`${file}: разбор table/meta без значения по умолчанию`);
      }
    });
    expect(unsafe).toEqual([]);
  });
});
