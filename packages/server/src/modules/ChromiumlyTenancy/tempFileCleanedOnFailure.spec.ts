import * as fs from 'fs';
import * as path from 'path';

/**
 * Н3 карты v38. За сорвавшейся печатью не остаётся мусор.
 *
 * Печать пишет временный html-файл, отдаёт службе печати ссылку на него и
 * потом убирает файл вместе с записью о нём в базе. Уборка стояла ПОСЛЕ
 * превращения в PDF — то есть при сбое не выполнялась вовсе.
 *
 * Обнаружено на своей же пробе: четыре неудачных печати оставили в
 * `public/pdf` четыре файла `document-print-*.html`, и так было бы при
 * каждой попытке — на диске и в таблице документов.
 *
 * Проверка читает исходник: уборка обязана стоять в `finally`.
 */
const SERVICE = path.resolve(__dirname, 'ChromiumlyHtmlConvert.service.ts');

describe('печать убирает за собой', () => {
  const code = fs.readFileSync(SERVICE, 'utf8');

  it('исходник службы печати читается', () => {
    expect(code).toContain('writeTempHtmlFile');
  });

  it('уборка временного файла стоит в finally', () => {
    const finallyBlock = /finally\s*{[^}]*cleanupTempFile\(\)/s.test(code);

    expect(finallyBlock).toBe(true);
  });

  it('уборки после превращения в PDF без finally не осталось', () => {
    // Строка вида «await cleanupTempFile();» вне finally означает, что при
    // сбое файл останется.
    const outsideFinally = code
      .split('\n')
      .filter((line) => line.includes('cleanupTempFile()'))
      .filter((line) => !line.trim().startsWith('//'));

    // Одно обращение — то самое, из finally.
    expect(outsideFinally).toHaveLength(1);
  });
});
