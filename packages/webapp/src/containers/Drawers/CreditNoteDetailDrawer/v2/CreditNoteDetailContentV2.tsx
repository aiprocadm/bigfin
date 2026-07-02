import intl from 'react-intl-universal';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AbilitySubject, CreditNoteAction } from '@/constants/abilityOption';
import { useCreditNote } from '@/hooks/query';
import { useAbilityContext } from '@/hooks/utils';

import { CreditNoteDetailHeaderV2 } from './CreditNoteDetailHeaderV2';
import { CreditNoteDetailOverviewTabV2 } from './CreditNoteDetailOverviewTabV2';
import { CreditNoteDetailSkeletonV2 } from './CreditNoteDetailSkeletonV2';
import { CreditNoteGLTabV2 } from './CreditNoteGLTabV2';
import { CreditNoteRefundTabV2 } from './CreditNoteRefundTabV2';
import { CreditNoteReconcileTabV2 } from './CreditNoteReconcileTabV2';
import type { CreditNoteDetail } from './types';

interface CreditNoteDetailContentV2Props {
  creditNoteId?: number | string;
}

// useCreditNote — легаси react-query хук без типов, кастуем результат локально.
interface UseCreditNoteResult {
  data: CreditNoteDetail | undefined;
  isLoading: boolean;
}

interface AbilityLike {
  can: (action: string, subject: string) => boolean;
}

/**
 * Содержимое drawer'а «Детали возврата покупателю»: шапка + вкладки
 * (детали, проводки, возвраты средств, сверка). Id вкладок — из легаси.
 */
export function CreditNoteDetailContentV2({
  creditNoteId,
}: CreditNoteDetailContentV2Props) {
  const { data: creditNote, isLoading } = useCreditNote(
    creditNoteId,
    { enabled: !!creditNoteId },
    undefined,
  ) as UseCreditNoteResult;

  const ability = useAbilityContext() as unknown as AbilityLike;
  const canView = ability.can(
    CreditNoteAction.View,
    AbilitySubject.CreditNote,
  );

  if (isLoading || !creditNote?.id) {
    return <CreditNoteDetailSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CreditNoteDetailHeaderV2
        creditNote={creditNote}
        creditNoteId={creditNote.id}
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
                {intl.get('credit_note.drawer.label_refund_transactions')}
              </TabsTrigger>
            ) : null}
            {canView ? (
              <TabsTrigger value="reconcile_transactions">
                {intl.get('credit_note.drawer.label_invoices_reconciled')}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="details">
            <CreditNoteDetailOverviewTabV2 creditNote={creditNote} />
          </TabsContent>
          <TabsContent value="journal_entries">
            <CreditNoteGLTabV2 creditNoteId={creditNote.id} />
          </TabsContent>
          {canView ? (
            <TabsContent value="refund_transactions">
              <CreditNoteRefundTabV2 creditNoteId={creditNote.id} />
            </TabsContent>
          ) : null}
          {canView ? (
            <TabsContent value="reconcile_transactions">
              <CreditNoteReconcileTabV2 creditNoteId={creditNote.id} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}
