// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import * as Yup from 'yup';

Yup.addMethod(Yup.string, 'digits', function () {
  return this.test(
    'is-digits',
    '${path} should be digits only.',
    (value: any) => /^(0|[1-9]\d*)$/.test(value),
  );
});

Yup.addMethod(Yup.number, 'decimalScale', function(scale) {
  return this.test(
    'numeric-length',
    '${path} should decimal length ',
    (value: any) => {
      const reg = new RegExp(/^(?:\d{1,13}|(?!.{15})\d+\.\d+)$/);
      return reg.test(value);
    },
  );
})

export default Yup;
