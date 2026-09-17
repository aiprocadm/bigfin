import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д6 карты v88. Крючок сохранения, который «не знает», что ему передают.
 *
 * `useMutation((id) => apiRequest.delete(...))` выглядит безобидно, но вид
 * переменной там выводится из записи: раз у `id` вида нет, библиотека
 * считает, что переменных НЕТ ВООБЩЕ (`TVariables = void`). Место вызова
 * после этого не сходится по типам: `deleteTaxRate(taxRateId)` — «ожидалось
 * ничего, передали число».
 *
 * Пока окно с вызовом лежит в слепой зоне (`// @ts-nocheck`), расхождение
 * молчит. Оно просыпается ровно в тот день, когда окно из зоны выводят, —
 * и выглядит как новая поломка, хотя причина в крючке.
 *
 * Класс встречался трижды: смена тарифа (карта v82), отмена и возобновление
 * подписки (карта v87), удаление налоговой ставки, проекта, задачи и
 * табеля (карта v88, 70 мест разом). На третьем разе заведён этот сторож.
 *
 * Правило: у переменной крючка `useMutation` вид объявлен.
 */
const SRC = path.resolve(__dirname, '..', '..');

/** Крючок с одной переменной без объявленного вида: `useMutation((имя) =>`. */
const UNDECLARED = /useMutation\(\(\s*[A-Za-z_$][\w$]*\s*\)\s*=>/g;

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.spec\.tsx?$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const findUndeclared = (code: string): string[] =>
  [...code.matchAll(UNDECLARED)].map((m) => m[0]);

describe('переменные крючков сохранения', () => {
  it('у каждого useMutation вид переменной объявлен', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      const found = findUndeclared(fs.readFileSync(file, 'utf8'));
      found.forEach((hit) => {
        offenders.push(`${path.relative(SRC, file)}: ${hit}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('правило ловит запись без вида и пропускает запись с видом', () => {
    expect(findUndeclared('useMutation((id) => request.delete(id))')).toEqual([
      'useMutation((id) =>',
    ]);
    expect(
      findUndeclared('useMutation((id: number) => request.delete(id))'),
    ).toEqual([]);
  });

  it('файлы витрины вообще читаются — иначе проверка бессмысленна', () => {
    expect(sourceFiles().length).toBeGreaterThan(500);
  });
});
