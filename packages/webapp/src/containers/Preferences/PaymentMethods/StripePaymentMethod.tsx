import intl from 'react-intl-universal';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StripeLogo } from '@/icons/StripeLogo';
import { usePaymentMethodsBoot } from './PreferencesPaymentMethodsBoot';
import { DialogsName } from '@/constants/dialogs';
import {
  useAlertActions,
  useDialogActions,
  useDrawerActions,
} from '@/hooks/state';
import { DRAWERS } from '@/constants/drawers';
import { STRIPE_PRICING_LINK } from './constants';
import { useIsDarkMode } from '@/hooks/useDarkMode';

/**
 * Бейдж статуса с подсказкой (destructive-статусы Stripe-аккаунта).
 */
function StatusBadgeWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Badge variant="destructive">{label}</Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px]">{hint}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Карточка способа оплаты Stripe (D-redesign, shadcn).
 */
export function StripePaymentMethod() {
  // Легаси-хуки состояния без типов — уточняем типы локально.
  const { openDialog } = useDialogActions() as unknown as {
    openDialog: (name: string, payload?: Record<string, unknown>) => void;
  };
  const { openDrawer } = useDrawerActions() as unknown as {
    openDrawer: (name: string, payload?: Record<string, unknown>) => void;
  };
  const { openAlert } = useAlertActions() as unknown as {
    openAlert: (name: string, payload?: Record<string, unknown>) => void;
  };
  const isDarkMode = useIsDarkMode();

  const { paymentMethodsState } = usePaymentMethodsBoot();
  const stripeState = paymentMethodsState?.stripe;

  const isAccountCreated = stripeState?.isStripeAccountCreated;
  const isPaymentEnabled = stripeState?.isStripePaymentEnabled;
  const isPayoutEnabled = stripeState?.isStripePayoutEnabled;
  const isStripeEnabled = stripeState?.isStripeEnabled;
  const stripePaymentMethodId = stripeState?.stripePaymentMethodId;
  const isStripeServerConfigured = stripeState?.isStripeServerConfigured;

  // Handle Stripe setup button click.
  const handleSetUpBtnClick = () => {
    openDialog(DialogsName.StripeSetup);
  };

  // Handle edit button click.
  const handleEditBtnClick = () => {
    openDrawer(DRAWERS.STRIPE_PAYMENT_INTEGRATION_EDIT, {
      stripePaymentMethodId: stripePaymentMethodId,
    });
  };

  // Handle delete connection button click.
  const handleDeleteConnectionClick = () => {
    openAlert('delete-stripe-payment-method', {
      paymentMethodId: stripePaymentMethodId,
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <StripeLogo
              color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#0A2540'}
            />
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap items-center gap-2">
                {isStripeEnabled && (
                  <Badge variant="success">{intl.get('active')}</Badge>
                )}
                {!isPaymentEnabled && isAccountCreated && (
                  <StatusBadgeWithHint
                    label={intl.get(
                      'preferences.payment_methods.stripe.badge.payment_not_enabled',
                    )}
                    hint={intl.get(
                      'preferences.payment_methods.stripe.badge.payment_not_enabled_hint',
                    )}
                  />
                )}
                {!isPayoutEnabled && isAccountCreated && (
                  <StatusBadgeWithHint
                    label={intl.get(
                      'preferences.payment_methods.stripe.badge.payout_not_enabled',
                    )}
                    hint={intl.get(
                      'preferences.payment_methods.stripe.badge.payout_not_enabled_hint',
                    )}
                  />
                )}
              </div>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {isAccountCreated && (
              <Button variant="secondary" size="sm" onClick={handleEditBtnClick}>
                {intl.get('edit')}
              </Button>
            )}
            {!isAccountCreated && (
              <Button size="sm" onClick={handleSetUpBtnClick}>
                {intl.get('preferences.payment_methods.stripe.setup')}
              </Button>
            )}
            {isAccountCreated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={intl.get('more_actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-danger focus:text-danger"
                    onClick={handleDeleteConnectionClick}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get(
                      'preferences.payment_methods.stripe.delete_connection',
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-text-secondary">
          {intl.get('preferences.payment_methods.stripe.description')}
        </p>

        <div className="flex flex-col gap-1.5 text-xs">
          <a
            target="_blank"
            rel="noreferrer"
            href={STRIPE_PRICING_LINK}
            className="w-fit text-action underline-offset-4 hover:underline"
          >
            {intl.get('preferences.payment_methods.stripe.pricing_link')}
          </a>

          {!isStripeServerConfigured && (
            <span className="text-danger">
              {intl.get('preferences.payment_methods.stripe.not_configured')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
