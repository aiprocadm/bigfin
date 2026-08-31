import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { activeCode } from '../testing/activeCode';

/**
 * П1 карты v36. Выключенный раздел объясняет себя, а не гаснет.
 *
 * Экран за флагом модуля гас целиком:
 *
 *   if (!featureCan(Features.Acquiring)) return null;
 *
 * Открываешь «Эквайринг» по прямой ссылке — пустой экран: ни заголовка,
 * ни объяснения, ни ошибки (сервер при этом отвечает 403). Пустую
 * страницу человек не отличит от поломки продукта.
 *
 * Меню такие пункты прячет (карта v34), но по закладке, по ссылке из
 * письма или в открытой вкладке, когда модуль выключили, экран всё равно
 * откроется.
 *
 * Правило: раздел за флагом показывает общий экран «раздел выключен» с
 * дорогой в «Настройки → Модули».
 */
const SRC = path.resolve(__dirname, '..');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!entry.name.endsWith('.tsx')) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

/**
 * Части страниц — кнопка в шапке формы, блок внутри экрана. Спрятать их
 * без флага правильно: человек уже на работающем экране.
 */
const PARTS = /(TopBar|Section|Block|components)\.tsx$/;

/**
 * Части интерфейса, которые прятать правильно, но имя файла под маску выше
 * не подпадает. Каждая строка — осознанное решение, а не «потом починим»:
 * тест ниже следит, что файл всё ещё существует.
 */
const HIDDEN_ON_PURPOSE = [
  // Кнопка-колокольчик в верхней панели. Человек в этот момент стоит на
  // работающем экране, и объяснять ему нечего: объяснение на месте кнопки
  // выглядело бы поломкой шапки.
  'containers/Notifications/InApp/NotificationBell.tsx',
];

/**
 * Гаснет ли экран в пустоту из-за флага модуля.
 *
 * Ловим два вида записи. Прямой — `if (!featureCan(X)) return null`. И
 * через переменную:
 *
 *   const canDeals = featureCan('deals');
 *   ...
 *   if (!canDeals) return null;
 *
 * Второй вид — не выдумка: так написаны «Сделки» и «Финмодель». Правило,
 * которое видит только прямой вызов, обходится переименованием, и экран
 * снова гаснет — то, что эта проверка и должна была закрыть.
 */
const goesBlank = (code: string): boolean => {
  if (/if\s*\(\s*!featureCan\([^)]*\)\s*\)\s*(?:\{\s*)?return null/.test(code)) {
    return true;
  }
  const flags = [...code.matchAll(/const\s+(\w+)\s*=\s*featureCan\(/g)].map(
    (m) => m[1],
  );

  const blanks = [
    // `if (!canDeals) return null`
    (flag: string) => `if\\s*\\(\\s*!${flag}\\s*\\)\\s*(?:\\{\\s*)?return null`,
    // `return canDeals ? <Page /> : null`
    (flag: string) => `return\\s+${flag}\\s*\\?[^;]*:\\s*null`,
    // `return !canDeals ? null : <Page />`
    (flag: string) => `return\\s+!${flag}\\s*\\?\\s*null`,
  ];

  return flags.some((flag) =>
    blanks.some((build) => new RegExp(build(flag)).test(code)),
  );
};

const blankScreens = () => {
  const offenders: string[] = [];

  sourceFiles(path.join(SRC, 'containers')).forEach((file) => {
    const relative = path.relative(SRC, file).split(path.sep).join('/');
    if (PARTS.test(relative)) return;
    if (HIDDEN_ON_PURPOSE.includes(relative)) return;

    // Действующий код: закомментированный экран не гаснет — он не
    // существует, и считать его нарушением значит краснеть впустую.
    const code = activeCode(fs.readFileSync(file, 'utf8'));
    if (!goesBlank(code)) return;

    offenders.push(relative);
  });
  return offenders;
};

describe('выключенный раздел', () => {
  it('исходники разделов читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(sourceFiles(path.join(SRC, 'containers')).length).toBeGreaterThan(100);
  });

  it('ни один экран не гаснет в пустоту без флага', () => {
    expect(blankScreens()).toEqual([]);
  });

  it('правило видит флаг, положенный в переменную', () => {
    // Сторож проверяется на своём же исходном грехе: до карты v44 такая
    // запись проходила мимо, потому что правило искало только прямой вызов.
    const viaVariable = [
      "const canDeals = featureCan('deals');",
      'if (!canDeals) return null;',
    ].join('\n');

    expect(goesBlank(viaVariable)).toBe(true);
  });

  it('правило видит и тернарник', () => {
    // Файлов с такой записью сегодня нет — правило укрепляется наперёд.
    // Один обход (флаг в переменной) уже случился, и он стоил двух
    // погасших экранов: закрывать стоит все ходы, а не тот, что нашли.
    const ternary = [
      "const canDeals = featureCan('deals');",
      'return canDeals ? <DealsList /> : null;',
    ].join('\n');

    expect(goesBlank(ternary)).toBe(true);
  });

  it('правило видит перевёрнутый тернарник', () => {
    const inverted = [
      "const canDeals = featureCan('deals');",
      'return !canDeals ? null : <DealsList />;',
    ].join('\n');

    expect(goesBlank(inverted)).toBe(true);
  });

  it('правило не срабатывает на исправном экране', () => {
    const healthy = [
      "const canDeals = featureCan('deals');",
      'if (!canDeals) return <ModuleDisabled />;',
      'return canDeals ? <DealsList /> : <ModuleDisabled />;',
    ].join('\n');

    expect(goesBlank(healthy)).toBe(false);
  });

  it('в списке исключений нет лишнего: все они всё ещё существуют', () => {
    // Иначе исключение переживёт сам файл и тихо ослабит проверку.
    const stale = HIDDEN_ON_PURPOSE.filter(
      (relative) => !fs.existsSync(path.join(SRC, relative)),
    );

    expect(stale).toEqual([]);
  });

  it('выключенный модуль не поднимает плашку «нет прав»', () => {
    const source = activeCode(
      fs.readFileSync(path.resolve(__dirname, '../hooks/useRequest.tsx'), 'utf-8'),
    );

    // Экраны спрашивают сервер ДО проверки флага (иначе ломается порядок
    // хуков), и сервер отвечает 403. Раньше витрина на любой 403 показывала
    // «У вас нет прав» — поверх экрана, где написано «Раздел выключен».
    const handler = source
      .split('\n')
      .find((line) => line.includes('status === 403'));

    expect(handler).toContain('isFeatureDisabledResponse(');
  });
});
