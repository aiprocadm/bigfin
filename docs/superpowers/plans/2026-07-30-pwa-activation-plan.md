# ⑬a Доведение PWA — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать Bigfin устанавливаемым PWA (манифест + иконки + Service Worker с офлайн-заставкой и автообновлением).

**Architecture:** Всё без новых зависимостей: рукописный `public/sw.js` (network-first навигация, cache-first для хэшированных ассетов), правленый манифест, иконки-монограммы из авторского SVG (PNG рендерятся Playwright-скриптом и коммитятся). Спека: `docs/superpowers/specs/2026-07-30-pwa-activation-design.md`.

**Tech Stack:** Vite 5 (webapp), ванильный Service Worker API, Playwright headless Chromium (только как офлайн-инструмент рендера иконок и смоука).

## Global Constraints

- **Никаких новых npm-пакетов**; `pnpm-lock.yaml` не трогать, `pnpm install` не запускать.
- Бренд строго `Bigfin`. Фирменный тёмный цвет `#0a0e1a` (из `public/bigfin.svg`).
- SW не перехватывает `/api/*`, не-GET и кросс-доменные запросы — учётные данные всегда живые.
- Команды из корня worktree; тесты фронта: `cd packages/webapp && ./node_modules/.bin/vitest run`; typecheck: `./node_modules/.bin/tsc --noEmit -p tsconfig.json`.
- PR на `develop` (ветки `main` нет), `gh pr create --draft --head <branch>`.

---

### Task 1: Иконки PWA

**Files:**
- Create: `packages/webapp/public/pwa/icon.svg`
- Create: `packages/webapp/scripts/render-pwa-icons.mjs`
- Create (рендером, коммитятся): `packages/webapp/public/pwa/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- Delete: `packages/webapp/public/logo192.png`, `packages/webapp/public/logo512.png` (CRA-заглушки; перед удалением `grep -rn "logo192\|logo512" packages/webapp/src packages/webapp/index.html` должен быть пуст)

**Interfaces:**
- Produces: файлы иконок по путям `/pwa/icon*.png`, `/pwa/icon.svg`, `/pwa/apple-touch-icon.png` — их ждут Task 2 (манифест) и Task 3 (`<head>`).

- [ ] **Step 1: Нарисовать icon.svg** — монограмма «B» белым на `#0a0e1a`, скруглённый квадрат:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0a0e1a"/>
  <text x="256" y="256" dy=".36em" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="320" fill="#ffffff">B</text>
</svg>
```

- [ ] **Step 2: Скрипт рендера** `scripts/render-pwa-icons.mjs` (запуск вручную из `packages/webapp`; Playwright берётся из `~/.cache/ms-playwright`/серверного окружения через `node_modules` МСР недоступен — использовать `playwright` из глобальной установки MCP: если `require('playwright')` недоступен, запускать через `npx playwright screenshot` НЕЛЬЗЯ (сеть) — вместо этого использовать имеющийся chromium бинарь: путь взять из `ls ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome` и снять скриншот через CDP-скрипт на ванильном node (`--remote-debugging-port` + `/json` + `Page.captureScreenshot`). Если это окажется хрупким — допустимый запасной вариант: рендер тем же способом, каким пользуется настроенный MCP-«playwright» сервер из сессии (см. память playwright-on-server), т.е. руками через MCP-инструменты браузера, а скрипт оставить документацией процесса.

Содержимое скрипта (CDP-вариант):

```js
// Рендер PNG-иконок PWA из public/pwa/icon.svg через headless Chromium (CDP).
// Запуск: node scripts/render-pwa-icons.mjs (из packages/webapp)
// Chromium: первый найденный ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome
import { execFile } from 'child_process';
import { readdirSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const sizes = [
  { file: 'icon-192.png', size: 192, padded: false },
  { file: 'icon-512.png', size: 512, padded: false },
  { file: 'icon-maskable-512.png', size: 512, padded: true },
  { file: 'apple-touch-icon.png', size: 180, padded: false },
];
// padded: монограмма в центральных 60% (safe zone маски Android).
// Реализация: html-обёртка с <img src="icon.svg"> нужного размера,
// для padded — img 60% по центру на фоне #0a0e1a; скриншот страницы
// размером size×size через Page.captureScreenshot (clip).
// ... (полный код пишется при реализации; проверка: файлы существуют,
// `file *.png` показывает правильные размеры)
```

- [ ] **Step 3: Отрендерить и проверить** — `file packages/webapp/public/pwa/*.png` показывает 192/512/512/180; глазами (Read tool показывает PNG) — буква «B» на тёмном, у maskable поле шире.
- [ ] **Step 4: Удалить CRA-логотипы** (после пустого grep) и закоммитить: `feat: иконки PWA (монограмма Bigfin) + скрипт рендера`

### Task 2: Манифест

**Files:**
- Modify: `packages/webapp/public/manifest.json` (полная замена содержимого)

**Interfaces:**
- Consumes: пути иконок из Task 1.
- Produces: `/manifest.json`, который Task 3 подключит в `<head>`.

- [ ] **Step 1: Записать манифест** — содержимое ровно из §4 спеки (name «Bigfin — управленческий учёт», short_name «Bigfin», lang ru, start_url `/`, scope `/`, display standalone, theme `#0a0e1a`, background `#ffffff`, 4 иконки).
- [ ] **Step 2: Проверить** `python3 -m json.tool packages/webapp/public/manifest.json`.
- [ ] **Step 3: Commit** `feat: манифест PWA Bigfin`

### Task 3: `<head>` в index.html

**Files:**
- Modify: `packages/webapp/index.html`

- [ ] **Step 1: Правки:**
  - строку `<link rel="modulepreload" href="/manifest.json" />` заменить на `<link rel="manifest" href="/manifest.json" />`;
  - `<meta name="theme-color" content="#000000" />` → `content="#0a0e1a"`;
  - добавить рядом: `<link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />`, `<meta name="apple-mobile-web-app-capable" content="yes" />`, `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`.
- [ ] **Step 2: Commit** `feat: подключение манифеста и iOS-меты PWA`

### Task 4: Service Worker

**Files:**
- Create: `packages/webapp/public/sw.js`

**Interfaces:**
- Produces: `/sw.js` в корне сайта; принимает message `{type:'SKIP_WAITING'}` — его шлёт регистратор из Task 5.

- [ ] **Step 1: Написать sw.js:**

```js
/* Service Worker Bigfin. Стратегии:
 * - /api/*, не-GET, кросс-домен — не перехватываем;
 * - навигация — network-first, офлайн → кэшированный index.html;
 * - /assets/* (хэшированные бандлы Vite) — cache-first;
 * - прочая same-origin статика — stale-while-revalidate. */
const CACHE_VERSION = 'bigfin-v1';
const NAV_CACHE = `${CACHE_VERSION}-nav`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const KNOWN = [NAV_CACHE, ASSET_CACHE, STATIC_CACHE];

self.addEventListener('install', () => {
  // Активацию не форсируем: ждём SKIP_WAITING от регистратора.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KNOWN.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirstNav(request) {
  const cache = await caches.open(NAV_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put('/index.html', fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNav(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(ASSET_CACHE, request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
```

- [ ] **Step 2: Commit** `feat: service worker PWA (офлайн-заставка, кэш ассетов)`

### Task 5: Регистрация вместо CRA-заглушки

**Files:**
- Create: `packages/webapp/src/lib/registerServiceWorker.ts`
- Modify: `packages/webapp/src/index.tsx` (строки импорта `@/serviceWorker` и вызова `serviceWorker.unregister()`)
- Delete: `packages/webapp/src/serviceWorker.tsx`
- Test: `packages/webapp/src/lib/__tests__/registerServiceWorker.test.ts`

**Interfaces:**
- Consumes: `/sw.js` из Task 4 (message `{type:'SKIP_WAITING'}`).
- Produces: `registerServiceWorker(): void` — единственный экспорт; вызывается из `index.tsx`.

- [ ] **Step 1: Падающий тест** (vitest, jsdom; мок `navigator.serviceWorker`):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../registerServiceWorker';

function mockServiceWorkerContainer() {
  const registration = {
    waiting: null as null | { postMessage: (m: unknown) => void },
    addEventListener: vi.fn(),
  };
  const container = {
    register: vi.fn().mockResolvedValue(registration),
    getRegistrations: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
  });
  return { container, registration };
}

afterEach(() => {
  vi.unstubAllEnvs();
  // @ts-expect-error очистка мока
  delete navigator.serviceWorker;
});

describe('registerServiceWorker', () => {
  it('в prod регистрирует /sw.js', async () => {
    vi.stubEnv('PROD', true);
    const { container } = mockServiceWorkerContainer();
    registerServiceWorker();
    await Promise.resolve();
    expect(container.register).toHaveBeenCalledWith('/sw.js');
  });

  it('в dev снимает существующие регистрации и не регистрирует', async () => {
    vi.stubEnv('PROD', false);
    const { container } = mockServiceWorkerContainer();
    registerServiceWorker();
    await Promise.resolve();
    expect(container.register).not.toHaveBeenCalled();
    expect(container.getRegistrations).toHaveBeenCalled();
  });

  it('воркеру в waiting сразу шлётся SKIP_WAITING', async () => {
    vi.stubEnv('PROD', true);
    const { container, registration } = mockServiceWorkerContainer();
    const postMessage = vi.fn();
    registration.waiting = { postMessage };
    registerServiceWorker();
    await Promise.resolve();
    await Promise.resolve();
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
```

Примечание: `import.meta.env.PROD` в модуле читать через геттер в момент вызова (не на верхнем уровне), иначе `vi.stubEnv` не подействует.

- [ ] **Step 2: Прогнать — падает** (`cd packages/webapp && ./node_modules/.bin/vitest run src/lib/__tests__/registerServiceWorker.test.ts`)
- [ ] **Step 3: Реализация:**

```ts
// Регистрация Service Worker (prod). Обновление — тихое: новый воркер
// получает SKIP_WAITING, страница перезагружается один раз на новую версию.
let reloaded = false;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    // В dev старый воркер только мешает — снимаем регистрации.
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      const promote = (worker: ServiceWorker | null) =>
        worker?.postMessage({ type: 'SKIP_WAITING' });

      promote(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') promote(installing);
        });
      });
    })
    .catch(() => {
      // Без SW приложение полностью работоспособно — молча продолжаем.
    });
}
```

В `index.tsx`: `import * as serviceWorker from '@/serviceWorker';` → `import { registerServiceWorker } from '@/lib/registerServiceWorker';`, вызов `serviceWorker.unregister();` → `registerServiceWorker();`. Удалить `src/serviceWorker.tsx`.

Нюанс controllerchange: первый захват страницы новым воркером (первый визит) тоже стреляет controllerchange после clients.claim() — перезагрузка допустима (одна, флаг), но лучше подписываться на controllerchange только если `navigator.serviceWorker.controller` уже был (страница была под контролем) — добавить `if (navigator.serviceWorker.controller !== null)` перед addEventListener.

- [ ] **Step 4: Прогнать тесты + typecheck** (`vitest run` целиком, `tsc --noEmit`)
- [ ] **Step 5: Commit** `feat: регистрация service worker с тихим автообновлением`

### Task 6: Сборка и живой смоук

- [ ] **Step 1: Собрать** — `cd packages/webapp && ./node_modules/.bin/vite build` (следить: `dist/sw.js`, `dist/manifest.json`, `dist/pwa/*` на месте).
- [ ] **Step 2: Поднять `vite preview`** (run_in_background, порт по умолчанию 4173).
- [ ] **Step 3: Headless-смоук** (Playwright MCP или CDP): открыть `http://127.0.0.1:4173/` → `navigator.serviceWorker.ready` резолвится и `controller` не null после перезагрузки; манифест отдаёт 200 и парсится; включить офлайн → навигация на `/` отдаёт приложение (HTML с `<div id="root">`); запрос `/api/auth/meta` в офлайне падает (SW не вмешивается).
- [ ] **Step 4: Итоги смоука** — в описание PR. `pnpm typecheck` пакета webapp зелёный; полный vitest зелёный; `lang-check` не нужен (строк UI нет).
- [ ] **Step 5: Push + draft-PR** на develop: состав, аудит «до» (React App-манифест, unregister), стратегия SW, результаты смоука.

## Self-review плана

- Покрытие спеки: §4 → Task 2; §5 → Task 3; §6 → Task 4; §7 → Task 5; §3 иконки → Task 1; §8 → Task 5 (unit) + Task 6 (смоук). Пробелов нет.
- Type consistency: `registerServiceWorker(): void` единообразно в Task 5; message `{type:'SKIP_WAITING'}` совпадает в Task 4/5. ✓
- Честная неопределённость: способ рендера PNG (CDP vs MCP-браузер) выбирается по факту на месте — оба пути описаны в Task 1; итоговые PNG в любом случае коммитятся, сборка от способа не зависит.
