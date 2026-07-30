// Регистрация Service Worker (только prod-сборка). Обновление — тихое:
// новому воркеру шлётся SKIP_WAITING, страница перезагружается один раз.
// Приложение учётное: тихая перезагрузка на свежую версию безопаснее
// зоопарка версий между вкладками.
let reloaded = false;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    // В dev старый воркер только мешает — снимаем регистрации.
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  // Перезагружаемся на смену контроллера только если страница уже была
  // под контролем воркера: первый захват (первый визит) — не повод.
  if (navigator.serviceWorker.controller !== null) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

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
