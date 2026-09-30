// Тема до первой отрисовки (этап 54 ТЗ-4, R14) — без вспышки светлым.
// Логика та же, что в src/theme/theme.ts: «bigfin.theme» = light | dark |
// system (по умолчанию system — как в системе). Прежний ключ «theme» тоже
// читается, чтобы не потерять выбор старого интерфейса.
(function () {
  var choice = 'system';
  try {
    choice = localStorage.getItem('bigfin.theme') || localStorage.getItem('theme') || 'system';
  } catch (e) {}
  var systemDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var dark = choice === 'dark' || (choice === 'system' && systemDark);

  // Страницы оплаты видит клиент — они всегда светлые. Со слешем:
  // «/payment-calendar» — наш платёжный календарь, ему тёмная тема положена.
  var path = window.location.pathname;
  if (path === '/payment' || path.indexOf('/payment/') === 0) dark = false;

  if (dark) {
    document.documentElement.classList.add('dark', 'bp4-dark');
    if (document.body) document.body.classList.add('dark', 'bp4-dark');
    else
      document.addEventListener('DOMContentLoaded', function () {
        document.body.classList.add('dark', 'bp4-dark');
      });
  }
})();
