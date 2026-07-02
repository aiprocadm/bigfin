import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AbilitySubject,
  PaymentMadeAction,
} from '@/constants/abilityOption';
import { useBill } from '@/hooks/query';
import { useAbilityContext } from '@/hooks/utils';

import { BillDetailsHeaderV2 } from './BillDetailsHeaderV2';
import { BillDetailsOverviewTabV2 } from './BillDetailsOverviewTabV2';
import { BillDetailsSkeletonV2 } from './BillDetailsSkeletonV2';
import { BillGLEntriesTabV2 } from './BillGLEntriesTabV2';
import { BillLandedCostTabV2 } from './BillLandedCostTabV2';
import { BillPaymentTransactionsTabV2 } from './BillPaymentTransactionsTabV2';
import type { BillDetail } from './types';

interface BillDetailsContentV2Props {
  billId?: number | string;
}

// useBill — легаси react-query хук без типов, кастуем результат локально.
interface UseBillResult {
  data: BillDetail | undefined;
  isLoading: boolean;
}

// AbilityContext приходит из легаси-барреля — типизируем только то,
// что используем.
interface AbilityLike {
  can: (action: string, subject: string) => boolean;
}

/**
 * Содержимое drawer'а «Детали счёта поставщика»: загрузка данных,
 * скелетон, компоновка «шапка (закреплена) + прокручиваемые вкладки».
 * Id вкладок сохранены из легаси DrawerMainTabs.
 */
export function BillDetailsContentV2({ billId }: BillDetailsContentV2Props) {
  const { data: bill, isLoading } = useBill(billId, {
    enabled: !!billId,
  }) as UseBillResult;

  const ability = useAbilityContext() as unknown as AbilityLike;
  const canViewPayments = ability.can(
    PaymentMadeAction.View,
    AbilitySubject.PaymentMade,
  );

  if (isLoading || !bill?.id) {
    return <BillDetailsSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BillDetailsHeaderV2 bill={bill} billId={bill.id} />

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
            <TabsTrigger value="landed_cost">
              {intl.get('located_landed_cost')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <BillDetailsOverviewTabV2 bill={bill} />
          </TabsContent>

          <TabsContent value="journal_entries">
            <BillGLEntriesTabV2 billId={bill.id} />
          </TabsContent>

          {canViewPayments ? (
            <TabsContent value="payment_transactions">
              <BillPaymentTransactionsTabV2 billId={bill.id} />
            </TabsContent>
          ) : null}

          <TabsContent value="landed_cost">
            <BillLandedCostTabV2 billId={bill.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
