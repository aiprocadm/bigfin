// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it, beforeEach } from 'vitest';

import {
  getDisplayPreferences,
  resetDisplayPreferences,
  setDisplayPreferences,
} from './displayPreferences';
import { formatOrganizationMoney } from './organizationMoney';

/**
 * Личные настройки вида действительно МЕНЯЮТ ПРОДУКТ (FIN-026 ТЗ-2).
 *
 * НАЙДЕНО СВЕРКОЙ ЗАДЕЛА, А НЕ ТЕСТАМИ. Экран настроек сохранял галочку
 * «отображать копейки», сервер её хранил — и никто её не читал. Человек
 * снимал галочку, получал «сохранено» и не видел ни одного изменения.
 *
 * Приёмка FIN-026 требует прямо: «отключение копеек меняет печать сумм во
 * всём продукте». Поэтому здесь проверяется не хранение настройки, а её
 * ВЛИЯНИЕ на общую печать денег.
 */
describe('личные настройки вида', () => {
  beforeEach(() => {
    resetDisplayPreferences();
  });

  it('по умолчанию копейки печатаются', () => {
    // Отсутствие настройки — это «человек ничего не выбирал», а не
    // «выключено».
    expect(getDisplayPreferences().showCents).toBe(true);
    expect(formatOrganizationMoney(1234.5)).toContain(',50');
  });

  it('ОТКЛЮЧЕНИЕ КОПЕЕК МЕНЯЕТ ПЕЧАТЬ СУММ', () => {
    setDisplayPreferences({ showCents: false });

    expect(formatOrganizationMoney(1234.5)).not.toContain(',50');
  });

  it('включение возвращает копейки', () => {
    setDisplayPreferences({ showCents: false });
    setDisplayPreferences({ showCents: true });

    expect(formatOrganizationMoney(1234.5)).toContain(',50');
  });

  it('строка «false» считается выключением', () => {
    // Хранилище «ключ-значение» отдаёт значения строками, и строка «false»
    // в булевом месте — самая частая причина настройки, которая «не
    // работает»: в JavaScript она истинна.
    setDisplayPreferences({ showCents: 'false' });

    expect(getDisplayPreferences().showCents).toBe(false);
  });

  it('сохранение одной галочки не сбрасывает остальные', () => {
    // Экран настроек и отчёт «Деньги» присылают только изменённое. Раньше
    // остальные значения в памяти откатывались к умолчаниям: выключил
    // проценты — и копейки молча вернулись.
    setDisplayPreferences({ showCents: false });
    setDisplayPreferences({ showPercent: false });

    expect(getDisplayPreferences().showCents).toBe(false);
    expect(getDisplayPreferences().showPercent).toBe(false);
  });

  it('тумблеры отчётов по умолчанию: проценты есть, пустых строк и переводов нет', () => {
    expect(getDisplayPreferences()).toMatchObject({
      showPercent: true,
      showEmptyRows: false,
      showTransfers: false,
    });
  });

  it('пустой ответ не ломает настройки', () => {
    setDisplayPreferences(undefined);

    expect(getDisplayPreferences().showCents).toBe(true);
  });

  it('НАСТРОЙКИ ЗАГРУЖАЮТСЯ ПРИ ВХОДЕ, а не только на своём экране', () => {
    // Сторож против возврата прежней поломки: пока настройки читал только
    // экран настроек, галочка не меняла ничего нигде.
    const provider = fs.readFileSync(
      path.resolve(__dirname, '..', 'components/Dashboard/DashboardProvider.tsx'),
      'utf8',
    );

    expect(provider).toContain('useDisplayPreferencesBoot');
  });

  it('печать денег ДЕЙСТВИТЕЛЬНО спрашивает настройки', () => {
    const money = fs.readFileSync(
      path.resolve(__dirname, 'organizationMoney.ts'),
      'utf8',
    );

    expect(money).toContain('getDisplayPreferences');
  });
});
