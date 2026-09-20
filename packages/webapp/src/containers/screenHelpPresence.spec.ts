// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { getDashboardRoutes } from '@/routes/dashboard';
import { collectModuleRoutes } from '@/routes/navigationReachability';
import { topicFromPath } from '@/components/ui/page-header';

/**
 * У каждого корневого экрана есть объяснение (FIN-025 ТЗ-2, приёмка 1).
 *
 * ЗАЧЕМ СТОРОЖ. Продукт сделан для предпринимателя без бухгалтерского
 * образования. Он открывает «Статьи учёта», «Кредит-ноты», «Капитализацию» —
 * и не знает, что это. Уйти за ответом наружу значит не вернуться.
 *
 * Тексты пишутся один раз, а экраны добавляются постоянно. Без сторожа новый
 * экран выйдет без объяснения — и это будет ровно тот экран, про который
 * никто ничего не знает.
 */
const readLang = (locale: string): Record<string, unknown> =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'lang', locale, 'index.json'),
      'utf8',
    ),
  );

const RU = readLang('ru');
const EN = readLang('en');

const ROUTES = collectModuleRoutes(getDashboardRoutes());

/** «Вы» с большой буквы не в начале предложения — то самое вежливое «Вы». */
const hasPoliteCapital = (text: string): boolean =>
  text
    .split(/[.!?\n]+\s*/)
    .some((sentence) => /.\s+Вы(\s|,|$)/.test(sentence));

describe('справка на экране', () => {
  it('корневые экраны найдены', () => {
    // Если разбор маршрутов сломается, проверки ниже станут зелёными
    // «бесплатно» — и сторож перестанет сторожить.
    expect(ROUTES.length).toBeGreaterThan(30);
  });

  it('у каждого корневого экрана есть русский текст справки', () => {
    const missing = ROUTES.filter((route) => {
      const topic = topicFromPath(route);

      return !RU[`screen_help.${topic}.title`] || !RU[`screen_help.${topic}.body`];
    });

    expect(missing).toEqual([]);
  });

  it('у каждого текста есть пара в английском', () => {
    const missing = ROUTES.filter((route) => {
      const topic = topicFromPath(route);

      return !EN[`screen_help.${topic}.title`] || !EN[`screen_help.${topic}.body`];
    });

    expect(missing).toEqual([]);
  });

  it('ключ выводится из адреса, а не совпадает с ним', () => {
    // Дефис в адресе и подчёркивание в ключе — разные знаки. Если бы ключ
    // брался как есть, половина экранов молча осталась бы без справки.
    expect(topicFromPath('/bank-api-sync')).toBe('bank_api_sync');
    expect(topicFromPath('/budgets')).toBe('budgets');
    // Вложенный адрес сводится к своему разделу.
    expect(topicFromPath('/invoices/123/edit')).toBe('invoices');
    // Главная своего раздела не имеет — кнопки там не будет.
    expect(topicFromPath('/')).toBe('');
  });

  it('справка — это несколько абзацев, а не одна строка', () => {
    // Требование §10.2 ТЗ: три-шесть коротких абзацев. Одна строка не
    // объясняет, а отговаривается.
    const flat = ROUTES.filter((route) => {
      const body = String(RU[`screen_help.${topicFromPath(route)}.body`] ?? '');

      return body.split('\n').filter(Boolean).length < 2;
    });

    expect(flat).toEqual([]);
  });

  it('в справке нет списков и выделений', () => {
    // Списки и звёздочки превращают объяснение в документ, который начинают
    // «изучать», а не читать.
    const decorated = Object.entries(RU)
      .filter(([key]) => key.startsWith('screen_help.') && key.endsWith('.body'))
      .filter(([, value]) => /(\*\*|^\s*[-•*]\s)/m.test(String(value)))
      .map(([key]) => key);

    expect(decorated).toEqual([]);
  });

  it('обращение на «вы» со строчной ВНУТРИ предложения', () => {
    // Так говорит весь продукт. «Вы» с большой — знак личного письма, а не
    // подсказки у кнопки.
    //
    // ПРОВЕРЯЕТСЯ ИМЕННО СЕРЕДИНА ПРЕДЛОЖЕНИЯ. В начале «Вы» пишется с
    // большой по обычному правилу русского языка, и запрещать это значило бы
    // требовать безграмотности. Первая проверка сторожа ловила как раз такие
    // случаи — правило было сформулировано грубее, чем требование.
    const shouting = Object.entries(RU)
      .filter(([key]) => key.startsWith('screen_help.') && key.endsWith('.body'))
      .filter(([, value]) => hasPoliteCapital(String(value)))
      .map(([key]) => key);

    expect(shouting).toEqual([]);
  });

  it('проверка «вы» ловит подделку', () => {
    // Мутация: сторож, который ничего не ловит, хуже отсутствующего.
    expect(hasPoliteCapital('Здесь Вы увидите остаток.')).toBe(true);
    expect(hasPoliteCapital('Вы увидите остаток.')).toBe(false);
  });
});
