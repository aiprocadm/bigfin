import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Карта v42. Сторожа, которых никто не сторожит.
 *
 * У проекта есть проверки, которые молча не выполняются:
 *
 * - git-хуки лежат в репозитории БЕЗ бита исполняемости, и git пропускает
 *   их с подсказкой «hook was ignored». Коммит проходит, запрет новых
 *   `@ts-nocheck` и разбор сообщения коммита не отрабатывают — у всех, а
 *   не на одной машине;
 * - версия Node объявлена в четырёх местах и в двух вариантах: `.nvmrc`
 *   держит 18.16.1, а процессы CI просят плавающую «18».
 */
const ROOT = path.resolve(__dirname, '../../..');

const read = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), 'utf8');

/** Режим файла, каким его хранит сам репозиторий, а не рабочая копия. */
const gitFileModes = (dir: string): Array<[string, string]> => {
  const out = execFileSync('git', ['ls-files', '-s', dir], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t');
      return [file, meta.split(' ')[0]] as [string, string];
    });
};

describe('проверки, которые должны выполняться', () => {
  it('git-хуки прочитаны', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(gitFileModes('.husky').length).toBeGreaterThan(1);
  });

  it('каждый git-хук исполняемый в самом репозитории', () => {
    const notExecutable = gitFileModes('.husky')
      .filter(([file]) => !file.includes('/_/'))
      .filter(([, mode]) => mode !== '100755')
      .map(([file]) => file);

    expect(notExecutable).toEqual([]);
  });

  it('процессы CI берут версию Node из .nvmrc, а не пишут свою', () => {
    // Два источника правды разъезжаются молча: `.nvmrc` фиксирует 18.16.1,
    // а «18» в процессе — это любая свежая 18.x.
    const workflows = fs
      .readdirSync(path.join(ROOT, '.github/workflows'))
      .filter((name) => name.endsWith('.yml'));

    const hardcoded = workflows.filter((name) =>
      /node-version:\s*['"]?\d/.test(read(`.github/workflows/${name}`)),
    );

    expect(hardcoded).toEqual([]);
  });
});
