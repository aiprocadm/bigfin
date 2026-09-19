import CashTimelineSection from './CashTimelineSection';
import FirstStepsSection from './FirstStepsSection';
import OverviewSection from './OverviewSection';
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
 *    «доживу ли я до конца месяца». Раньше первым блоком шли подсказки по
 *    настройке и плитки показателей, то есть оглавление.
 * 2. Показатели за период и график — разбор того же вопроса вглубь.
 * 3. Сводка по деньгам, долги, справочники — реже и ниже.
 * 4. Подсказки по настройке — В КОНЦЕ. Они нужны в первую неделю жизни
 *    организации, а место занимали всегда и у всех.
 *
 * Между блоками нет карточек с тенями: страница держится на волосяных линиях
 * и воздухе. Одинаковые карточки уравнивали блоки по важности, и глазу было
 * не за что зацепиться.
 */
function HomepageContent() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6">
      <CashTimelineSection />
      <OverviewSection />
      <MoneySummarySection />
      <AccountsReceivableSection />
      <AccountsPayableSection />
      <FinancialAccountingSection />
      <ProductsServicesSection />
      <FirstStepsSection />
    </div>
  );
}

export default HomepageContent;
