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

const NODE_RE = new RegExp('>\\s*([^<>{}\\n]*' + CYR + '[^<>{}]*?)\\s*<');
const ATTR_RE = new RegExp(
  '\\b(aria-label|placeholder|title|label|alt)\\s*=\\s*"[^"]*' + CYR,
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

/** Строки кода без комментариев. */
function activeLines(source: string): Array<{ line: number; text: string }> {
  const out: Array<{ line: number; text: string }> = [];
  let inBlock = false;

  source.split('\n').forEach((text, i) => {
    const trimmed = text.trim();

    if (inBlock) {
      if (trimmed.includes('*/')) inBlock = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlock = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    out.push({ line: i + 1, text });
  });

  return out;
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

      activeLines(fs.readFileSync(file, 'utf8')).forEach(({ line, text }) => {
        if (NODE_RE.test(text) || ATTR_RE.test(text)) {
          offenders.push(`${rel}:${line}`);
        }
      });
    });

    expect(offenders).toEqual([]);
  });

  it('список исключений не разрастается', () => {
    // Исключение — это долг, а не разрешение. Два файла правовых документов
    // и ни одного больше.
    expect(ALLOWED).toHaveLength(2);
  });
});
