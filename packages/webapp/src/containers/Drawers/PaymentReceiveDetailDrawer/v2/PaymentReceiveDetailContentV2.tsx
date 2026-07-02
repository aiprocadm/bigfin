import intl from 'react-intl-universal';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { usePaymentReceive } from '@/hooks/query';

import { PaymentReceiveDetailCardsV2 } from './PaymentReceiveDetailCardsV2';
import { PaymentReceiveDetailHeaderV2 } from './PaymentReceiveDetailHeaderV2';
import { PaymentReceiveDetailSkeletonV2 } from './PaymentReceiveDetailSkeletonV2';
import { PaymentReceiveGLEntriesV2 } from './PaymentReceiveGLEntriesV2';
import type { PaymentReceivedDetail } from './types';

interface PaymentReceiveDetailContentV2Props {
  paymentReceiveId?: number | string;
}

// usePaymentReceive — легаси react-query хук без типов, кастуем результат локально.
interface UsePaymentReceiveResult {
  data: PaymentReceivedDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали поступления оплаты»: загрузка данных,
 * скелетон, компоновка «шапка (закреплена) + прокручиваемые вкладки
 * (детали / проводки)».
 */
export function PaymentReceiveDetailContentV2({
  paymentReceiveId,
}: PaymentReceiveDetailContentV2Props) {
  const { data: paymentReceive, isLoading } = usePaymentReceive(
    paymentReceiveId,
    { enabled: !!paymentReceiveId },
  ) as UsePaymentReceiveResult;

  if (isLoading || !paymentReceive?.id) {
    return <PaymentReceiveDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PaymentReceiveDetailHeaderV2
        paymentReceive={paymentReceive}
        paymentReceiveId={paymentReceive.id}
      />

      <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <Tabs defaultValue="details" className="flex flex-col gap-4">
          <TabsList className="self-start">
            <TabsTrigger value="details">{intl.get('details')}</TabsTrigger>
            <TabsTrigger value="journal_entries">
              {intl.get('journal_entries')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex flex-col gap-4">
            <PaymentReceiveDetailCardsV2 paymentReceive={paymentReceive} />
          </TabsContent>

          <TabsContent value="journal_entries">
            <PaymentReceiveGLEntriesV2 paymentReceiveId={paymentReceive.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
