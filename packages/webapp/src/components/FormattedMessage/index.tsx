import intl from 'react-intl-universal';

interface FormattedMessageProps {
  id: string;
  values?: Record<string, any>;
}

export function FormattedMessage({ id, values }: FormattedMessageProps) {
  return <>{intl.get(id, values)}</>;
}

export function FormattedHTMLMessage({
  id,
  values,
}: FormattedMessageProps) {
  // Как и у соседнего FormattedMessage: возвращаем элемент, а не строку.
  // Свойства перечислены поимённо: «всё остальное» безымянным набором чужой
  // словарь не принимает (Д30 карты v75).
  return <>{intl.formatHTMLMessage({ id, defaultMessage: '' }, values)}</>;
}

export const T = FormattedMessage;
