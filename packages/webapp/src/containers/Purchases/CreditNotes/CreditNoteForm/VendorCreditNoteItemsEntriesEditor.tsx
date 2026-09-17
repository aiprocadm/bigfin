import React from 'react';
import classNames from 'classnames';
import { FastField, FieldProps } from 'formik';
import { CLASSES } from '@/constants/classes';
import { entriesFieldShouldUpdate } from './utils';
import { useVendorCreditNoteFormContext } from './VendorCreditNoteFormProvider';
import ItemsEntriesTable from '@/containers/Entries/ItemsEntriesTable';

export default function VendorCreditNoteItemsEntriesEditor() {
  const { items } = useVendorCreditNoteFormContext();
  return (
    <div className={classNames(CLASSES.PAGE_FORM_BODY)}>
      <FastField
        name={'entries'}
        items={items}
        shouldUpdate={entriesFieldShouldUpdate}
      >
        {({
          form: { values, setFieldValue },
          field: { value },
          meta: { error },
        }: FieldProps) => (
          <ItemsEntriesTable
            value={value}
            onChange={(entries) => {
              setFieldValue('entries', entries);
            }}
            items={items}
            // Formik объявляет ошибку поля строкой, но у поля-списка это
            // список ошибок по строкам — его и читает таблица.
            errors={error as unknown as any[] | undefined}
            linesNumber={4}
            currencyCode={values.currency_code}
            enableTaxRates={false}
          />
        )}
      </FastField>
    </div>
  );
}
