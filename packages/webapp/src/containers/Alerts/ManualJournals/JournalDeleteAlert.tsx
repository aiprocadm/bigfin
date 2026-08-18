import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useDeleteJournal } from '@/hooks/query';
import { compose } from '@/utils';

import { handleDeleteErrors } from './_utils';
import { showApiError } from '@/utils/showApiError';

interface JournalDeleteAlertProps {
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
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления ручной проводки (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('journal-delete', { manualJournalId }).
 */
function JournalDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  closeDrawer,
}: JournalDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteJournalMutate, isLoading } = useDeleteJournal(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const manualJournalId = payload?.manualJournalId;
  const journalNumber = payload?.journalNumber;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем проводку, показываем тост, закрываем drawer.
  const handleConfirm = () => {
    deleteJournalMutate(manualJournalId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_journal_has_been_deleted_successfully', {
            number: journalNumber,
          }),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
        closeDrawer(DRAWERS.JOURNAL_DETAILS);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          handleDeleteErrors(errors);
        } else {
          showApiError(error);
        }
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_journal')}
      description={intl.getHTML(
        'once_delete_this_journal_you_will_able_to_restore_it',
      )}
      confirmLabel={intl.get('delete')}
      intent="danger"
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
  withDrawerActions,
)(JournalDeleteAlertRoot) as ComponentType<JournalDeleteAlertProps>;
