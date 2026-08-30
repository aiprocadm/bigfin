import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * С2 карты v39. Экран говорит поиску то, что поиск понимает.
 *
 * Вид записей для поиска объявляет сам маршрут — `defaultSearchResource` в
 * реестре `routes/dashboard.tsx`. Если объявленного вида не существует или
 * поиск его не умеет искать, значение молча выходит пустым, и человек
 * оказывается в поиске по «Клиентам», где бы он ни стоял.
 *
 * Так было в двух местах: экран ввоза позиций объявлял «Клиентов», а
 * Главная книга — `INVENTORY_ADJUSTMENT`, вида с таким именем в продукте
 * нет вовсе.
 *
 * Правило: объявленный вид существует в `RESOURCES_TYPES` И поиск умеет
 * его искать (у вида есть адрес запроса и разбор ответа).
 */
const SRC = path.resolve(__dirname, '..');

const read = (relative: string): string =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

/** Имена видов записей, какие есть у продукта. */
const declaredTypes = (): string[] => {
  const code = read('constants/resourcesTypes.tsx');

  return [...code.matchAll(/^\s{2}(\w+):\s*'/gm)].map((m) => m[1]);
};

/** Виды, которые поиск умеет искать: есть адрес запроса. */
const searchableTypes = (): string[] => {
  const code = read('hooks/query/GenericResource/index.tsx');
  const block = code.slice(
    code.indexOf('function getResourceUrlFromType'),
    code.indexOf('transformInvoices'),
  );

  return [...block.matchAll(/RESOURCES_TYPES\.(\w+)\]:\s*'/g)].map((m) => m[1]);
};

/** Что объявляют маршруты. */
const routeDeclarations = (): string[] => {
  const code = read('routes/dashboard.tsx');

  return [...code.matchAll(/defaultSearchResource:\s*RESOURCES_TYPES\.(\w+)/g)].map(
    (m) => m[1],
  );
};

describe('вид записей для поиска', () => {
  it('реестры читаются', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(declaredTypes().length).toBeGreaterThan(5);
    expect(searchableTypes().length).toBeGreaterThan(5);
    expect(routeDeclarations().length).toBeGreaterThan(20);
  });

  it('маршруты объявляют только существующие виды записей', () => {
    const types = declaredTypes();
    const unknown = [...new Set(routeDeclarations())].filter(
      (name) => !types.includes(name),
    );

    expect(unknown).toEqual([]);
  });

  it('маршруты объявляют только то, что поиск умеет искать', () => {
    const searchable = searchableTypes();
    const unsupported = [...new Set(routeDeclarations())].filter(
      (name) => !searchable.includes(name),
    );

    expect(unsupported).toEqual([]);
  });
});
