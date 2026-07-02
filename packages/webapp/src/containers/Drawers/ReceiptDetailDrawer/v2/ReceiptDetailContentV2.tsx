import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReceipt } from '@/hooks/query';

import { ReceiptDetailCardsV2 } from './ReceiptDetailCardsV2';
import { ReceiptDetailHeaderV2 } from './ReceiptDetailHeaderV2';
import { ReceiptDetailJournalV2 } from './ReceiptDetailJournalV2';
import { ReceiptDetailSkeletonV2 } from './ReceiptDetailSkeletonV2';
import type { ReceiptDetail } from './types';

interface ReceiptDetailContentV2Props {
  receiptId?: number | string;
}

// useReceipt — легаси react-query хук без типов, кастуем результат локально.
interface UseReceiptResult {
  data: ReceiptDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали чека»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + вкладки „Детали“ / „Проводки“
 * с прокручиваемым телом».
 */
export function ReceiptDetailContentV2({
  receiptId,
}: ReceiptDetailContentV2Props) {
  const { data: receipt, isLoading } = useReceipt(receiptId, {
    enabled: !!receiptId,
  }) as UseReceiptResult;

  if (isLoading || !receipt?.id) {
    return <ReceiptDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ReceiptDetailHeaderV2 receipt={receipt} receiptId={receipt.id} />

      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border bg-surface px-4 py-2 sm:px-6">
          <TabsList>
            <TabsTrigger value="details">{intl.get('details')}</TabsTrigger>
            <TabsTrigger value="journal_entries">
              {intl.get('journal_entries')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="details"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 data-[state=inactive]:hidden sm:p-6"
        >
          <ReceiptDetailCardsV2 receipt={receipt} />
        </TabsContent>

        <TabsContent
          value="journal_entries"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 data-[state=inactive]:hidden sm:p-6"
        >
          <ReceiptDetailJournalV2 receiptId={receipt.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
