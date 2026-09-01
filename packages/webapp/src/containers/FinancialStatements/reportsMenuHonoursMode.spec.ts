// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { financialReportMenus } from '@/constants/financialReportsMenu';
import { filterAccountantOnlyReports } from '@/constants/interfaceMode';
import { activeCode } from '../../testing/activeCode';

/**
 * Р1 карты v40. Раздел отчётов не предлагает того, чего не откроет.
 *
 * В режиме «Бизнес» три отчёта скрыты — Главная книга, Оборотно-сальдовая
 * и Журнал. Боковое меню их прячет (карта v34), а экран «Все отчёты»
 * по-прежнему рисовал для них карточки: нажатие возвращало человека на
 * главную без единого слова.
 *
 * Меню не должно предлагать того, чего продукт не покажет.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string) =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

/** Отчёты, скрытые в режиме «Бизнес». */
const ACCOUNTANT_ONLY_REPORTS = [
  '/financial-reports/general-ledger',
  '/financial-reports/trial-balance-sheet',
  '/financial-reports/journal-sheet',
];

const allLinks = (sections: any[]): string[] =>
  sections.flatMap((section) => section.reports.map((r: any) => r.link));

describe('экран «Все отчёты» и режим интерфейса', () => {
  it('меню отчётов прочитано', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(allLinks(financialReportMenus).length).toBeGreaterThan(15);
  });

  it('в режиме «Бухгалтер» предлагаются все отчёты', () => {
    const links = allLinks(filterAccountantOnlyReports(financialReportMenus, false));

    ACCOUNTANT_ONLY_REPORTS.forEach((link) => expect(links).toContain(link));
  });

  it('в режиме «Бизнес» скрытые отчёты не предлагаются', () => {
    const links = allLinks(filterAccountantOnlyReports(financialReportMenus, true));

    ACCOUNTANT_ONLY_REPORTS.forEach((link) => expect(links).not.toContain(link));
  });

  it('экран отчётов и правда отсеивает по режиму, а не только умеет', () => {
    // Функция может существовать и быть никем не вызванной — тогда живой
    // экран остался бы прежним, а тесты зелёными.
    const filter = read('containers/FinancialStatements/FilterFinancialReports.tsx');

    expect(filter).toContain('filterAccountantOnlyReports(');
  });

  it('режим берётся из общего правила, а не переписан заново', () => {
    const filter = read('containers/FinancialStatements/FilterFinancialReports.tsx');

    expect(filter).toContain('isAccountantOnlyHidden(');
  });
});
