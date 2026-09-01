// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Имена стандартных списков («Черновик», «Оплачен», «Просрочен») видит
 * пользователь в каждом разделе. Половина модулей уже переведена на ключи
 * (кредит-ноты, возвраты поставщику), половина отдавала сырое английское
 * слово — и русская организация видела «Draft» рядом с «Черновик»
 * (Р4 карты v18).
 *
 * Сторож простой: имя стандартного списка — это ключ перевода, а не текст.
 * Ключ узнаётся по точке и нижнему регистру; готовый текст — по заглавной
 * букве или пробелу.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

const constantsFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return constantsFiles(full);
    return /\.constants\.ts$|(^|\/)constants\.ts$/.test(full) ? [full] : [];
  });

/** Имена внутри массивов `*DefaultViews`. */
const viewNames = (source: string): string[] => {
  const blocks = source.matchAll(
    /DefaultViews\s*(?::[^=]*)?=\s*\[([\s\S]*?)\n\];/g,
  );
  return [...blocks].flatMap((block) =>
    [...block[1].matchAll(/^\s*name:\s*'([^']+)'/gm)].map((m) => m[1]),
  );
};

const isTranslationKey = (name: string) => /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(name);

describe('имена стандартных списков — ключи перевода', () => {
  const files = constantsFiles(MODULES_DIR);
  const found = files.flatMap((file) =>
    viewNames(activeCode(fs.readFileSync(file, 'utf8'))).map((name) => ({
      file: path.relative(MODULES_DIR, file).split(path.sep).join('/'),
      name,
    })),
  );

  it('списки вообще нашлись', () => {
    // Иначе сломанный разбор сделал бы проверку ниже пустой и зелёной.
    expect(found.length).toBeGreaterThan(30);
  });

  it('ни одно имя не осталось готовым английским текстом', () => {
    const raw = found.filter((entry) => !isTranslationKey(entry.name));

    expect(raw.map((entry) => `${entry.file}#${entry.name}`)).toEqual([]);
  });
});
