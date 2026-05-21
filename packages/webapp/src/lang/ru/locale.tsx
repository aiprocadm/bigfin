// @ts-nocheck
import printValue from '../printValue';

export const locale = {
  mixed: {
    default: '${path} имеет неверное значение',
    required: '${path} — обязательное поле',
    oneOf: '${path} должно быть одним из: ${values}',
    notOneOf: '${path} не должно быть одним из: ${values}',
    notType: ({ path, type, value, originalValue }) => {
      let isCast = originalValue != null && originalValue !== value;
      let msg =
        `${path} должно быть типа \`${type}\`, ` +
        `но получено: \`${printValue(value, true)}\`` +
        (isCast
          ? ` (приведено из значения \`${printValue(originalValue, true)}\`).`
          : '.');

      if (value === null) {
        msg += `\n Если "null" — это пустое значение, пометьте схему как \`.nullable()\``;
      }

      return msg;
    },
    defined: '${path} должно быть определено',
  },
  string: {
    length: '${path} должно содержать ровно ${length} символов',
    min: '${path} должно содержать не менее ${min} символов',
    max: '${path} должно содержать не более ${max} символов',
    matches: '${path} должно соответствовать шаблону: "${regex}"',
    email: '${path} должно быть корректным email-адресом',
    url: '${path} должно быть корректным URL',
    trim: '${path} не должно содержать пробелов в начале и конце',
    lowercase: '${path} должно быть в нижнем регистре',
    uppercase: '${path} должно быть в верхнем регистре',
  },
  number: {
    min: '${path} должно быть больше или равно ${min}',
    max: '${path} должно быть меньше или равно ${max}',
    lessThan: '${path} должно быть меньше ${less}',
    moreThan: '${path} должно быть больше ${more}',
    notEqual: '${path} не должно быть равно ${notEqual}',
    positive: '${path} должно быть положительным числом',
    negative: '${path} должно быть отрицательным числом',
    integer: '${path} должно быть целым числом',
  },
  date: {
    min: '${path} должно быть позже ${min}',
    max: '${path} должно быть раньше ${max}',
  },
  boolean: {},
  object: {
    noUnknown:
      '${path} не должно содержать ключей, не указанных в схеме объекта',
  },
  array: {
    min: '${path} должно содержать не менее ${min} элементов',
    max: '${path} должно содержать не более ${max} элементов',
  },
};
