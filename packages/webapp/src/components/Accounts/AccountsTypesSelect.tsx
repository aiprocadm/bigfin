// @ts-nocheck
import intl from 'react-intl-universal';
import { FSelect } from '@/components/Forms';

export function AccountsTypesSelect({ ...props }) {
  return (
    <FSelect
      valueAccessor={'key'}
      labelAccessor={'label'}
      textAccessor={'label'}
      placeholder={intl.get('select_an_account')}
      {...props}
    />
  );
}
