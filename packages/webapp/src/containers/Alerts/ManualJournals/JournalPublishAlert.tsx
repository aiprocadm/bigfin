import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { usePublishJournal } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface JournalPublishAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: {
    manualJournalId?: number | string;
    journalNumber?: string;
  };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение публикации ручной проводки (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('journal-publish', { manualJournalId }).
 */
function JournalPublishAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
}: JournalPublishAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: publishJournalMutate, isLoading } = usePublishJournal(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const manualJournalId = payload?.manualJournalId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: публикуем проводку, показываем тост.
  const handleConfirm = () => {
    publishJournalMutate(manualJournalId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_manual_journal_has_been_published'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('publish_journal')}
      description={intl.get('are_sure_to_publish_this_manual_journal')}
      confirmLabel={intl.get('publish')}
      loading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

// withAlertStoreConnect — легаси-HOC (без типов): mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
)(JournalPublishAlertRoot) as ComponentType<JournalPublishAlertProps>;
