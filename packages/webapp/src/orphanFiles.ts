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

/** Корень пакета витрины — над `src`. */
export const PACKAGE_ROOT = path.dirname(SRC);

/** Точка входа продукта — то, с чего начинает сборщик. */
export const ENTRY = path.join(SRC, 'index.tsx');

export const allSourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** Путь от `src` в единой записи — на Windows разделитель другой. */
const relPosix = (file: string): string =>
  path.relative(SRC, file).split(path.sep).join('/');

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

/** Проверочный файл: `*.spec.*` и `*.test.*` — прогонщик берёт оба вида. */
export const isCheckFile = (file: string): boolean =>
  /\.(spec|test)\.(tsx?|jsx?)$/.test(file);

/**
 * Папки, чьи истории собирает Storybook.
 *
 * Список берётся **из самой настройки**, а не переписывается сюда руками:
 * иначе он разойдётся с `.storybook/main.ts` при первой же новой папке, и
 * истории снова начнут числиться мёртвыми (Д1 карты v80).
 */
export const storyRoots = (): string[] => {
  const config = path.join(PACKAGE_ROOT, '.storybook', 'main.ts');
  if (!fs.existsSync(config)) return [];
  const text = fs.readFileSync(config, 'utf8');
  const dirs = [...text.matchAll(/['"]\.\.\/src\/(.+?)\/\*\*\/\*\.stories\./g)].map(
    (m) => m[1],
  );
  return [...new Set(dirs)];
};

/** Файл истории Storybook из папки, которую эта настройка действительно берёт. */
export const isStoryFile = (file: string, roots = storyRoots()): boolean =>
  /\.stories\.tsx?$/.test(file) &&
  roots.some((dir) => relPosix(file).startsWith(`${dir}/`));

/**
 * Файлы подготовки прогона — их подключает `vitest`, а не чей-то ввоз.
 *
 * Тоже читаются из настройки, по той же причине, что и папки историй.
 */
export const setupFiles = (): string[] => {
  const config = path.join(PACKAGE_ROOT, 'vite.config.mts');
  if (!fs.existsSync(config)) return [];
  const text = fs.readFileSync(config, 'utf8');
  const block = text.match(/setupFiles:\s*\[([^\]]*)\]/);
  if (!block) return [];
  return [...block[1].matchAll(/['"]\.\/src\/([^'"]+)['"]/g)]
    .map((m) => path.join(SRC, m[1]))
    .filter((f) => fs.existsSync(f));
};

/** Объявление типов: его подключает `tsconfig`, ввозить его никто не обязан. */
export const isAmbientTypes = (file: string): boolean => /\.d\.ts$/.test(file);

/**
 * Всё, что запускается само, не дожидаясь ввоза.
 *
 * Корней три вида, и каждый добавлен потому, что его отсутствие уже соврало:
 * проверочные файлы, истории Storybook и файлы подготовки прогона.
 */
export const rootFiles = (files = allSourceFiles()): string[] => {
  const roots = storyRoots();
  return [
    ENTRY,
    ...setupFiles(),
    ...files.filter((f) => isCheckFile(f) || isStoryFile(f, roots)),
  ];
};

/**
 * Сироты: не достижимы ни от одного из корней.
 *
 * Объявления типов (`.d.ts`) сиротами не считаются: их берёт проверка типов по
 * списку из `tsconfig`, и ввоза для них не бывает вовсе.
 */
export const orphanFiles = (): string[] => {
  const files = allSourceFiles();
  const roots = rootFiles(files);
  const live = reachableFrom(roots);
  return files.filter(
    (f) => !live.has(f) && !roots.includes(f) && !isAmbientTypes(f),
  );
};

/** Текст без комментариев — чтобы закомментированный ввоз не считался ввозом. */
export const withoutComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * Ввозы внутри пакета, которые никуда не ведут.
 *
 * Зачем отдельно от сирот: сборка проверяет только то, что сама собирает.
 * Истории Storybook в CI не собираются, поэтому удаление файла, который нужен
 * только истории, не поймала бы ни одна проверка (Д2 карты v80).
 */
export const brokenImports = (): string[] => {
  const out: string[] = [];
  for (const file of allSourceFiles()) {
    // В проверочных файлах ввозы встречаются образцами внутри строк.
    if (isCheckFile(file)) continue;
    const code = withoutComments(fs.readFileSync(file, 'utf8'));
    for (const spec of importSpecifiers(code)) {
      if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
      if (resolveImport(spec, file)) continue;
      // Не-код (стили, картинки) разрешается своим набором расширений.
      const base = spec.startsWith('@/')
        ? path.join(SRC, spec.slice(2))
        : path.resolve(path.dirname(file), spec);
      if (fs.existsSync(base)) continue;
      out.push(`${relPosix(file)} → ${spec}`);
    }
  }
  return out;
};
