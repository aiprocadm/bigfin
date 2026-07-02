import { useCallback } from 'react';
import intl from 'react-intl-universal';
// Intent используется только для AppToaster — легитимное исключение проекта.
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { DataTable } from '@/components/ui/data-table';
import { useSettingEditSMSNotification } from '@/hooks/query';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

import { useSMSIntegrationContext } from './SMSIntegrationProvider';
import {
  useSMSIntegrationTableColumns,
  type SMSNotificationRow,
} from './components';

const getNotificationRowId = (row: SMSNotificationRow) => row.key;

// Легаси-хуки без типов — кастуем локально.
const useEditSMSNotification = useSettingEditSMSNotification as unknown as () => {
  mutateAsync: (values: {
    notification_key: string;
    is_notification_enabled: boolean;
  }) => Promise<unknown>;
};

const useSMSContext = useSMSIntegrationContext as unknown as () => {
  notifications: SMSNotificationRow[];
  isSMSNotificationsLoading: boolean;
  isSMSNotificationsFetching: boolean;
};

/**
 * Таблица SMS-уведомлений (новый DataTable).
 */
function SMSMessagesDataTable({
  // #withDialogActions
  openDialog,
}: any) {
  // Мутация редактирования SMS-уведомления.
  const { mutateAsync: editSMSNotification } = useEditSMSNotification();

  const { notifications, isSMSNotificationsLoading } = useSMSContext();

  const toggleSmsNotification = useCallback(
    (notificationKey: string, value: boolean) => {
      editSMSNotification({
        notification_key: notificationKey,
        is_notification_enabled: value,
      })
        .then(() => {
          AppToaster.show({
            message: intl.get(
              'sms_messages.notification_switch_change_success_message',
            ),
            intent: Intent.SUCCESS,
          });
        })
        .catch(() => {
          AppToaster.show({
            message: intl.get('something_went_wrong'),
            intent: Intent.DANGER,
          });
        });
    },
    [editSMSNotification],
  );

  // Открывает диалог редактирования текста сообщения (имя диалога сохранено).
  const handleEditMessageText = useCallback(
    ({ key }: SMSNotificationRow) => {
      openDialog('sms-message-form', { notificationkey: key });
    },
    [openDialog],
  );

  const handleEnableNotification = useCallback(
    (notification: SMSNotificationRow) => {
      toggleSmsNotification(notification.key, true);
    },
    [toggleSmsNotification],
  );

  const handleDisableNotification = useCallback(
    (notification: SMSNotificationRow) => {
      toggleSmsNotification(notification.key, false);
    },
    [toggleSmsNotification],
  );

  const handleToggleNotification = useCallback(
    (notification: SMSNotificationRow, value: boolean) => {
      toggleSmsNotification(notification.key, value);
    },
    [toggleSmsNotification],
  );

  const columns = useSMSIntegrationTableColumns({
    onEditMessageText: handleEditMessageText,
    onEnableNotification: handleEnableNotification,
    onDisableNotification: handleDisableNotification,
    onToggleNotification: handleToggleNotification,
  });

  return (
    <DataTable
      columns={columns}
      data={notifications ?? []}
      getRowId={getNotificationRowId}
      loading={isSMSNotificationsLoading}
    />
  );
}

export default compose(withDialogActions)(SMSMessagesDataTable);
