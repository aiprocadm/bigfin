import FirstStepsSection from './FirstStepsSection';
import MoneySummarySection from './MoneySummarySection';
import AccountsReceivableSection from './AccountsReceivableSection';
import AccountsPayableSection from './AccountsPayableSection';
import FinancialAccountingSection from './FinancialAccountingSection';
import ProductsServicesSection from './ProductsServicesSection';

/**
 * Содержимое главной: сначала деньги, потом быстрые ссылки по разделам.
 *
 * Сводка идёт первой (Г2 карты v20): человек заходит утром в продукт учёта
 * денег и должен видеть деньги, а не кнопки.
 */
function HomepageContent() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <FirstStepsSection />
      <MoneySummarySection />
      <AccountsReceivableSection />
      <AccountsPayableSection />
      <FinancialAccountingSection />
      <ProductsServicesSection />
    </div>
  );
}

export default HomepageContent;
