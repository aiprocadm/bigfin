// @ts-nocheck
import intl from 'react-intl-universal';
import clsx from 'classnames';
import { Field, useFormikContext } from 'formik';
import {
  Button,
  Classes,
  Popover,
  PopoverInteractionKind,
} from '@blueprintjs/core';
import { FFormGroup } from '@/components';
import { UploadAttachmentsPopoverContent } from './UploadAttachmentsPopoverContent';
import { transformToCamelCase, transfromToSnakeCase } from '@/utils';
import styles from './UploadAttachmentButton.module.scss';

function UploadAttachmentButtonButtonContentField() {
  return (
    <Field name={'attachments'}>
      {({ form: { setFieldValue }, field: { value } }) => (
        <UploadAttachmentsPopoverContent
          value={transformToCamelCase(value)}
          onChange={(changedValue) => {
            setFieldValue('attachments', transfromToSnakeCase(changedValue));
          }}
        />
      )}
    </Field>
  );
}

export function UploadAttachmentButton() {
  const { values } = useFormikContext();
  const uploadedFiles = values?.attachments?.length || 0;

  return (
    <FFormGroup
      name={'attachments'}
      label={intl.get('attachments.label.attachments')}
      className={styles.attachmentField}
      fastField={true}
    >
      <Popover
        interactionKind={PopoverInteractionKind.CLICK}
        popoverClassName={clsx(styles.popover, Classes.POPOVER_CONTENT_SIZING)}
        placement={'top-start'}
        content={<UploadAttachmentButtonButtonContentField />}
      >
        <Button className={styles.attachmentButton}>
          {uploadedFiles > 0 ? (
            <>{intl.get('attachments.label.upload')} ({uploadedFiles})</>
          ) : (
            <>{intl.get('attachments.label.upload')}</>
          )}
        </Button>
      </Popover>
    </FFormGroup>
  );
}
