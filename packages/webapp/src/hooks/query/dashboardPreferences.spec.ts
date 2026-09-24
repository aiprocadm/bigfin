// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { parseDashboardPreferences } from './dashboardPreferences';

/**
 * Настройки главной из ответа сервера (FT-064, FT-065 ТЗ-3).
 *
 * Сервер отдаёт имена в змеином виде; подделка в верблюжьем повторила бы
 * ожидание кода, а не поведение сервера. Проверяем оба.
 */
describe('parseDashboardPreferences', () => {
  it('читает змеиные имена — так отвечает сервер', () => {
    expect(
      parseDashboardPreferences({
        dashboard_widgets: { order: ['plan', 'overview'], hidden: ['ai_insights'] },
        dashboard_targets: { expense_share: 60, payroll_share: 25.5 },
      }),
    ).toEqual({
      widgets: { order: ['plan', 'overview'], hidden: ['ai_insights'] },
      targets: { expenseShare: 60, payrollShare: 25.5 },
    });
  });

  it('читает верблюжьи имена', () => {
    expect(
      parseDashboardPreferences({
        dashboardWidgets: { order: ['plan'], hidden: [] },
        dashboardTargets: { expenseShare: null, payrollShare: 30 },
      }),
    ).toEqual({
      widgets: { order: ['plan'], hidden: [] },
      targets: { expenseShare: null, payrollShare: 30 },
    });
  });

  it('пустой ответ и мусор — умолчания, а не падение', () => {
    const defaults = {
      widgets: { order: [], hidden: [] },
      targets: { expenseShare: null, payrollShare: null },
    };
    expect(parseDashboardPreferences(null)).toEqual(defaults);
    expect(parseDashboardPreferences({})).toEqual(defaults);
    expect(
      parseDashboardPreferences({
        dashboard_widgets: { order: 'plan', hidden: [1, 'first_steps'] },
        dashboard_targets: { expense_share: 'много', payroll_share: -3 },
      }),
    ).toEqual({
      widgets: { order: [], hidden: ['first_steps'] },
      targets: { expenseShare: null, payrollShare: null },
    });
  });
});
