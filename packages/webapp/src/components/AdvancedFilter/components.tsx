import React from 'react';
import { useFormikContext } from 'formik';
import { debounce } from 'lodash';

const DEBOUNCE_MS = 100;

/**
 * Advanced filter auto-save.
 */
export function useAdvancedFilterAutoSubmit() {
  const { submitForm, values } = useFormikContext<any>();
  const [isSubmit, setIsSubmit] = React.useState(false);

  const debouncedSubmit = React.useCallback(
    debounce(() => {
      return submitForm().then(() => setIsSubmit(true));
    }, DEBOUNCE_MS),
    [submitForm],
  );

  React.useEffect(() => {
    // Раньше здесь стояло `() => debouncedSubmit` — то есть отправка попадала
    // в **возврат**, а возврат React считает уборкой. Отправка срабатывала не
    // тогда, когда меняются значения, а когда крючок сворачивается
    // (Д19 карты v75).
    debouncedSubmit();
    return () => debouncedSubmit.cancel();
  }, [debouncedSubmit, values]);
}
