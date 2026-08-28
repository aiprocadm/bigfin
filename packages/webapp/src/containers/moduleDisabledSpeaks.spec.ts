import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

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

const blankScreens = () => {
  const offenders: string[] = [];

  sourceFiles(path.join(SRC, 'containers')).forEach((file) => {
    const relative = path.relative(SRC, file).split(path.sep).join('/');
    if (PARTS.test(relative)) return;

    const code = fs.readFileSync(file, 'utf8');
    if (!/if\s*\(\s*!featureCan\([^)]*\)\s*\)\s*(?:\{\s*)?return null/.test(code)) {
      return;
    }
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

  it('выключенный модуль не поднимает плашку «нет прав»', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useRequest.tsx'),
      'utf-8',
    );

    // Экраны спрашивают сервер ДО проверки флага (иначе ломается порядок
    // хуков), и сервер отвечает 403. Раньше витрина на любой 403 показывала
    // «У вас нет прав» — поверх экрана, где написано «Раздел выключен».
    const handler = source
      .split('\n')
      .find((line) => line.includes('status === 403'));

    expect(handler).toContain('isFeatureDisabledResponse');
  });
});
