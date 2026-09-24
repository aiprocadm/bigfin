import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож: классы анимаций работают, только если подключён их плагин
 * (UI-042-10 ТЗ-4).
 *
 * Как это случилось. `tailwindcss-animate` стоял в зависимостях, окна и меню
 * носили классы `animate-in`, `fade-in-0`, `zoom-in-95` — но строки
 * `@plugin` в `globals.css` не было, и Tailwind 4 эти классы не создавал.
 * Сборка зелёная, ошибок нет, а всё всплывающее появляется рывком.
 */
const UI = path.resolve(__dirname, '../components/ui');
const GLOBALS = fs
  .readFileSync(path.join(__dirname, 'globals.css'), 'utf8')
  // Закомментированная строка подключения — не подключение.
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('плагин анимаций подключён', () => {
  const usesAnimations = fs
    .readdirSync(UI)
    .filter((name) => name.endsWith('.tsx'))
    .some((name) =>
      /\banimate-in\b/.test(fs.readFileSync(path.join(UI, name), 'utf8')),
    );

  it('кит пользуется классами анимаций', () => {
    // Иначе проверка ниже потеряла бы смысл — стоит пересмотреть сторожа.
    expect(usesAnimations).toBe(true);
  });

  it('globals.css подключает tailwindcss-animate', () => {
    expect(GLOBALS).toMatch(/@plugin\s+['"]tailwindcss-animate['"]\s*;/);
  });
});
