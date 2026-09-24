import React from 'react';
import intl from 'react-intl-universal';

import CashTimelineSection from './CashTimelineSection';
import FirstStepsSection from './FirstStepsSection';
import OverviewSection from './OverviewSection';
import { AiInsightsBlock } from '@/components/ui/ai-insights';
import MoneySummarySection from './MoneySummarySection';
import AccountsReceivableSection from './AccountsReceivableSection';
import AccountsPayableSection from './AccountsPayableSection';
import FinancialAccountingSection from './FinancialAccountingSection';
import ProductsServicesSection from './ProductsServicesSection';
import PlanProgressSection from './PlanProgressSection';
import ShareTargetsSection from './ShareTargetsSection';
import HomepageCustomize from './HomepageCustomize';
import { useOverviewParams } from './useOverviewParams';
import { useHomepageWidgets } from './useHomepageWidgets';
import { HomepageWidgetId, visibleWidgets } from './homepageWidgets';

/**
 * Содержимое главной.
 *
 * Порядок отвечает на то, зачем человек сюда зашёл.
 *
 * 1. ЛЕНТА ДЕНЕГ — герой. Не «сколько у меня сейчас» (это одно число), а
 *    «доживу ли я до конца месяца».
 * 2. Показатели за период, график и «требует внимания» — разбор того же
 *    вопроса вглубь.
 * 3. Сводка по деньгам: остатки, долги, ближайшие платежи, налог.
 * 4. Подсказки по настройке — ниже: они нужны в первую неделю жизни
 *    организации, а место занимали всегда и у всех.
 * 5. Быстрые переходы — в самом конце, ОДНИМ блоком в колонках.
 *
 * Раньше пункт 5 был пятью отдельными блоками с сетками карточек-ссылок.
 * Вместе они занимали больше места, чем все настоящие цифры страницы, и
 * дублировали боковое меню. Все ссылки целы — они собраны в один блок.
 *
 * Между блоками нет карточек с тенями: страница держится на волосяных линиях
 * и воздухе. Одинаковые карточки уравнивали блоки по важности, и глазу было
 * не за что зацепиться.
 *
 * ПОРЯДОК ВЫШЕ — ПО УМОЛЧАНИЮ. Человек может переставить блоки и спрятать
 * лишние («Настроить главную», FT-064 ТЗ-3): у каждого своя главная. План и
 * доли в выручке (FT-060…FT-065) по умолчанию стоят сразу за показателями —
 * это тот же разбор периода, только против плана.
 */
function HomepageContent() {
  // Один выбор периода и базы на всю главную: показатели, план и доли
  // читают один и тот же ответ сервера.
  const params = useOverviewParams();
  const widgets = useHomepageWidgets();

  const blocks: Record<HomepageWidgetId, React.ReactNode> = {
    cash_timeline: <CashTimelineSection />,
    // «Что говорят цифры» (этап 13 ТЗ). По умолчанию стоит СРАЗУ ПОД лентой
    // денег: человек только что увидел, сколько у него денег, — и тут же
    // читает, что с этим не так. Блока нет вовсе, когда раздел выключен.
    ai_insights: <AiInsightsBlock scope="dashboard" />,
    overview: <OverviewSection params={params} />,
    plan: <PlanProgressSection params={params} />,
    shares: <ShareTargetsSection params={params} />,
    money_summary: <MoneySummarySection />,
    first_steps: <FirstStepsSection />,
    quick_links: (
      <section className="border-t border-border pt-6">
        <h2 className="text-[0.8125rem] font-medium text-text-muted">
          {intl.get('homepage.quick_links')}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <AccountsReceivableSection />
          <AccountsPayableSection />
          <FinancialAccountingSection />
          <ProductsServicesSection />
        </div>
      </section>
    ),
  };

  const shown = visibleWidgets(widgets.order, widgets.hidden);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6">
      <div className="-mb-6 flex justify-end">
        <HomepageCustomize
          order={widgets.order}
          hidden={widgets.hidden}
          onOrderChange={widgets.setOrder}
          onHiddenChange={widgets.setHidden}
          onReset={widgets.reset}
        />
      </div>

      {shown.map((id) => (
        <React.Fragment key={id}>{blocks[id]}</React.Fragment>
      ))}

      {/* Всё спрятано — пустая страница выглядела бы поломкой. */}
      {shown.length === 0 && (
        <p className="text-sm text-text-secondary">
          {intl.get('homepage.widgets.all_hidden')}
        </p>
      )}
    </div>
  );
}

export default HomepageContent;
