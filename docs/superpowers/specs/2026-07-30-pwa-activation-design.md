# ⑬a Доведение PWA: манифест, Service Worker, установка на телефон — дизайн

Дата: 2026-07-30. Пункт дорожной карты v5 §5 п. 3 (после ㉚ 2FA, PR #150–#152).

## 1. Текущее состояние (аудит)

- `public/manifest.json` — нетронутая заготовка Create React App («React App»,
  CRA-иконки `logo192/512.png`).
- В `index.html` манифест подключён **ошибочной** строкой
  `<link rel="modulepreload" href="/manifest.json">` — настоящего
  `rel="manifest"` нет, браузер манифест не видит вовсе.
- `src/serviceWorker.tsx` — CRA-регистратор, рассчитанный на
  `service-worker.js` из сборки CRA/Workbox. Сборка давно на Vite без
  PWA-плагина: файл никогда не генерируется. В `index.tsx` вызывается
  `serviceWorker.unregister()`.
- Итог: приложение не устанавливается, офлайна нет — как и записано в карте.

## 2. Цель и рамки

Сделать Bigfin устанавливаемым на телефон (Android/Chrome и iOS/Safari) с
корректной иконкой и именем, дать офлайн-заставку и быстрые повторные
загрузки. Ранняя мобильность без сторов.

**В объёме:** манифест + иконки, правки `<head>`, рукописный Service Worker,
регистрация с автообновлением, смоук-проверка на собранном приложении.

**Вне объёма (backlog):** push-уведомления и Capacitor (⑬b), офлайн-работа с
данными (только заставка), глубокая полировка мобильных экранов — отдельными
задачами по мере dogfooding (базовая адаптивность Tailwind уже есть).

## 3. Ограничение и выбор подхода

Новые npm-зависимости запрещены (lockfile под хуком) → `vite-plugin-pwa`
не берём. Всё руками:

- **Service Worker** — один статический файл `public/sw.js` без сборки.
  Без precache-манифеста ассетов: вместо него网络-стратегии по типам запросов
  (см. §6) — проще, а офлайн-заставку и быстрые повторные загрузки даёт.
- **Иконки** — квадратная монограмма «B» (бренд Bigfin) белым на фирменном
  тёмном `#0a0e1a` (цвет логотипа). Исходник — авторский
  `public/pwa/icon.svg`; PNG-варианты рендерятся скриптом
  `scripts/render-pwa-icons.mjs` через установленный на сервере headless
  Chromium (Playwright) и **коммитятся** — при сборке ничего не рендерится.

## 4. Манифест `public/manifest.json`

```json
{
  "name": "Bigfin — управленческий учёт",
  "short_name": "Bigfin",
  "lang": "ru",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#0a0e1a",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/pwa/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/pwa/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/pwa/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Maskable-вариант — та же монограмма с запасом поля (буква в центральных 60%),
чтобы Android-маски не резали её. CRA-файлы `logo192.png`/`logo512.png`
удаляются (в коде не используются — проверить grep-ом перед удалением).

## 5. `index.html`

- Заменить `modulepreload`-строку на `<link rel="manifest" href="/manifest.json">`.
- `<meta name="theme-color" content="#0a0e1a">` (сейчас `#000000`).
- `<link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png">` (180×180,
  монограмма на тёмном фоне, без прозрачности).
- `<meta name="apple-mobile-web-app-capable" content="yes">` и
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`.

## 6. Service Worker `public/sw.js`

Версия кэша — константа `CACHE_VERSION` в первой строке; меняется руками при
правке sw.js (для статики она и не нужна: см. стратегии).

Стратегии по запросам (только same-origin, только GET):

| Запрос | Стратегия | Зачем |
|---|---|---|
| `/api/*`, не-GET, кросс-домен | не перехватываем | учётные данные всегда живые |
| навигация (`request.mode === 'navigate'`) | **network-first**, при удаче копия `index.html` кладётся в кэш; офлайн → кэшированная копия | свежий деплой виден сразу (стенд автообновляется каждые 10 мин), офлайн даёт заставку приложения |
| `/assets/*` (хэшированные бандлы Vite) | **cache-first** с дозаписью | имена содержат хэш — содержимое неизменно |
| прочая статика (svg, png, шрифты, manifest) | **stale-while-revalidate** | быстро + самообновляется |

`install` → `self.skipWaiting()` не зовём автоматически: ждём команду.
`activate` → чистка кэшей чужих версий + `clients.claim()`.
`message` `{type:'SKIP_WAITING'}` → `self.skipWaiting()`.

## 7. Регистрация: `src/lib/registerServiceWorker.ts`

CRA-файл `src/serviceWorker.tsx` удаляется. Новый модуль:

- регистрирует `/sw.js` только в `import.meta.env.PROD` и при
  `'serviceWorker' in navigator`;
- новый воркер в `waiting` → сразу `postMessage({type:'SKIP_WAITING'})`;
  на `controllerchange` — один `location.reload()` (флаг от повторов).
  Пользователя не спрашиваем: приложение учётное, тихая перезагрузка на
  свежую версию безопаснее зоопарка версий;
- в dev — активные регистрации снимаются (`getRegistrations()→unregister()`),
  чтобы старый SW не мешал разработке.

`index.tsx`: `serviceWorker.unregister()` → `registerServiceWorker()`.

## 8. Проверка

- Unit-тестов на sw.js не пишем: файл вне сборки (модульный импорт в vitest
  невозможен), он короткий (<120 строк) и целиком покрывается живым смоуком.
- Смоук на собранном приложении (`vite build` + `vite preview`) через
  headless Chromium: манифест отдаётся и валиден; SW регистрируется и
  контролирует страницу; повторная навигация в офлайне (`context.setOffline`)
  отдаёт приложение; `/api/*` идёт мимо SW.
- `pnpm typecheck` webapp; полный vitest не должен сломаться.

## 9. Порядок реализации (1 срез → 1 PR)

1. Иконки (icon.svg + скрипт рендера + PNG) → манифест → `<head>`.
2. `sw.js` + регистрация + чистка CRA-файла.
3. Сборка + живой смоук headless-браузером, итоги в PR.
