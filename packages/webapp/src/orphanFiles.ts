// © 2026 Bigfin
import fs from 'fs';
import path from 'path';

/**
 * Файлы-сироты: до них нельзя добраться от точки входа продукта.
 *
 * Такой файл не попадает в сборку и не выполняется никогда — но он лежит в
 * дереве, его читают глазами, его правят и на него ссылаются в разговорах, как
 * будто он живой.
 *
 * Разбор нарочно простой: только ввозы по строке пути. Он не понимает путей,
 * собранных из кусков, — поэтому число сирот считается **сверху вниз** (ratchet)
 * и служит порогом, а не точным списком.
 */
export const SRC = path.resolve(__dirname);

/** Точка входа продукта — то, с чего начинает сборщик. */
export const ENTRY = path.join(SRC, 'index.tsx');

export const allSourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** «@/x» и «./x» → настоящий файл. */
export const resolveImport = (spec: string, from: string): string | null => {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;

  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
};

/**
 * Ввозы, записанные строкой целиком.
 *
 * Границы слова (`\b`) и обязательные скобки — не украшение. Без них слово
 * `import` внутри обычной строки (ключ перевода `'accounts_import'`) считалось
 * началом ввоза, разбор сбивался с кавычек и **дальше по файлу читал мусор**.
 * Файл маршрутов из-за этого «терял» половину экранов, и они попадали в сироты
 * (Д1 карты v79).
 */
const IMPORT_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

/** Пути ввозов, найденные в тексте. Вынесено отдельно ради проверки разбора. */
export const importSpecifiers = (code: string): string[] =>
  [...code.matchAll(IMPORT_RE)].map((m) => m[1]);

export const importsOf = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const spec of importSpecifiers(code)) {
    const target = resolveImport(spec, file);
    if (target) out.push(target);
  }
  return out;
};

/** Всё, до чего можно добраться от заданных корней. */
export const reachableFrom = (roots: string[]): Set<string> => {
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const f = queue.shift() as string;
    for (const dep of importsOf(f)) {
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return seen;
};

/**
 * Сироты: не достижимы ни от точки входа, ни от проверочных файлов.
 *
 * Проверочные файлы считаются корнями нарочно: сторож, который читает исходники
 * продукта, — не сирота, даже если продукт его не ввозит.
 */
export const orphanFiles = (): string[] => {
  const files = allSourceFiles();
  const specs = files.filter((f) => /\.spec\.(tsx?|jsx?)$/.test(f));
  const live = reachableFrom([ENTRY, ...specs]);
  return files.filter((f) => !live.has(f) && !specs.includes(f));
};
