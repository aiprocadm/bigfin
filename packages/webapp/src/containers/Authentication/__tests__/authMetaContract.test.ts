import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * М4 (карта v15): фронт читал `authMeta?.meta?.signup_disabled`, а сервер
 * отдаёт поля ПЛОСКО — `{ "signup_disabled": false }`. Поле было мёртвым:
 * закрытая регистрация никак не отражалась на экране.
 *
 * Сторож сверяет два берега: каждое поле ответа сервера должно читаться
 * фронтом ровно под тем именем, под которым приходит.
 */
const SERVER_DTO = path.resolve(
  __dirname,
  '../../../../../server/src/modules/Auth/dtos/AuthMetaResponse.dto.ts',
);
const BOOT = path.resolve(__dirname, '../AuthMetaBoot.tsx');

/** Ответы наружу переименовываются в snake_case общим перехватчиком. */
const toSnake = (name: string) =>
  name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);

const serverFields = (): string[] => {
  const source = fs.readFileSync(SERVER_DTO, 'utf8');
  const body = source.match(/class AuthMetaResponseDto \{([\s\S]*?)\n\}/);

  return Array.from(body![1].matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\??\s*:/gm))
    .map((m) => m[1])
    .filter((name) => name !== 'constructor');
};

describe('формат /auth/meta', () => {
  const fields = serverFields();
  const boot = fs.readFileSync(BOOT, 'utf8');

  it('поля ответа сервера вообще прочитались', () => {
    // Иначе пустой список сделал бы проверки ниже бессмысленно зелёными.
    expect(fields.length).toBeGreaterThan(0);
  });

  it('фронт читает поля под теми же именами', () => {
    const missing = fields
      .map(toSnake)
      .filter((field) => !boot.includes(field));

    expect(missing).toEqual([]);
  });

  it('фронт не ищет поля во вложенном объекте meta', () => {
    // Именно из-за этой лишней ступеньки поле и было мёртвым.
    expect(boot).not.toMatch(/authMeta\?\.\s*meta\?\./);
  });
});
