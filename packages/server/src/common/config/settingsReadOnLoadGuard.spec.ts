import * as fs from 'fs';
import * as path from 'path';

/**
 * Н1 карты v38. Настройки не читаются в момент загрузки модуля.
 *
 * Сервер не читает `.env` сам: его читает `ConfigModule` уже во время
 * запуска приложения. Всё, что спросило окружение раньше — на загрузке
 * модуля, — получает пустоту. Так пропал адрес службы печати, и печать
 * отвечала 500 у каждого, кто запускает продукт по инструкции
 * (`cp .env.example .env` → `pnpm dev`). Стенд печатал только потому, что
 * его настройки подставляет systemd до старта процесса.
 *
 * Правило: `process.env` спрашивают внутри функции, метода или геттера —
 * то есть в момент обращения, когда `.env` уже прочитан.
 */
const SRC = path.resolve(__dirname, '../..');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.ts$/.test(entry.name)) return [];
    if (/\.spec\.ts$/.test(entry.name)) return [];
    return [full];
  });

/**
 * Читает ли файл окружение на верхнем уровне или в поле класса.
 *
 * Глубина по фигурным скобкам: ноль — верхний уровень файла. Поле класса
 * лежит глубже, но вычисляется тоже на загрузке, поэтому ловится отдельно
 * по слову `static`.
 */
const readsEnvOnLoad = (code: string): string[] => {
  const offences: string[] = [];
  let depth = 0;

  code.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    const isComment = /^(\/\/|\*|\/\*)/.test(trimmed);

    if (!isComment && line.includes('process.env')) {
      const insideFunction = /=>|function|\(\s*\)\s*[:{]/.test(line);
      const staticField = /^(public |private |protected )?static /.test(trimmed);

      if ((depth === 0 && !insideFunction) || (staticField && !insideFunction)) {
        offences.push(`${index + 1}: ${trimmed.slice(0, 80)}`);
      }
    }

    depth += (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;
  });

  return offences;
};

describe('чтение настроек', () => {
  const files = sourceFiles(SRC);

  it('исходники сервера читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('окружение не спрашивают на загрузке модуля', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const found = readsEnvOnLoad(fs.readFileSync(file, 'utf8'));
      found.forEach((place) =>
        offenders.push(`${path.relative(SRC, file)}:${place}`),
      );
    });

    expect(offenders).toEqual([]);
  });
});
