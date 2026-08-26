import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { NOTIFICATION_EVENTS } from '@/modules/Notifications/constants';

/**
 * Правила наблюдения для новой организации (Г1 карты v20).
 *
 * Модуль уведомлений умеет три вещи: «счёт просрочен», «на счёте кончаются
 * деньги», «впереди кассовый разрыв». Но ежедневный обход берёт правила из
 * таблицы организации, а она создавалась ПУСТОЙ — то есть даже с включённым
 * модулем продукт молчал, пока владелец сам не заведёт правила в настройках.
 * Мало кто догадается это сделать: настройка уведомлений — не то, что ищут,
 * пока не пропустят просрочку.
 *
 * Пороги не задаём: у каждого правила есть разумное значение по умолчанию
 * (горизонт кассового разрыва — неделя и так далее), а свои цифры владелец
 * поставит в настройках.
 *
 * Канал — `email`: письмо уйдёт ТОЛЬКО если владелец укажет адрес
 * получателя, без адреса канал считается ненастроенным и доставка
 * пропускается. Заработает лента в приложении.
 *
 * Канал записывается ЯВНО, хотя в миграции у колонки есть `defaultTo`.
 * MariaDB и MySQL не принимают значения по умолчанию для колонок типа TEXT
 * и молча их игнорируют, поэтому вставка без `channels` падала с
 * «ER_NO_DEFAULT_FOR_FIELD: Field 'CHANNELS' doesn't have a default value»
 * — и вместе с ней ломалась сборка ВСЕЙ новой организации. Держится
 * тестом `seedNotificationPreferences.spec.ts`.
 */
export default class SeedNotificationPreferences extends TenantSeeder {
  up(knex) {
    const rows = NOTIFICATION_EVENTS.map((eventType) => ({
      event_type: eventType,
      enabled: true,
      channels: JSON.stringify(['email']),
    }));

    return knex('notification_preferences').insert(rows);
  }
}
