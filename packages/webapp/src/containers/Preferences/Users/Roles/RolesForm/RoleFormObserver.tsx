import React from 'react';
import { useFormikContext } from 'formik';
import { FormikObserver } from '@/components';

/**
 * Role form observer.
 * @returns {React.JSX}
 */
export function RoleFormObserver() {
  const { values } = useFormikContext<any>();

  // Handles the form change.
  const handleFormChange = () => {};

  return <FormikObserver onChange={handleFormChange} values={values} />;
}
