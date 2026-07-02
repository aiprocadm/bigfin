import { useEffect } from 'react';
import intl from 'react-intl-universal';

import { PaymentMethodsBoot } from './PreferencesPaymentMethodsBoot';
import { StripePreSetupDialog } from './dialogs/StripePreSetupDialog/StripePreSetupDialog';
import { StripeIntegrationEditDrawer } from './drawers/StripeIntegrationEditDrawer';
import { StripePaymentMethod } from './StripePaymentMethod';
import { useChangePreferencesPageTitle } from '@/hooks/state';
import { DialogsName } from '@/constants/dialogs';
import { DRAWERS } from '@/constants/drawers';

/**
 * Страница настроек «Способы оплаты» (D-redesign, shadcn).
 * @returns {JSX.Element}
 */
export default function PreferencesPaymentMethodsPage() {
  // useChangePreferencesPageTitle — легаси-хук без типов; уточняем тип локально.
  const changePageTitle = useChangePreferencesPageTitle() as unknown as (
    title: string,
  ) => void;

  useEffect(() => {
    changePageTitle(intl.get('payment_methods'));
  }, [changePageTitle]);

  return (
    <div className="bigfin-ui m-5 w-full max-w-[700px]">
      <PaymentMethodsBoot>
        <p className="mb-5 text-sm text-text-secondary">
          {intl.get('preferences.payment_methods.description')}
        </p>

        <div className="flex flex-col gap-4">
          <StripePaymentMethod />
        </div>

        <StripePreSetupDialog dialogName={DialogsName.StripeSetup} />
        <StripeIntegrationEditDrawer
          name={DRAWERS.STRIPE_PAYMENT_INTEGRATION_EDIT}
        />
      </PaymentMethodsBoot>
    </div>
  );
}
