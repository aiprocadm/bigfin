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
});
