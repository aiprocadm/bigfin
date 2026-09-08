/**
 * Дополнение к объявлениям `@blueprintjs-formik/core`.
 *
 * Пакет объявляет свойства полей уже, чем их принимает на самом деле. Ниже
 * дописано **только то, что проверено по его собственному коду** (Д2 карты
 * v69) — иначе это было бы не уточнение, а выдумка:
 *
 * - `fastField` и `shouldUpdateDeps`: все поля пакета собраны как
 *   `React.createElement(Field, {...props, component: …})`, а `Field`
 *   объявлен как `FieldBaseProps` — там оба свойства есть и читаются.
 *   Проверено: `RadioGroup`, `TextArea`, `InputGroup`, `Checkbox`, `Switch`,
 *   `EditableText`, `HTMLSelect`, `NumericInput` — все через `Field`;
 * - `height` у текстового поля: `TextAreaProps` пакета его не перечисляет, а
 *   blueprint-овская `TextArea` и объявляет, и читает (пять упоминаний в её
 *   коде), и обёртка передаёт свойства насквозь.
 *
 * Чего здесь намеренно НЕТ:
 *
 * - `fastField` у группы полей (`FFormGroup`) — она единственная в пакете
 *   собрана НЕ через `Field` и признак не читает (карта v64);
 * - `fastField` у выборов (`FMultiSelect`, `FSuggest`) — они из другого
 *   пакета, `@blueprintjs-formik/select`, где слова `fastField` нет вовсе.
 */
import '@blueprintjs-formik/core';

declare module '@blueprintjs-formik/core' {
  interface RadioGroupProps {
    fastField?: boolean;
    shouldUpdateDeps?: Record<string, any>;
  }
  interface TextAreaProps {
    height?: number | string;
  }
}
