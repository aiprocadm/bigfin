// Светлая тема — по умолчанию (выбор дизайн-системы). Тёмная включается
// только если пользователь явно сохранил её в localStorage('theme'='dark').
// Раньше тут следовали тёмной теме ОС, из-за чего весь интерфейс был тёмным.
const theme = localStorage.getItem('theme') || 'light';

if (theme === 'dark') {
  document.documentElement.classList.add('bp4-dark');
  document.body.classList.add('bp4-dark');
}

// Remove dark mode for payment portal pages
if (window.location.pathname.startsWith('/payment')) {
  document.documentElement.classList.remove('bp4-dark');
  document.body.classList.remove('bp4-dark');
}
