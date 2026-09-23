// © 2026 Bigfin
import { SettingsOptions } from './metable-options';
import { Features } from '@/common/types/Features';
import { MODULE_ALLOWLIST } from '@/modules/Features/Features.constants';
import { MetableDBStore } from '@/modules/Metable/MetableStoreDB';

/**
 * Сторож против класса «настройка-строка вместо да/нет».
 *
 * Значения настроек хранятся в базе строками. Обратно в настоящее «да/нет» их
 * превращает ТОЛЬКО объявленный здесь тип. Если ключа в справочнике нет,
 * выключенный переключатель возвращается строкой «0» — а непустая строка в
 * JavaScript истинна, и выключенное продолжает работать.
 *
 * Так и произошло с модулями за флагом: в справочнике лежали два имени,
 * которых в коде уже нет, а ни один настоящий флаг объявлен не был. Организация,
 * где модуль ни разу не трогали, вела себя правильно (значения нет вовсе);
 * ломалась ровно та, где модуль включили, а потом выключили.
 */
describe('справочник типов настроек', () => {
  it('каждая возможность объявлена переключателем', () => {
    const missing = Object.values(Features).filter(
      (feature) => SettingsOptions.features[feature]?.type !== 'boolean',
    );

    expect(missing).toEqual([]);
  });

  it('каждый модуль за флагом объявлен переключателем', () => {
    const missing = MODULE_ALLOWLIST.filter(
      (module) => SettingsOptions.features[module]?.type !== 'boolean',
    );

    expect(missing).toEqual([]);
  });

  it('выключенный переключатель читается как «нет», а не как строка', () => {
    Object.values(Features).forEach((feature) => {
      const parsed = MetableDBStore.parseMetaValue(
        '0',
        SettingsOptions.features[feature]?.type,
      );

      expect({ feature, parsed }).toEqual({ feature, parsed: false });
    });
  });

  it('включённый переключатель читается как «да»', () => {
    Object.values(Features).forEach((feature) => {
      const parsed = MetableDBStore.parseMetaValue(
        '1',
        SettingsOptions.features[feature]?.type,
      );

      expect({ feature, parsed }).toEqual({ feature, parsed: true });
    });
  });

  it('блокировка периодов тоже объявлена переключателем', () => {
    // Проверено живьём: этот ключ читается правильно именно потому, что
    // объявлен здесь. Тест держит объявление на месте.
    ['all', 'sales', 'purchases', 'financial'].forEach((module) => {
      expect(
        SettingsOptions['transactions-locking'][`${module}.active`]?.type,
      ).toBe('boolean');
    });
  });

  it('автонумерация документов объявлена переключателем', () => {
    const groups = Object.keys(SettingsOptions).filter(
      (group) => 'auto_increment' in (SettingsOptions[group] ?? {}),
    );

    expect(groups.length).toBeGreaterThan(5);
    groups.forEach((group) => {
      expect({ group, type: SettingsOptions[group].auto_increment.type }).toEqual(
        { group, type: 'boolean' },
      );
    });
  });

  /**
   * Каждая пара «группа + ключ», написанная в коде буквами, объявлена здесь.
   *
   * Необъявленную настройку сервер НЕ СОХРАНЯЕТ: `SaveSettings` отвечает
   * ошибкой. Так окно «Настройки зарплаты» годами получало отказ на каждое
   * сохранение, а статью зарплаты задать было нельзя — и отчёты, которые на
   * неё опираются, молча работали вхолостую. Проверка смотрит и сервер, и
   * витрину: и чтение, и запись.
   */
  it('каждая настройка, которую код читает или пишет, объявлена', () => {
    const fs = require('fs');
    const path = require('path');
    const roots = [
      path.resolve(__dirname, '..'),
      path.resolve(__dirname, '../../../webapp/src'),
    ];
    const files: string[] = [];
    const walk = (dir: string) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((entry: any) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        if (/\.(ts|tsx)$/.test(entry.name) && !/\.(spec|test)\./.test(entry.name)) {
          files.push(full);
        }
      });
    roots.forEach(walk);
    // Иначе проверка стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(1000);

    const pair =
      /group:\s*['"]([\w.-]+)['"]\s*,\s*key:\s*['"]([\w.-]+)['"]|key:\s*['"]([\w.-]+)['"]\s*,\s*group:\s*['"]([\w.-]+)['"]/g;
    const missing = new Set<string>();
    let seen = 0;
    files.forEach((file) => {
      const code = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = pair.exec(code))) {
        seen += 1;
        const group = match[1] ?? match[4];
        const key = match[2] ?? match[3];
        if (!SettingsOptions[group]?.[key]) missing.add(`${group}.${key}`);
      }
    });

    expect(seen).toBeGreaterThan(20);
    expect([...missing]).toEqual([]);
  });
});
