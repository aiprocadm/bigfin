// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Правило проекта: миграция без рабочего `down()` — мина, которую нельзя
 * откатить. Проверки на это не было, а глазами такое не ловится: файл
 * выглядит целым, пока откат не понадобится в неудачный момент.
 *
 * Проверяем именно ИСХОДНИКИ: миграции — глобальные CommonJS-скрипты без
 * импортов, поэтому просто загрузить их модулем нельзя.
 */
const MIGRATIONS_DIR = __dirname;

const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((name) => /^\d{14}_.+\.ts$/.test(name))
  .sort();

const source = (name: string) =>
  fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf-8');

const HAS_UP = /exports\.up\s*=|export const up|export async function up/;
const HAS_DOWN =
  /exports\.down\s*=|export const down|export async function down/;

describe('тенантные миграции обратимы', () => {
  it('миграции найдены', () => {
    expect(migrationFiles.length).toBeGreaterThan(50);
  });

  it('у каждой миграции есть накат и откат', () => {
    const withoutUp = migrationFiles.filter((n) => !HAS_UP.test(source(n)));
    const withoutDown = migrationFiles.filter((n) => !HAS_DOWN.test(source(n)));

    expect({ withoutUp, withoutDown }).toEqual({
      withoutUp: [],
      withoutDown: [],
    });
  });

  it('откат не оставлен пустым', () => {
    // Пустое тело отката — то же, что его отсутствие.
    const emptyDown = migrationFiles.filter((name) => {
      const src = source(name);
      const down = src.slice(src.search(HAS_DOWN)).replace(/\s+/g, '');

      return /^exports\.down=(async)?\(?knex\)?=>\{\};?$/.test(down);
    });

    expect(emptyDown).toEqual([]);
  });
});
