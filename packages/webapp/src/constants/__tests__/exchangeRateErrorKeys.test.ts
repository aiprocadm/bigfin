import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { API_ERROR_KEYS } from '../apiErrorKeys';
import ru from '@/lang/ru/index.json';
import en from '@/lang/en/index.json';

/**
 * М3 срез 2 (карта v15): служба курсов валют отвечает кодами без текста.
 * Если код не заведён в словаре или у ключа нет перевода, пользователь
 * видит безликое «что-то пошло не так» вместо понятной причины.
 *
 * Сторож читает перечисление кодов прямо из сервера — новый код на сервере
 * без текста на экране сразу красит тест.
 */
const SERVER_ENUM = path.resolve(
  __dirname,
  '../../../../server/src/modules/ExchangeRates/lib/types.ts',
);

const serverErrorCodes = (): string[] => {
  const source = fs.readFileSync(SERVER_ENUM, 'utf8');
  const block = source.match(/enum EchangeRateErrors \{([\s\S]*?)\}/);

  return Array.from(block![1].matchAll(/^\s*(EX_RATE_[A-Z_]+)\s*=/gm)).map(
    (m) => m[1],
  );
};

describe('коды ошибок службы курсов валют', () => {
  const codes = serverErrorCodes();

  it('перечисление кодов на сервере прочиталось', () => {
    // Иначе пустой список сделал бы все проверки ниже бессмысленно зелёными.
    expect(codes.length).toBeGreaterThanOrEqual(6);
  });

  it('каждый код сервера заведён в словаре фронта', () => {
    const missing = codes.filter((code) => !API_ERROR_KEYS[code]);

    expect(missing).toEqual([]);
  });

  it('у каждого кода есть текст на русском и английском', () => {
    const withoutText = codes
      .map((code) => API_ERROR_KEYS[code])
      .filter((key) => key && (!(key in ru) || !(key in en)));

    expect(withoutText).toEqual([]);
  });

  it('русские тексты не пустые и подсказывают, что делать', () => {
    const tooShort = codes
      .map((code) => API_ERROR_KEYS[code])
      .filter((key) => key && ((ru as any)[key] || '').length < 20);

    expect(tooShort).toEqual([]);
  });
});
