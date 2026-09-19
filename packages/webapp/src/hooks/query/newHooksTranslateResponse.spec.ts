// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: новая выборка переводит ответ сервера.
 *
 * ЗАЧЕМ. Сервер отдаёт КАЖДЫЙ ответ в змеином виде: в коде `netAssets`,
 * наружу уходит `net_assets` (общий перехватчик `SerializeInterceptor`).
 * Прежние экраны писались под это. Новые — в верблюжьем стиле.
 *
 * Без перевода поле оказывается `undefined`, и это НЕ ПАДАЕТ:
 *
 *   - на экране анализа расходов не рисовалась таблица статей вовсе,
 *     безубыточность всегда показывала «—», доли — 0%;
 *   - в справочнике юрлиц не показывалась пометка «головное», а форма
 *     правки теряла систему налогообложения.
 *
 * Тесты этого не ловят и поймать не могут: подделки в них отдают верблюжьи
 * имена, то есть повторяют ожидание кода, а не поведение сервера. Поймать
 * можно было только живой пробой — или этим сторожем.
 *
 * ПРАВИЛО. Выборка, написанная в новом виде (`res.data?.data ?? res.data`),
 * обязана пропустить ответ через `fromApi`.
 */
const HOOKS_DIR = path.resolve(__dirname);

/** Признак новой выборки: она сама разбирает конверт ответа. */
const NEW_STYLE = /res\.data\?\.data \?\? res\.data/;

/** Перевод на месте: `fromApi(res.data?.data ?? res.data)`. */
const TRANSLATED = /fromApi\(\s*res\.data\?\.data \?\? res\.data\s*\)/g;

describe('новые выборки переводят ответ сервера', () => {
  const files = fs
    .readdirSync(HOOKS_DIR)
    .filter((name) => /\.tsx?$/.test(name))
    .filter((name) => !/\.spec\./.test(name))
    .map((name) => path.join(HOOKS_DIR, name));

  it('выборки найдены', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('каждая новая выборка пропущена через fromApi', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const source = fs.readFileSync(file, 'utf8');
      if (!NEW_STYLE.test(source)) return;

      // Сколько раз разбирается конверт и сколько раз переводится ответ —
      // должно совпадать. Иначе одна выборка в файле переведена, а соседняя
      // забыта, и сторож бы этого не увидел.
      const envelopes = source.split('res.data?.data ?? res.data').length - 1;
      const translated = (source.match(TRANSLATED) ?? []).length;

      if (envelopes !== translated) {
        offenders.push(
          `${path.basename(file)}: разборов ${envelopes}, переводов ${translated}`,
        );
      }
    });

    expect(offenders).toEqual([]);
  });

  it('проверка и правда ловит забытый перевод', () => {
    // Без этого сторож мог бы «проходить» из-за ошибки в самом правиле.
    const forgotten = 'select: (res) => res.data?.data ?? res.data,';
    const done = 'select: (res) => fromApi(res.data?.data ?? res.data),';

    expect((forgotten.match(TRANSLATED) ?? []).length).toBe(0);
    expect((done.match(TRANSLATED) ?? []).length).toBe(1);
  });
});
