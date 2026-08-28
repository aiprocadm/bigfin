import * as React from 'react';

import {
  amountSeparators,
  parseAmountInput,
  formatAmountWithGroups,
} from '@/utils/amountInput';
import { Input } from './input';

/**
 * З2 карты v37. Денежное поле для разделов новой раскладки.
 *
 * Двадцать девять мест брали сумму системным `<input type="number">`.
 * Замер в настоящем Chrome: напечатанное «1000,50» становится «100050» —
 * браузер молча выбрасывает запятую, и поле считается заполненным верно.
 * На русском браузере ровно то же самое: запятая для системного поля не
 * знак копеек.
 *
 * Поле продукта принимает и запятую, и точку, и вставленное из отчёта
 * «1 000,50», а наружу отдаёт число — таким его ждут формы и сервер.
 *
 * Пока человек печатает, поле показывает набранное как есть: перестановка
 * разрядов под курсором сбивает набор. Разряды расставляются, когда
 * человек уходит из поля.
 */
export interface MoneyFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
  > {
  value?: number | string | null;
  onChange?: (value: number | undefined) => void;
}

export const MoneyField = React.forwardRef<HTMLInputElement, MoneyFieldProps>(
  ({ value, onChange, onBlur, onFocus, ...props }, ref) => {
    const separators = amountSeparators();
    const printed = React.useMemo(
      () => formatAmountWithGroups(value ?? '', separators),
      [value, separators.decimalSeparator, separators.groupSeparator],
    );

    const [typing, setTyping] = React.useState(false);
    const [text, setText] = React.useState(printed);

    // Значение сменилось снаружи (форма подставила, черновик подгрузился) —
    // показываем его, но не перебиваем то, что человек печатает прямо сейчас.
    React.useEffect(() => {
      if (!typing) setText(printed);
    }, [printed, typing]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setText(raw);

      const parsed = parseAmountInput(raw, separators);
      onChange?.(parsed === '' ? undefined : Number(parsed));
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={(event) => {
          setTyping(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setTyping(false);
          setText(formatAmountWithGroups(value ?? '', separators));
          onBlur?.(event);
        }}
      />
    );
  },
);
MoneyField.displayName = 'MoneyField';
