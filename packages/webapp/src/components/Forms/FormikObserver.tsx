import { useFormikContext } from 'formik';
import { useDeepCompareEffect } from '@/hooks/utils';

export function FormikObserver({ onChange }: any) {
  const { values } = useFormikContext<any>();

  useDeepCompareEffect(() => {
    onChange(values);
  }, [values]);

  return null;
}

FormikObserver.defaultProps = {
  onChange: () => null,
};
