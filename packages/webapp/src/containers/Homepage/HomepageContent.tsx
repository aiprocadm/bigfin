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
 */
function HomepageContent() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6">
      <CashTimelineSection />

      {/* «Что говорят цифры» (этап 13 ТЗ). Стоит СРАЗУ ПОД лентой денег:
          человек только что увидел, сколько у него денег, — и тут же читает,
          что с этим не так. Блока нет вовсе, когда раздел выключен. */}
      <AiInsightsBlock scope="dashboard" />

      <OverviewSection />
      <MoneySummarySection />
      <FirstStepsSection />

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
    </div>
  );
}

export default HomepageContent;
