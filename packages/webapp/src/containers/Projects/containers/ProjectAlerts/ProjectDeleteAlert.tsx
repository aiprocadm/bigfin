import React from 'react';
import intl from 'react-intl-universal';
import { FormattedHTMLMessage } from '@/components';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { useDeleteProject } from '../../hooks';

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

type ProjectDeleteAlertProps = AlertReduxProps<{ projectId: number }> &
  WithAlertActionsProps;

/**
 * Project delete alert.
 */
function ProjectDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { projectId },

  // #withAlertActions
  closeAlert,
}: ProjectDeleteAlertProps) {
  const { mutateAsync: deleteProjectMutate, isLoading } = useDeleteProject();

  // handle cancel delete project alert.
  const handleCancelDeleteAlert = () => {
    closeAlert(name);
  };

  // handleConfirm delete project
  const handleConfirmProjectDelete = () => {
    deleteProjectMutate(projectId)
      .then(() => {
        AppToaster.show({
          message: intl.get('projects.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
      })
      // Раньше отказ разбирали как `{ response: { data: { errors } } }` и
      // ничего не делали: сообщения человек не видел, а предупреждение всё
      // равно закрывалось — отказ выглядел как успех (Д1 карты v88).
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
      onConfirm={handleConfirmProjectDelete}
      loading={isLoading}
    >
      <p>
        <FormattedHTMLMessage id={'projects.alert.once_delete_this_project'} />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ProjectDeleteAlert);
