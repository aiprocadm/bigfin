import React from 'react';
import classNames from 'classnames';
import { FastField } from 'formik';
import { CLASSES } from '@/constants/classes';
import PaymentMadeEntriesTable from './PaymentMadeEntriesTable';

export default function PaymentMadeFormBody() {
  return (
    <div className={classNames(CLASSES.PAGE_FORM_BODY)}>
      <FastField name={'entries'}>
        {({
          form: { setFieldValue, values },
          field: { value },
          meta: { error, touched },
        }: any) => (
          <PaymentMadeEntriesTable
            entries={value}
            onUpdateData={(newEntries: any) => {
              setFieldValue('entries', newEntries);
            }}
            currencyCode={values.currency_code}
          />
        )}
      </FastField>
    </div>
  );
}
