import AccountsReceivableSection from './AccountsReceivableSection';
import AccountsPayableSection from './AccountsPayableSection';
import FinancialAccountingSection from './FinancialAccountingSection';
import ProductsServicesSection from './ProductsServicesSection';

/**
 * Содержимое главной: секции быстрых ссылок по разделам учёта.
 */
function HomepageContent() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <AccountsReceivableSection />
      <AccountsPayableSection />
      <FinancialAccountingSection />
      <ProductsServicesSection />
    </div>
  );
}

export default HomepageContent;
