import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Меню показывает, ГДЕ ТЫ НАХОДИШЬСЯ.
 *
 * ЗАМЕР НА ЖИВОМ ЭКРАНЕ (20.09) ДО ПЕРЕДЕЛКИ: текущий пункт и обычный были
 * ОДНОГО цвета — `rgb(0, 82, 204)`. Отличие: жирность 600 против 500.
 *
 * Причина не в компоненте: он задавал разные цвета. Blueprint красит все
 * ссылки правилом `a, a:hover`, объявленным ВНЕ СЛОЁВ, а незаслоённое правило
 * побеждает `@layer utilities` независимо от специфичности. Утилиты цвета на
 * ссылках не применялись вовсе — ни здесь, ни в любом другом новом
 * компоненте.
 *
 * Сторож держит обе половины: и лечение в стилях, и различие в компоненте.
 */
const ROOT = path.resolve(__dirname);

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf8'));

/** Яркость цвета по sRGB — для расчёта контраста. */
function luminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const int = parseInt(hex.replace('#', ''), 16);

  return (
    0.2126 * channel((int >> 16) & 255) +
    0.7152 * channel((int >> 8) & 255) +
    0.0722 * channel(int & 255)
  );
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (high + 0.05) / (low + 0.05);
}

describe('боковое меню', () => {
  const source = read('Sidebar.tsx');

  it('текущий пункт отличается ПОВЕРХНОСТЬЮ, а не только жирностью', () => {
    // Жирность 600 против 500 — единственное, что отличало текущий пункт до
    // переделки. Этого мало: глаз ловит поверхность, а не начертание.
    expect(source).toContain('bg-surface font-semibold text-text-primary');
  });

  it('жёлтого в меню нет', () => {
    // Правило продукта: фирменный жёлтый метит ОДИН смысловой момент на
    // экране. На главной он уже стоит на точке «сегодня» в ленте денег.
    expect(source).not.toContain('bg-accent');
  });

  it('раздел с текущей страницей раскрыт всегда', () => {
    // Закрытый раздел, в котором ты находишься, прячет ответ на главный
    // вопрос меню.
    expect(source).toContain('hasActive ||');
  });

  it('свёрнутый раздел остаётся видимой подписью', () => {
    // У продукта уже была беда «страница есть, а кликнуть негде» — ради неё
    // написан отдельный сторож достижимости. Прятать пункты совсем значит
    // повторить её руками.
    expect(source).toContain('aria-expanded');
  });

  it('стили гасят чужое правило для ссылок', () => {
    const globals = activeCode(
      fs.readFileSync(path.join(ROOT, '../../styles/globals.css'), 'utf8'),
    );

    // Без этого любой новый компонент, красящий ссылку утилитой, молча
    // получает синий.
    expect(globals).toContain('.bigfin-ui a');
    expect(globals).toContain('color: inherit');
  });

  it('сброс задаёт рамке ТОЛЩИНУ, а не только цвет', () => {
    // Замер: 11 кнопок из 18 несли рамку браузера `outset` в два пикселя —
    // включая главную «Добавить». Цвет рамки задавали, и она совпадала с
    // цветом линий, поэтому выглядела как «так и задумано».
    const globals = activeCode(
      fs.readFileSync(path.join(ROOT, '../../styles/globals.css'), 'utf8'),
    );

    expect(globals).toContain('border-width: 0');
    expect(globals).toContain('border-style: solid');
  });

  it('заголовок раздела читается: контраст не ниже 4,5:1', () => {
    // СЧИТАЕМ, А НЕ ПРИКИДЫВАЕМ. Приглушённый #8C95A3 на панели #F6F7F9 даёт
    // 2,82:1 — ниже нормы. Раньше под заголовком всегда стояли пункты; у
    // свёрнутого раздела заголовок — единственное, что видно.
    const panel = '#F6F7F9';

    expect(contrast('#8C95A3', panel)).toBeLessThan(4.5);
    expect(contrast('#5B6472', panel)).toBeGreaterThanOrEqual(4.5);

    expect(source).toContain('text-text-secondary hover:text-text-primary');
    expect(source).not.toContain('text-text-muted hover:text-text-primary');
  });
});
