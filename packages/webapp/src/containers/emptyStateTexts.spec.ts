import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Т2 карты v24. Пустой экран говорит о своём разделе.
 *
 * Пустое состояние — первое, что видит новичок: таблиц ещё нет, есть только
 * текст-приглашение. Эти тексты писались копированием, и часть осталась от
 * чужого раздела: на экране «Клиенты» стоял абзац «Список товаров и услуг
 * вашей организации», на «Счетах поставщиков» — заголовок «Управляйте
 * услугами и товарами организации». Человек читает инструкцию не о том,
 * что перед ним.
 *
 * Правило: экран не вправе брать текст, который по названию ключа
 * принадлежит другому разделу. Список «чужих» ключей ведём явно — так
 * проверка остаётся понятной и не срабатывает на общих словах.
 */
const CONTAINERS = path.resolve(__dirname);

/** Ключи, прямо называющие свой раздел, и разделы, где они уместны. */
const OWNED_KEYS: Array<{ key: string; allowedIn: RegExp; про: string }> = [
  {
    key: 'here_a_list_of_your_organization_products_and_services',
    allowedIn: /(^|\/)Items(\/|$)/,
    про: 'товары и услуги',
  },
  {
    key: 'manage_the_organization_s_services_and_products',
    allowedIn: /(^|\/)Items(\/|$)/,
    про: 'товары и услуги',
  },
  {
    key: 'create_and_manage_your_organization_s_customers',
    allowedIn: /(^|\/)Customers(\/|$)/,
    про: 'клиенты',
  },
  {
    key: 'create_and_manage_your_organization_s_vendors',
    allowedIn: /(^|\/)Vendors(\/|$)/,
    про: 'поставщики',
  },
];

const emptyStateFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return emptyStateFiles(full);
    if (!/\.tsx$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];

    const source = fs.readFileSync(full, 'utf8');
    // Берём только файлы, где вообще рисуется пустое состояние.
    return /EmptyState|EmptyStatus|emptyState=/.test(source) ? [full] : [];
  });

describe('тексты пустых экранов', () => {
  const files = emptyStateFiles(CONTAINERS);

  it('экраны с пустым состоянием нашлись', () => {
    // Иначе сломанный обход сделал бы проверку ниже пустой и зелёной.
    expect(files.length).toBeGreaterThan(15);
  });

  it('ни один экран не берёт текст чужого раздела', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const source = fs.readFileSync(file, 'utf8');
      const relative = path.relative(CONTAINERS, file);

      OWNED_KEYS.forEach(({ key, allowedIn, про }) => {
        if (!source.includes(key)) return;
        if (allowedIn.test(relative)) return;

        offenders.push(`${relative}: текст про «${про}» (${key})`);
      });
    });

    expect(offenders).toEqual([]);
  });
});
