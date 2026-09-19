import '@testing-library/jest-dom/vitest';

import intl from 'react-intl-universal';

import ruLocale from '@/lang/ru/index.json';

/**
 * Словарь поднимается до прогона.
 *
 * Зачем. Без этого `intl.get('password')` в тесте возвращает ПУСТУЮ СТРОКУ, и
 * проверка «есть поле «Пароль»» проходит только у того экрана, где подпись
 * зашита в разметку. То есть прогон поощрял ровно тот дефект, который мы
 * чиним: зашитый текст виден тесту, переведённый — нет.
 *
 * Берём русский словарь: интерфейс развивается по-русски, и тесты написаны на
 * русских подписях.
 */
intl.init({
  currentLocale: 'ru',
  locales: { ru: ruLocale },
  // Прогон и так шумит; недостающий ключ ловит `lang-check.js`.
  warningHandler: () => undefined,
});
