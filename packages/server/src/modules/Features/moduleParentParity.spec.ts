// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Приёмка v15: при выключенных «Сделках» ручка этапов сделки отвечала 200 —
 * дочерний модуль работал без родителя. Точно так же в М2 «KPI» работал без
 * «Зарплаты».
 *
 * Договор: если ручка требует ПАРУ флагов (`@RequireFeature(РОДИТЕЛЬ,
 * РЕБЁНОК)`), то и в интерфейсе тумблер ребёнка обязан знать родителя —
 * иначе его можно включить в одиночку и получить ложное «нет прав».
 */
const SERVER_MODULES = path.resolve(__dirname, '..');
const MODULES_PAGE = path.resolve(
  __dirname,
  '../../../../webapp/src/containers/Preferences/Modules/ModulesPage.tsx',
);

const collectSources = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      out.push(full);
    }
  }
  return out;
};

/** Имена флагов в перечислении — camelCase членов к snake_case значениям. */
const featureValues = (): Record<string, string> => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../common/types/Features.ts'),
    'utf8',
  );
  const map: Record<string, string> = {};

  for (const m of source.matchAll(/^\s*([A-Z_0-9]+)\s*=\s*'([a-z_0-9]+)'/gm)) {
    map[m[1]] = m[2];
  }
  return map;
};

/** Пары «родитель, ребёнок» из пометок на контроллерах. */
const requiredPairs = (): Array<[string, string]> => {
  const pairs: Array<[string, string]> = [];

  for (const file of collectSources(SERVER_MODULES)) {
    const source = fs.readFileSync(file, 'utf8');

    for (const m of source.matchAll(
      /@RequireFeature\(\s*Features\.([A-Z_0-9]+)\s*,\s*Features\.([A-Z_0-9]+)\s*\)/g,
    )) {
      pairs.push([m[1], m[2]]);
    }
  }
  return pairs;
};

describe('дочерние модули знают своего родителя', () => {
  const values = featureValues();
  const pairs = requiredPairs();
  const modulesPage = fs.readFileSync(MODULES_PAGE, 'utf8');

  it('перечисление флагов прочиталось', () => {
    expect(Object.keys(values).length).toBeGreaterThan(20);
  });

  it('пары флагов на ручках вообще нашлись', () => {
    // Иначе пустой список сделал бы проверку ниже бессмысленно зелёной.
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('у каждой пары есть родитель в списке модулей интерфейса', () => {
    const missing = pairs
      .map(([parent, child]) => [values[parent], values[child]])
      .filter(([parent, child]) => {
        const declared = new RegExp(`${child}:\\s*'${parent}'`).test(
          modulesPage,
        );
        return !declared;
      })
      .map(([parent, child]) => `${child} → ${parent}`);

    expect(missing).toEqual([]);
  });
});
