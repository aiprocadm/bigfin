import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AbilitySubject,
  PaymentReceiveAction,
} from '@/constants/abilityOption';
import { useInvoice } from '@/hooks/query';
import { useAbilityContext } from '@/hooks/utils';

import { InvoiceDetailHeaderV2 } from './InvoiceDetailHeaderV2';
import { InvoiceDetailOverviewTabV2 } from './InvoiceDetailOverviewTabV2';
import { InvoiceDetailSkeletonV2 } from './InvoiceDetailSkeletonV2';
import { InvoiceGLEntriesTabV2 } from './InvoiceGLEntriesTabV2';
import { InvoicePaymentTransactionsTabV2 } from './InvoicePaymentTransactionsTabV2';
import type { InvoiceDetail } from './types';

interface InvoiceDetailContentV2Props {
  invoiceId?: number | string;
}

// useInvoice — легаси react-query хук без типов, кастуем результат локально.
interface UseInvoiceResult {
  data: InvoiceDetail | undefined;
  isLoading: boolean;
}

// AbilityContext приходит из легаси-барреля — типизируем только то,
// что используем.
interface AbilityLike {
  can: (action: string, subject: string) => boolean;
}

/**
 * Содержимое drawer'а «Детали счёта покупателю»: загрузка данных,
 * скелетон, компоновка «шапка (закреплена) + прокручиваемые вкладки».
 * Id вкладок сохранены из легаси DrawerMainTabs.
 */
export function InvoiceDetailContentV2({
  invoiceId,
}: InvoiceDetailContentV2Props) {
  const { data: invoice, isLoading } = useInvoice(
    invoiceId,
    { enabled: !!invoiceId },
    undefined,
  ) as UseInvoiceResult;

  const ability = useAbilityContext() as unknown as AbilityLike;
  const canViewPayments = ability.can(
    PaymentReceiveAction.View,
    AbilitySubject.PaymentReceive,
  );

  if (isLoading || !invoice?.id) {
    return <InvoiceDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <InvoiceDetailHeaderV2 invoice={invoice} invoiceId={invoice.id} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Tabs defaultValue="details" className="flex flex-col gap-4">
          <TabsList className="max-w-full self-start overflow-x-auto">
            <TabsTrigger value="details">{intl.get('overview')}</TabsTrigger>
            <TabsTrigger value="journal_entries">
              {intl.get('journal_entries')}
            </TabsTrigger>
            {canViewPayments ? (
              <TabsTrigger value="payment_transactions">
                {intl.get('payment_transactions')}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="details">
            <InvoiceDetailOverviewTabV2 invoice={invoice} />
          </TabsContent>

          <TabsContent value="journal_entries">
            <InvoiceGLEntriesTabV2 invoiceId={invoice.id} />
          </TabsContent>

          {canViewPayments ? (
            <TabsContent value="payment_transactions">
              <InvoicePaymentTransactionsTabV2 invoiceId={invoice.id} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}
