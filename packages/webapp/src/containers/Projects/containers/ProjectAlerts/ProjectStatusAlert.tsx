import React from 'react';
import intl from 'react-intl-universal';
import { FormattedHTMLMessage } from '@/components';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { useProjectStatus } from '../../hooks';

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

type ProjectStatusAlertProps = AlertReduxProps<{
  projectId: number;
  status: string;
}> &
  WithAlertActionsProps;

/**
 * Project status alert.
 * @returns
 */
function ProjectStatusAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { projectId, status },

  // #withAlertActions
  closeAlert,
}: ProjectStatusAlertProps) {
  const { mutateAsync: statusProjectMutate, isLoading } = useProjectStatus();

  // handle cancel alert.
  const handleCancelAlert = () => {
    closeAlert(name);
  };

  // handle confirm alert.
  const handleConfirmAlert = () => {
    const values = {
      status: status !== 'InProgress' ? 'InProgress' : 'Closed',
    };

    statusProjectMutate([projectId, values])
      .then(() => {
        AppToaster.show({
          message: intl.get('projects.alert.status_message'),
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
      confirmButtonText={intl.get('save')}
      intent={Intent.WARNING}
      isOpen={isOpen}
      onCancel={handleCancelAlert}
      onConfirm={handleConfirmAlert}
      loading={isLoading}
    >
      <FormattedHTMLMessage id="projects.alert.are_you_sure_you_want" />
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ProjectStatusAlert);
