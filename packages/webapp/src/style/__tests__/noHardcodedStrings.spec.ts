import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: видимый текст не зашит в разметку.
 *
 * Зачем. Зашитая подпись не переводится. В английской локали человек видел
 * русские слова — «Пароль», «Подтвердите пароль», «Уведомления». Поймать это
 * глазами почти невозможно: разработчик смотрит на русский интерфейс, и там
 * всё выглядит правильно.
 *
 * Сторож смотрит два места: текстовый узел между тегами и подписи-атрибуты
 * (`aria-label`, `placeholder`, `title`, `label`, `alt`). Комментарии кода не
 * в счёт — пояснения по-русски писать не только можно, но и нужно.
 */
const SRC = path.resolve(__dirname, '../..');

/**
 * Файлы, где русский текст в разметке оставлен намеренно.
 *
 * Правовые страницы — это документы, а не подписи интерфейса. Их перевод
 * решает владелец вместе с юристом: машинный перевод соглашения об оказании
 * услуг опаснее русского оригинала, потому что выглядит официально и при
 * этом не имеет силы.
 */
const ALLOWED = [
  'components/legal/PrivacyPage.tsx',
  'components/legal/TermsPage.tsx',
];

const SKIP = /node_modules|\/lang\/|\.spec\.|\.stories\.|__tests__/;
const CYR = '[А-Яа-яЁё]';

/**
 * Текстовый узел между тегами.
 *
 * ВАЖНО: без `\n` в отрицании. Сначала здесь стояло `[^<>{}\n]*`, и проверка
 * шла ПОСТРОЧНО — а разметка после форматирования почти всегда кладёт текст на
 * СВОЮ строку:
 *
 *     >
 *       Забыли пароль?
 *     </Link>
 *
 * `>` на одной строке, текст на другой, `<` на третьей — построчная проверка
 * такое не видит вовсе. Сторож был зелёным, пока вся форма входа говорила
 * зашитыми словами. Теперь читается файл целиком.
 */
const NODE_RE = new RegExp('>\\s*([^<>{}]*' + CYR + '[^<>{}]*?)\\s*<', 'g');
const ATTR_RE = new RegExp(
  '\\b(aria-label|placeholder|title|label|alt)\\s*=\\s*"[^"]*' + CYR,
  'g',
);

function collect(dir: string, acc: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (SKIP.test(full.replace(/\\/g, '/'))) return;
    if (entry.isDirectory()) {
      collect(full, acc);
      return;
    }
    if (entry.name.endsWith('.tsx')) acc.push(full);
  });

  return acc;
}

/**
 * Исходник без комментариев, но ТОЙ ЖЕ длины.
 *
 * Комментарии заменяются пробелами, а не вырезаются: так номера строк в
 * сообщении остаются настоящими, и найденное место можно открыть.
 *
 * Пояснения по-русски в комментариях писать не только можно, но и нужно —
 * иначе следующий не поймёт, почему нельзя.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (m, prefix) => prefix + ' '.repeat(m.length - prefix.length),
    );
}

/** Номер строки по положению в тексте. */
function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Места с зашитым текстом в одном файле. */
function findHardcoded(source: string): Array<{ line: number; text: string }> {
  const clean = withoutComments(source);
  const found: Array<{ line: number; text: string }> = [];

  [NODE_RE, ATTR_RE].forEach((re) => {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(clean)) !== null) {
      found.push({
        line: lineAt(clean, match.index),
        text: (match[1] ?? match[0]).trim().slice(0, 60),
      });
    }
  });

  return found;
}

describe('видимый текст не зашит в разметку', () => {
  const files = collect(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(500);
  });

  it('новых зашитых подписей не появилось', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const rel = path.relative(SRC, file).replace(/\\/g, '/');

      if (ALLOWED.includes(rel)) return;

      findHardcoded(fs.readFileSync(file, 'utf8')).forEach(({ line, text }) => {
        offenders.push(`${rel}:${line} — ${text}`);
      });
    });

    expect(offenders).toEqual([]);
  });

  it('проверка и правда видит текст на своей строке', () => {
    // Ради этого сторож и переписан: именно так разметка выглядит после
    // форматирования, и именно этого он раньше не видел.
    const sample = ['<Link>', '  Забыли пароль?', '</Link>'].join('\n');

    expect(findHardcoded(sample)).toHaveLength(1);
  });

  it('пояснения в комментариях не считаются', () => {
    const sample = ['// Забыли пароль?', '<Link>{intl.get("x")}</Link>'].join(
      '\n',
    );

    expect(findHardcoded(sample)).toEqual([]);
  });

  it('список исключений не разрастается', () => {
    // Исключение — это долг, а не разрешение. Два файла правовых документов
    // и ни одного больше.
    expect(ALLOWED).toHaveLength(2);
  });
});
