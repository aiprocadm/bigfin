import intl from 'react-intl-universal';
import { FSelect, FSelectProps } from '@/components/Forms';

export function AccountsTypesSelect(props: FSelectProps) {
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
