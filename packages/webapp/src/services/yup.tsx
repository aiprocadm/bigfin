import * as Yup from 'yup';

// `this` внутри метода — сама схема; без объявления его вид неизвестен
// (Д6 карты v84).
Yup.addMethod(Yup.string, 'digits', function (this: Yup.StringSchema) {
  return this.test(
    'is-digits',
    '${path} should be digits only.',
    (value: any) => /^(0|[1-9]\d*)$/.test(value),
  );
});

Yup.addMethod(
  Yup.number,
  'decimalScale',
  function (this: Yup.NumberSchema, scale?: number) {
    return this.test(
      'numeric-length',
      '${path} should decimal length ',
      (value: any) => {
        const reg = new RegExp(/^(?:\d{1,13}|(?!.{15})\d+\.\d+)$/);
        return reg.test(value);
      },
    );
  },
);

export default Yup;
