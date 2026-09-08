import intl from 'react-intl-universal';
import { FSuggest } from '../Forms';

interface BranchSuggestFieldProps {
  items: any[];
  /** Имя поля формы. Обязательно: без него `FSuggest` не к чему привязаться. */
  name: string;
  /** Остальное уходит в `FSuggest` как есть — например `name` поля формы. */
  [key: string]: any;
}

export function BranchSuggestField({ ...props }: BranchSuggestFieldProps) {
  return (
    <FSuggest
      valueAccessor={'id'}
      labelAccessor={'code'}
      textAccessor={'name'}
      inputProps={{ placeholder: intl.get('branch.suggest.placeholder') }}
      {...props}
    />
  );
}
