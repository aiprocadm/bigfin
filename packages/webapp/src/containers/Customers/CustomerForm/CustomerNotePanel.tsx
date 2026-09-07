import React from 'react';
import { FormattedMessage as T, FFormGroup, FTextArea } from '@/components';

export default function CustomerNotePanel({ errors, touched, getFieldProps }: any) {
  return (
    <FFormGroup name={'note'} label={<T id={'note'} />} inline={false}>
      <FTextArea name={'note'} fill />
    </FFormGroup>
  );
}
