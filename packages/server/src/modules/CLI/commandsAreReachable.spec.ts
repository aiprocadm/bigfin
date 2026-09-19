// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сторож: каждая написанная команда и правда запускается.
 *
 * ЗАЧЕМ. Заполнение юрлица (этап 6, §6.3 шаг 3) было написано, покрыто
 * тестами и... не запускалось ничем: службу звали только из очереди задач, а
 * поставить задачу в очередь не умел никто. Получилось «построено, но ничем
 * не запускается» — код есть, прогон зелёный, а на живой базе колонка так и
 * остаётся пустой.
 *
 * Класс поломок опасен именно тишиной: ни одна проверка кода его не видит,
 * потому что с кодом всё в порядке. Поймать можно только вопросом «а кто это
 * зовёт?» — этот сторож задаёт его за нас.
 *
 * Проверяются три звена цепочки:
 *   1. файл команды лежит в каталоге `commands/`;
 *   2. класс перечислен в `CLI.module.ts` — иначе Nest о нём не узнает;
 *   3. у команды есть ярлык запуска в `package.json` сервера.
 */
const COMMANDS_DIR = path.resolve(__dirname, 'commands');
const MODULE_FILE = path.resolve(__dirname, 'CLI.module.ts');
const SERVER_PACKAGE = path.resolve(__dirname, '../../../package.json');

/** Файлы команд: `<Имя>.command.ts`, кроме основы и вспомогательных. */
const commandFiles = fs
  .readdirSync(COMMANDS_DIR)
  .filter((name) => name.endsWith('.command.ts'))
  .sort();

const moduleSource = fs.readFileSync(MODULE_FILE, 'utf-8');
const packageSource = fs.readFileSync(SERVER_PACKAGE, 'utf-8');

/**
 * Список `providers` модуля — и только он.
 *
 * Сначала здесь стояла проверка «имя класса встречается в файле модуля», и
 * она оказалась слепой: строка `import` с именем класса остаётся на месте,
 * даже когда сам класс из списка убрали. Проба на подмену это и показала —
 * убранная команда прошла проверку. Читаем ровно тот список, который решает
 * дело.
 */
const providersList = (() => {
  const match = moduleSource.match(/providers:\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error('В CLI.module.ts не нашёлся список providers');
  }
  return match[1];
})();

/** Имя класса команды из её файла. */
const className = (file: string): string => {
  const source = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf-8');
  const match = source.match(/export class (\w+) extends (?:BaseCommand|CommandRunner)/);
  return match ? match[1] : '';
};

/** Имя команды из декоратора `@Command({ name: '...' })`. */
const commandName = (file: string): string => {
  const source = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf-8');
  const match = source.match(/name:\s*'([^']+)'/);
  return match ? match[1] : '';
};

describe('команды cli и правда запускаются', () => {
  it('файлы команд найдены', () => {
    expect(commandFiles.length).toBeGreaterThan(5);
  });

  commandFiles.forEach((file) => {
    const cls = className(file);
    const name = commandName(file);

    it(`${file}: класс объявлен`, () => {
      expect(cls).not.toBe('');
    });

    it(`${file}: класс перечислен в списке providers модуля`, () => {
      // Без этого Nest о команде не знает: в терминале она просто
      // «неизвестная команда», хотя файл лежит на месте и даже ввезён.
      expect(providersList).toContain(cls);
    });

    it(`${file}: у команды есть имя в декораторе`, () => {
      expect(name).toMatch(/^[a-z][\w:-]+$/);
    });

    it(`${file}: есть ярлык запуска в package.json сервера`, () => {
      // Ярлык — то, чем командой пользуются при выкатке. Команда без
      // ярлыка живёт только в голове того, кто её написал.
      expect(packageSource).toContain(`src/cli.ts ${name}`);
    });
  });
});
