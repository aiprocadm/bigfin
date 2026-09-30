import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Поля ввода на телефоне — 16 точек (P8 ТЗ-4): иначе iPhone приближает
 * страницу при касании поля. Правило должно стоять ВНЕ слоёв — утилита
 * `text-sm` в слое иначе перебила бы его — и охватывать старые поля.
 */
describe('поля ввода на телефоне', () => {
  const css = fs.readFileSync(path.join(__dirname, 'globals.css'), 'utf8');

  it('на узком экране шрифт полей — 16px', () => {
    expect(css).toMatch(/@media \(max-width: 767px\)\s*\{\s*input:not\(\[type='checkbox'\]\)[\s\S]*?font-size: 16px;/);
  });

  it('правило вне @layer: утилиты кита его не перебивают', () => {
    const at = css.indexOf("input:not([type='checkbox'])");
    const before = css.slice(0, at);
    const opened = (before.match(/@layer [a-z]+\s*\{/g) ?? []).length;
    // Все слои, открытые выше, уже закрыты: считаем скобки после последнего @layer.
    const lastLayer = before.lastIndexOf('@layer');
    const tail = lastLayer === -1 ? '' : before.slice(lastLayer);
    const depth = (tail.match(/\{/g) ?? []).length - (tail.match(/\}/g) ?? []).length;
    expect(opened === 0 || depth <= 0).toBe(true);
  });
});
