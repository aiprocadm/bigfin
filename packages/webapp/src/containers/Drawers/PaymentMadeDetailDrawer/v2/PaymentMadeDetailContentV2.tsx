import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePaymentMade } from '@/hooks/query';

import { PaymentMadeDetailCardsV2 } from './PaymentMadeDetailCardsV2';
import { PaymentMadeDetailHeaderV2 } from './PaymentMadeDetailHeaderV2';
import { PaymentMadeDetailSkeletonV2 } from './PaymentMadeDetailSkeletonV2';
import { PaymentMadeGLEntriesV2 } from './PaymentMadeGLEntriesV2';
import type { PaymentMadeDetail } from './types';

interface PaymentMadeDetailContentV2Props {
  paymentMadeId?: number | string;
}

// usePaymentMade — легаси react-query хук без типов, кастуем результат локально.
interface UsePaymentMadeResult {
  data: PaymentMadeDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали исходящего платежа»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + вкладки Детали/Проводки с прокруткой».
 */
export function PaymentMadeDetailContentV2({
  paymentMadeId,
}: PaymentMadeDetailContentV2Props) {
  const { data: paymentMade, isLoading } = usePaymentMade(paymentMadeId, {
    enabled: !!paymentMadeId,
  }) as UsePaymentMadeResult;

  if (isLoading || !paymentMade?.id) {
    return <PaymentMadeDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PaymentMadeDetailHeaderV2
        paymentMade={paymentMade}
        paymentMadeId={paymentMade.id}
      />

      <Tabs
        defaultValue="details"
        className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6"
      >
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="details">{intl.get('details')}</TabsTrigger>
          <TabsTrigger value="journal_entries">
            {intl.get('journal_entries')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 flex flex-col gap-4">
          <PaymentMadeDetailCardsV2 paymentMade={paymentMade} />
        </TabsContent>

        <TabsContent value="journal_entries" className="mt-4">
          <PaymentMadeGLEntriesV2 paymentMadeId={paymentMade.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
