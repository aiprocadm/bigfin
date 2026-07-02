import { useJournal } from '@/hooks/query';

import { ManualJournalCardsV2 } from './ManualJournalCardsV2';
import { ManualJournalHeaderV2 } from './ManualJournalHeaderV2';
import { ManualJournalSkeletonV2 } from './ManualJournalSkeletonV2';
import type { ManualJournalDetail } from './types';

interface ManualJournalContentV2Props {
  manualJournalId?: number | string;
}

// useJournal — легаси react-query хук без типов, кастуем результат локально.
interface UseJournalResult {
  data: ManualJournalDetail | undefined;
  isLoading: boolean;
}

/**
 * Содержимое drawer'а «Детали ручной проводки»: загрузка данных, скелетон,
 * компоновка «шапка (закреплена) + прокручиваемые карточки».
 */
export function ManualJournalContentV2({
  manualJournalId,
}: ManualJournalContentV2Props) {
  const { data: manualJournal, isLoading } = useJournal(manualJournalId, {
    enabled: !!manualJournalId,
  }) as UseJournalResult;

  if (isLoading || !manualJournal?.id) {
    return <ManualJournalSkeletonV2 />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ManualJournalHeaderV2
        manualJournal={manualJournal}
        manualJournalId={manualJournal.id}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <ManualJournalCardsV2 manualJournal={manualJournal} />
      </div>
    </div>
  );
}
