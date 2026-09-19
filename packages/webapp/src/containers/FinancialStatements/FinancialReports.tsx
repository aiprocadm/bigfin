import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { DashboardInsider, FormattedMessage as T } from '@/components';
import useFilterFinancialReports, {
  FinancialReportItem,
  FinancialReportSection,
} from './FilterFinancialReports';
import { financialReportMenus } from '@/constants/financialReportsMenu';
import { MAIN_REPORTS, withoutMainReports } from './mainReports';

/**
 * Карточка одного отчёта — ссылка на страницу отчёта.
 */
function FinancialReportsItem({ title, desc, link }: FinancialReportItem) {
  // Фон-карточку держим на <div> (легаси-стили перебивают bg на <a>),
  // а ссылку растягиваем на всю карточку через ::after (stretched link).
  return (
    <div className="group relative flex flex-col rounded-default border border-border bg-surface p-4 transition-colors hover:border-action hover:bg-surface-elevated focus-within:ring-2 focus-within:ring-action">
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
 * Большая карточка главного отчёта (п. 4.1 ТЗ).
 *
 * Раздел открывается тремя такими карточками, а не списком из двадцати
 * позиций: они отвечают на вопросы, ради которых сюда заходят — сколько
 * денег, сколько заработали, чем владеем.
 */
function MainReportCard({
  titleKey,
  descriptionKey,
  link,
}: {
  titleKey: string;
  descriptionKey: string;
  link: string;
}) {
  return (
    <Link
      to={link}
      className="flex flex-col rounded-default border border-border bg-surface p-5 transition-colors hover:border-action hover:bg-surface-elevated"
    >
      <span className="text-lg font-medium text-text-primary">
        {intl.get(titleKey)}
      </span>
      <span className="mt-1 text-sm text-text-secondary">
        {intl.get(descriptionKey)}
      </span>
    </Link>
  );
}

/**
 * Секция отчётов (например, «Финансовый учёт»).
 */
function FinancialReportsSection({
  sectionTitle,
  reports,
}: FinancialReportSection) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[0.8125rem] font-medium text-text-secondary">
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report: FinancialReportItem) => (
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

  // Остальные отчёты — свёрнутым списком: они нужны реже, и разворачивать
  // их каждый раз незачем.
  const [otherOpen, setOtherOpen] = React.useState(false);
  const otherSections = React.useMemo(
    () => withoutMainReports(financialReportMenu),
    [financialReportMenu],
  );

  return (
    <DashboardInsider name={'financial-reports'}>
      <div className="bigfin-ui min-h-full bg-background p-4 sm:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            <T id={'all_financial_reports'} />
          </h1>

          {/* Три главных отчёта — крупно и первыми (п. 4.1 ТЗ). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MAIN_REPORTS.map((report) => (
              <MainReportCard key={report.link} {...report} />
            ))}
          </div>

          {otherSections.length > 0 && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setOtherOpen((open) => !open)}
                className="flex w-fit items-center gap-1 text-sm font-medium text-text-secondary hover:text-action"
              >
                {otherOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {intl.get('reports.other.title')}
              </button>

              {otherOpen &&
                otherSections.map((section, index) => (
                  <FinancialReportsSection key={index} {...section} />
                ))}
            </div>
          )}
        </div>
      </div>
    </DashboardInsider>
  );
}
