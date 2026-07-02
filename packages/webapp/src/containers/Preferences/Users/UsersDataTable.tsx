import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { DataTable } from '@/components/ui/data-table';
import { AppToaster } from '@/components';
import { useResendInvitation } from '@/hooks/query';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { compose } from '@/utils';

import { useUsersListContext } from './UsersProvider';
import { useUsersTableColumns, type UserRow } from './components';

const getUserRowId = (row: UserRow) => String(row.id);

interface ResendError {
  response?: { data?: { errors?: { type: string }[] } };
}

// Легаси-хук без типов — кастуем локально.
const useResendInvitationTyped = useResendInvitation as unknown as () => {
  mutateAsync: (userId: number) => Promise<unknown>;
};

/**
 * Таблица пользователей (новый DataTable).
 */
function UsersDataTable({
  // #withDialogActions
  openDialog,
  // #withAlertActions
  openAlert,
}: any) {
  const { mutateAsync: resendInvitation } = useResendInvitationTyped();

  // Контекст списка пользователей (легаси-провайдер без типов).
  const { users, isUsersLoading } = useUsersListContext() as {
    users: UserRow[];
    isUsersLoading: boolean;
    isUsersFetching: boolean;
  };

  // Редактирование пользователя.
  const handleEditUser = useCallback(
    (user: UserRow) => {
      openDialog('user-form', { action: 'edit', userId: user.id });
    },
    [openDialog],
  );
  // Деактивация пользователя.
  const handleInactivateUser = useCallback(
    (user: UserRow) => {
      openAlert('user-inactivate', { userId: user.id });
    },
    [openAlert],
  );
  // Активация пользователя.
  const handleActivateUser = useCallback(
    (user: UserRow) => {
      openAlert('user-activate', { userId: user.id });
    },
    [openAlert],
  );
  // Удаление пользователя.
  const handleDeleteUser = useCallback(
    (user: UserRow) => {
      openAlert('user-delete', { userId: user.id });
    },
    [openAlert],
  );
  // Повторная отправка приглашения.
  const handleResendInvitation = useCallback(
    (user: UserRow) => {
      resendInvitation(user.id)
        .then(() => {
          AppToaster.show({
            message: intl.get('preferences.users.invite_resent'),
            intent: Intent.SUCCESS,
          });
        })
        .catch((error: ResendError) => {
          const errors = error?.response?.data?.errors ?? [];
          if (errors.some((e) => e.type === 'USER_RECENTLY_INVITED')) {
            AppToaster.show({
              message: intl.get('preferences.users.recently_invited'),
              intent: Intent.WARNING,
            });
          }
        });
    },
    [resendInvitation],
  );

  const columns = useUsersTableColumns({
    onEdit: handleEditUser,
    onActivate: handleActivateUser,
    onInactivate: handleInactivateUser,
    onDelete: handleDeleteUser,
    onResendInvitation: handleResendInvitation,
  });

  return (
    <div className="bigfin-ui p-4">
      <DataTable
        columns={columns}
        data={users ?? []}
        getRowId={getUserRowId}
        loading={isUsersLoading}
      />
    </div>
  );
}

export default compose(withDialogActions, withAlertActions)(UsersDataTable);
