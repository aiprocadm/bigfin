// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';

import { DashboardInsider, FormattedMessage as T } from '@/components';
import useFilterFinancialReports from './FilterFinancialReports';
import { financialReportMenus } from '@/constants/financialReportsMenu';

/**
 * Карточка одного отчёта — ссылка на страницу отчёта.
 */
function FinancialReportsItem({ title, desc, link }) {
  // Фон-карточку держим на <div> (легаси-стили перебивают bg на <a>),
  // а ссылку растягиваем на всю карточку через ::after (stretched link).
  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-action hover:bg-surface-elevated focus-within:ring-2 focus-within:ring-action">
      <Link
        to={link}
        className="font-medium !text-text-primary outline-none after:absolute after:inset-0 group-hover:!text-action"
      >
        {title}
      </Link>
      <span className="mt-1 text-sm text-text-secondary">{desc}</span>
    </div>
  );
}

/**
 * Секция отчётов (например, «Финансовый учёт»).
 */
function FinancialReportsSection({ sectionTitle, reports }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <FinancialReportsItem key={report.link} {...report} />
        ))}
      </div>
    </section>
  );
}

/**
 * Экран «Отчёты» — меню всех финансовых отчётов (D-redesign, светлая тема).
 * Данные берутся из useFilterFinancialReports — логика не изменена,
 * переработан только визуальный слой.
 */
export default function FinancialReports() {
  const financialReportMenu = useFilterFinancialReports(financialReportMenus);

  return (
    <DashboardInsider name={'financial-reports'}>
      <div className="bigfin-ui min-h-full bg-background p-4 sm:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <h1 className="text-xl font-medium text-text-primary">
            <T id={'all_financial_reports'} />
          </h1>
          {financialReportMenu.map((section, index) => (
            <FinancialReportsSection key={index} {...section} />
          ))}
        </div>
      </div>
    </DashboardInsider>
  );
}
