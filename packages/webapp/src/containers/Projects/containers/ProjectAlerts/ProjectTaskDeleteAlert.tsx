import React from 'react';
import intl from 'react-intl-universal';
import { FormattedHTMLMessage } from '@/components';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { useDeleteProjectTask } from '../../hooks';

import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';

import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type ProjectTaskDeleteAlertProps = AlertReduxProps<{ taskId: number }> &
  WithAlertActionsProps;

/**
 * Project tasks delete alert.
 * @returns
 */
function ProjectTaskDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { taskId },

  // #withAlertActions
  closeAlert,
}: ProjectTaskDeleteAlertProps) {
  const { mutateAsync: deleteProjectTaskMutate, isLoading } =
    useDeleteProjectTask();

  // handle cancel delete alert.
  const handleCancelDeleteAlert = () => {
    closeAlert(name);
  };

  // handleConfirm delete project task
  const handleConfirmProjectTaskDelete = () => {
    deleteProjectTaskMutate(taskId)
      .then(() => {
        AppToaster.show({
          message: intl.get('project_task.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
      })
      // Отказ сервера показываем, а не глотаем (Д1 карты v88).
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete')}
      icon="trash"
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelDeleteAlert}
      onConfirm={handleConfirmProjectTaskDelete}
      loading={isLoading}
    >
      <p>
        <FormattedHTMLMessage
          id={'project_task.alert.once_delete_this_project'}
        />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ProjectTaskDeleteAlert);
