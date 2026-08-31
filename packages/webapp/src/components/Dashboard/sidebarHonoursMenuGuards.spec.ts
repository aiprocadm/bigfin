import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Л1 карты v34. Меню не предлагает того, чего продукт не покажет.
 *
 * У продукта два режима интерфейса. В режиме «Бизнес» шесть
 * чисто-бухгалтерских экранов скрыты: маршрут-сторож уводит на главную.
 * Пункты меню для этого помечены `accountantOnly`, и прежнее боковое меню
 * их прятало.
 *
 * Но живое меню рисует ДРУГОЙ компонент — `ConnectedSidebar`. Он собирает
 * пункты сам и смотрит только на флаг модуля: пометку `accountantOnly` и
 * право на раздел не знает. Отсюда шесть пунктов, каждый из которых молча
 * возвращает человека на главную.
 *
 * Счёт по меню: 86 пометок, из них учитывались 25.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

/** Пометки, которыми меню ограничивает показ пункта. */
const GUARDS = ['feature', 'permission', 'accountantOnly'] as const;

describe('меню и его пометки', () => {
  const menu = read('constants/sidebarMenu.tsx');
  const sidebar = read('components/Dashboard/ConnectedSidebar.tsx');

  it('меню объявляет все три пометки', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    const declared = GUARDS.filter((guard) =>
      new RegExp(`${guard}:`).test(menu),
    );

    expect(declared).toEqual([...GUARDS]);
  });

  it('живое меню учитывает каждую пометку', () => {
    const ignored = GUARDS.filter((guard) => !sidebar.includes(guard));

    expect(ignored).toEqual([]);
  });

  it('режим интерфейса берётся из общего правила, а не переписан заново', () => {
    // Правило «прятать ли accountant-only» уже живёт в constants/interfaceMode
    // и используется маршрутом-сторожем: два разных ответа на один вопрос —
    // это будущее расхождение.
    expect(sidebar).toContain('isAccountantOnlyHidden(');
  });
});
