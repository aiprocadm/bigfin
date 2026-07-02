import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AbilitySubject, VendorCreditAction } from '@/constants/abilityOption';
import { useVendorCredit } from '@/hooks/query';
import { useAbilityContext } from '@/hooks/utils';

import { VendorCreditDetailHeaderV2 } from './VendorCreditDetailHeaderV2';
import { VendorCreditDetailOverviewTabV2 } from './VendorCreditDetailOverviewTabV2';
import { VendorCreditDetailSkeletonV2 } from './VendorCreditDetailSkeletonV2';
import { VendorCreditGLTabV2 } from './VendorCreditGLTabV2';
import { VendorCreditRefundTabV2 } from './VendorCreditRefundTabV2';
import { VendorCreditReconcileTabV2 } from './VendorCreditReconcileTabV2';
import type { VendorCreditDetail } from './types';

interface VendorCreditDetailContentV2Props {
  vendorCreditId?: number | string;
}

interface UseVendorCreditResult {
  data: VendorCreditDetail | undefined;
  isLoading: boolean;
}

interface AbilityLike {
  can: (action: string, subject: string) => boolean;
}

/**
 * Содержимое drawer'а «Детали возврата поставщику»: шапка + вкладки
 * (детали, проводки, возвраты средств, сверка). Id вкладок — из легаси.
 */
export function VendorCreditDetailContentV2({
  vendorCreditId,
}: VendorCreditDetailContentV2Props) {
  const { data: vendorCredit, isLoading } = useVendorCredit(
    vendorCreditId,
    { enabled: !!vendorCreditId },
    undefined,
  ) as UseVendorCreditResult;

  const ability = useAbilityContext() as unknown as AbilityLike;
  const canView = ability.can(
    VendorCreditAction.View,
    AbilitySubject.VendorCredit,
  );

  if (isLoading || !vendorCredit?.id) {
    return <VendorCreditDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <VendorCreditDetailHeaderV2
        vendorCredit={vendorCredit}
        vendorCreditId={vendorCredit.id}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Tabs defaultValue="details" className="flex flex-col gap-4">
          <TabsList className="max-w-full self-start overflow-x-auto">
            <TabsTrigger value="details">{intl.get('details')}</TabsTrigger>
            <TabsTrigger value="journal_entries">
              {intl.get('journal_entries')}
            </TabsTrigger>
            {canView ? (
              <TabsTrigger value="refund_transactions">
                {intl.get('vendor_credit.drawer.label_refund_transactions')}
              </TabsTrigger>
            ) : null}
            {canView ? (
              <TabsTrigger value="reconcile_transactions">
                {intl.get('vendor_credit.drawer.label_bills_reconciled')}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="details">
            <VendorCreditDetailOverviewTabV2 vendorCredit={vendorCredit} />
          </TabsContent>
          <TabsContent value="journal_entries">
            <VendorCreditGLTabV2 vendorCreditId={vendorCredit.id} />
          </TabsContent>
          {canView ? (
            <TabsContent value="refund_transactions">
              <VendorCreditRefundTabV2 vendorCreditId={vendorCredit.id} />
            </TabsContent>
          ) : null}
          {canView ? (
            <TabsContent value="reconcile_transactions">
              <VendorCreditReconcileTabV2 vendorCreditId={vendorCredit.id} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}
