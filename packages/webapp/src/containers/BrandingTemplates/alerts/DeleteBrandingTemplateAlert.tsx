// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { AppToaster } from '@/components';
import { Alert, Intent } from '@blueprintjs/core';
import { useDeletePdfTemplate } from '@/hooks/query/pdf-templates';

import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withAlertActions } from '@/containers/Alert/withAlertActions';

import { compose } from '@/utils';

/**
 * Delete branding template alert.
 */
function DeleteBrandingTemplateAlert({
  // #ownProps
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { templateId },

  // #withAlertActions
  closeAlert,
}) {
  const { mutateAsync: deleteBrandingTemplateMutate } = useDeletePdfTemplate();

  const handleConfirmDelete = () => {
    deleteBrandingTemplateMutate({ templateId })
      .then(() => {
        AppToaster.show({
          message: intl.get('branding_templates.alert.delete_success'),
          intent: Intent.SUCCESS,
        });
        closeAlert(name);
      })
      .catch(
        ({
          response: {
            data: { errors },
          },
        }) => {
          if (
            errors.find(
              (error) => error.type === 'CANNOT_DELETE_PREDEFINED_PDF_TEMPLATE',
            )
          ) {
            AppToaster.show({
              message: intl.get(
                'branding_templates.alert.cannot_delete_predefined',
              ),
              intent: Intent.DANGER,
            });
          } else {
            AppToaster.show({
              message: intl.get('something_wentwrong'),
              intent: Intent.DANGER,
            });
          }
          closeAlert(name);
        },
      );
  };

  const handleCancel = () => {
    closeAlert(name);
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirmDelete}
    >
      <p>{intl.get('branding_templates.alert.delete_confirm')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(DeleteBrandingTemplateAlert);
