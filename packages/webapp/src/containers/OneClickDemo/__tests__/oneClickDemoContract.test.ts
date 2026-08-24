import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д1 (карта v18). Демо «в один щелчок» было наполовину построено: фронт
 * читал мету через лишнюю ступеньку `meta` (страница демо была недостижима
 * всегда), а вход разбирал поля `token` / `tenant.organization_id`, которых
 * сервер не отдаёт вовсе.
 *
 * Сторож держит оба берега: имена полей входа — те же, что у обычного
 * входа, и лишняя ступенька `meta` не возвращается.
 */
const SRC = path.resolve(__dirname, '../..', '..');

const read = (relative: string) =>
  fs.readFileSync(path.resolve(SRC, relative), 'utf8');

describe('демо «в один щелчок»: договор с сервером', () => {
  const hooks = read('hooks/query/oneclick-demo.ts');
  const ensure = read('containers/OneClickDemo/EnsureOneClickDemoAccountEnabled.tsx');
  const boot = read('containers/OneClickDemo/OneClickDemoBoot.tsx');

  it('вход читает те же поля, что обычный вход', () => {
    expect(hooks).toContain('res.data.access_token');
    expect(hooks).toContain('res.data.organization_id');
    expect(hooks).toContain('res.data.user_id');
  });

  it('вход не читает полей, которых сервер не отдаёт', () => {
    expect(hooks).not.toMatch(/res\.data\.token\b/);
    expect(hooks).not.toMatch(/res\.data\.tenant\b/);
  });

  it('доступность демо читается плоско, без ступеньки meta', () => {
    expect(boot).toContain('one_click_demo');
    expect(ensure).not.toMatch(/\.\s*meta\?\./);
    expect(boot).not.toMatch(/authMeta\?\.\s*meta\?\./);
  });

  it('состояние постройки спрашивается по ключу демо, а не по номеру джоба', () => {
    expect(hooks).toContain('/demo/one_click/${demoId}/build_job');
  });
});
