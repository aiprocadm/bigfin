import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Всплывающее кита несёт класс сброса (UI-044 ТЗ-4).
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ: в окне выбора периода кнопки были в чёрной рамке, а
 * у списка готовых периодов торчали точки. Окна, меню и поповеры рисуются в
 * портале у <body> — вне `.bigfin-ui`, и общий сброс стилей до них не
 * доходил. Сброс действует и на `.bigfin-portal`; каждый элемент кита,
 * открывающийся в портале, обязан этот класс нести.
 */
const UI = __dirname;
const GLOBALS = fs.readFileSync(path.resolve(UI, '../../styles/globals.css'), 'utf8');

const portalFiles = fs
  .readdirSync(UI)
  .filter((name) => name.endsWith('.tsx') && !/\.(spec|test|stories)\./.test(name))
  .filter((name) => /Primitive\.Portal|<DialogPortal|<DrawerPortal/.test(activeCode(fs.readFileSync(path.join(UI, name), 'utf8'))));

describe('всплывающее кита получает общий сброс', () => {
  it('сброс в globals.css действует и на .bigfin-portal', () => {
    expect(GLOBALS).toContain(':is(.bigfin-ui, .bigfin-portal) button');
    expect(GLOBALS).toContain(':is(.bigfin-ui, .bigfin-portal) ul');
  });

  it('элементы с порталом нашлись', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(portalFiles.length).toBeGreaterThanOrEqual(6);
  });

  it('каждый элемент с порталом несёт класс bigfin-portal', () => {
    const missing = portalFiles.filter(
      (name) => !activeCode(fs.readFileSync(path.join(UI, name), 'utf8')).includes('bigfin-portal'),
    );
    expect(missing).toEqual([]);
  });
});
