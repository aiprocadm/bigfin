// © 2026 Bigfin
/**
 * Что Formik передаёт полю формы.
 *
 * Formik зовёт поле не с обычными свойствами, а с «сумкой»: внутри — само
 * поле (`field`) и вся форма (`form`). Ни в одном из полей продукта эта
 * сумка не была объявлена, и слепая зона типов прятала там, среди прочего,
 * настоящие опечатки.
 *
 * Описано СВОБОДНО (`any` внутри), и это осознанно. Строгое описание Formik
 * требует знать вид значений формы, а поля общие: одно и то же денежное поле
 * стоит и в счёте, и в расходе, и в ручной операции. Строгость здесь
 * заставила бы каждое поле объявлять себя заново.
 *
 * Польза всё равно есть: пропущенное свойство и опечатка в имени теперь
 * видны, а раньше не были видны ВООБЩЕ.
 */

/** Само поле: имя, значение и обработчики. */
export interface FormikFieldPart {
  name: string;
  value?: any;
  onBlur?: (event?: any) => void;
  onChange?: (event?: any) => void;
  [key: string]: any;
}

/** Форма целиком — та её часть, которой пользуются поля. */
export interface FormikFormPart {
  setFieldValue: (name: string, value: any) => void;
  touched: Record<string, any>;
  errors: Record<string, any>;
  [key: string]: any;
}

/** «Сумка», с которой Formik зовёт поле. */
export interface FormikFieldBag {
  field: FormikFieldPart;
  form: FormikFormPart;
  [key: string]: any;
}
