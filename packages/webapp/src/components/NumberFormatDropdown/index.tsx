import React, { useCallback } from 'react';
import { Formik, Form } from 'formik';

import '@/style/pages/FinancialStatements/NumberFormatDropdown.scss';

import NumberFormatFields from './NumberFormatFields';
import NumberFormatFooter from './NumberFormatFooter';

/**
 * Number format form popover content.
 */
export default function NumberFormatDropdown({
  numberFormat = {},
  onSubmit,
  submitDisabled = false,
}: {
  numberFormat?: Record<string, any>;
  onSubmit?: (values: any) => void;
  submitDisabled?: boolean;
}) {
  const initialValues = {
    formatMoney: 'total',
    showZero: false,
    showInRed: false,
    divideOn1000: false,
    negativeFormat: 'mines',
    precision: 2,
    ...numberFormat
  };
  // Handle cancel button click.
  const handleCancelClick = useCallback(() => {}, []);

  // Handle form submit.
  const handleFormSubmit = (
    values: any,
    { setSubmitting }: { setSubmitting: (v: boolean) => void },
  ) => {
    setSubmitting(true);
    onSubmit && onSubmit(values);
  };

  return (
    <div className={'number-format-dropdown'}>
      <Formik initialValues={initialValues} onSubmit={handleFormSubmit}>
        <Form>
          {/* Поля вида чисел свойств не принимают вовсе: `onCancelClick`
              сюда передавали, но никто его не читал (Д7 карты v84). */}
          <NumberFormatFields />
          <NumberFormatFooter submitDisabled={submitDisabled} />
        </Form>
      </Formik>
    </div>
  );
}
