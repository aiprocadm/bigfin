import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LEMON_SQUEEZY_SRC,
  loadLemonSqueezy,
  resetLemonSqueezyLoader,
} from '../lemonSqueezy';

const lemonScripts = () =>
  Array.from(document.querySelectorAll('script')).filter(
    (s) => s.src === LEMON_SQUEEZY_SRC,
  );

const widget = () => ({ Setup: vi.fn(), Url: { Open: vi.fn() } });

afterEach(() => {
  resetLemonSqueezyLoader();
  lemonScripts().forEach((s) => s.remove());
  delete window.LemonSqueezy;
  delete window.createLemonSqueezy;
});

describe('loadLemonSqueezy', () => {
  it('до вызова ничего не скачивается', () => {
    expect(lemonScripts()).toHaveLength(0);
  });

  it('скачивает скрипт один раз и сам включает виджет после загрузки', async () => {
    const created = widget();
    // Настоящий lemon.js включается по событию load окна; скачанный позже —
    // только если позвать createLemonSqueezy.
    window.createLemonSqueezy = vi.fn(() => {
      window.LemonSqueezy = created;
    });

    const first = loadLemonSqueezy();
    const second = loadLemonSqueezy();
    expect(lemonScripts()).toHaveLength(1);
    expect(lemonScripts()[0].async).toBe(true);

    lemonScripts()[0].onload!(new Event('load'));
    await expect(first).resolves.toBe(created);
    await expect(second).resolves.toBe(created);
    expect(window.createLemonSqueezy).toHaveBeenCalledTimes(1);
  });

  it('виджет уже есть — отдаёт его без скачивания', async () => {
    const existing = widget();
    window.LemonSqueezy = existing;

    await expect(loadLemonSqueezy()).resolves.toBe(existing);
    expect(lemonScripts()).toHaveLength(0);
  });

  it('не скачалось — ошибка, а следующая попытка качает заново', async () => {
    const failed = loadLemonSqueezy();
    lemonScripts()[0].onerror!(new Event('error'));
    await expect(failed).rejects.toThrow('виджет оплаты');
    expect(lemonScripts()).toHaveLength(0);

    loadLemonSqueezy().catch(() => undefined);
    expect(lemonScripts()).toHaveLength(1);
  });

  it('скрипт скачался, но виджета так и нет — тоже ошибка, а не вечное ожидание', async () => {
    const pending = loadLemonSqueezy();
    lemonScripts()[0].onload!(new Event('load'));
    await expect(pending).rejects.toThrow('виджет оплаты');
  });
});

describe('index.html', () => {
  // Сторож: страница не должна ждать чужие домены при запуске. Любой
  // `<script src>` или `<link rel=stylesheet>` на внешний адрес держит
  // запуск приложения, пока не скачается (медленный CDN = пустой экран).
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8')
    // Комментарии разметки не в счёт.
    .replace(/<!--[\s\S]*?-->/g, '');

  it('не тянет скрипты и стили с чужих доменов', () => {
    const external = [
      ...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]+"/g),
    ].map((m) => m[0]);
    expect(external).toEqual([]);
  });
});
