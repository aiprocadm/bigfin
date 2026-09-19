// © 2026 Bigfin
import intl from 'react-intl-universal';
import { z } from 'zod';

import { isValidInn } from '@/utils/russianLegalAttributes/inn';
import { isValidKpp } from '@/utils/russianLegalAttributes/kpp';
import { isValidOgrn } from '@/utils/russianLegalAttributes/ogrn';
import { isValidOgrnip } from '@/utils/russianLegalAttributes/ogrnip';
import { isValidBik } from '@/utils/russianLegalAttributes/bik';

/**
 * Форма юрлица (этап 6 ТЗ, §6.4).
 *
 * Проверки ИНН/КПП/ОГРН переиспользованы из `utils/russianLegalAttributes` —
 * теми же, что стоят в реквизитах организации. Третья версия этих правил
 * разошлась бы с первыми двумя, и человек увидел бы, что один и тот же ИНН
 * в одном месте принимается, а в другом нет.
 */

const optionalText = () => z.string().trim().optional().default('');

/** Необязательное поле с проверкой: пустое пропускаем, заполненное — проверяем. */
const checkedText = (isValid: (value: string) => boolean, messageKey: string) =>
  optionalText().refine(
    (value) => !value || isValid(value),
    () => ({ message: intl.get(messageKey) }),
  );

export const getLegalEntitySchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, intl.get('legal_entities.error.name_required')),

    fullName: optionalText(),

    form: z
      .string()
      .trim()
      .min(1, intl.get('legal_entities.error.form_required')),

    /**
     * ИНН: 10 цифр у юрлица, 12 у ИП и самозанятого.
     *
     * Сначала говорим про длину и только потом про контрольную сумму —
     * иначе человек с восемью цифрами получит совет «проверьте номер»
     * вместо «цифр не хватает».
     */
    inn: optionalText().superRefine((value, ctx) => {
      if (!value) return;

      if (!/^(\d{10}|\d{12})$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: intl.get('validation.inn.length'),
        });
      } else if (!isValidInn(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: intl.get('validation.inn.checksum'),
        });
      }
    }),

    kpp: checkedText(isValidKpp, 'validation.kpp.format'),

    /**
     * ОГРН (13 цифр) и ОГРНИП (15) лежат в одной колонке, поэтому принимаем
     * оба, а подсказку даём по длине введённого — иначе ИП увидит совет про
     * ОГРН, которого у него нет.
     */
    ogrn: optionalText().superRefine((value, ctx) => {
      if (!value) return;

      const isIp = value.length === 15;
      if (isIp ? isValidOgrnip(value) : isValidOgrn(value)) return;

      const lengthOk = isIp ? /^\d{15}$/.test(value) : /^\d{13}$/.test(value);
      const prefix = isIp ? 'validation.ogrnip' : 'validation.ogrn';

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: intl.get(lengthOk ? `${prefix}.checksum` : `${prefix}.length`),
      });
    }),

    taxSystem: optionalText(),

    /**
     * Плательщик НДС.
     *
     * Не выводится из налогового режима нарочно: на упрощёнке НДС бывает
     * (импорт, добровольный переход), а на общей системе бывает
     * освобождение. Угадать за человека — значит однажды выставить счёт с
     * неверным НДС и не сказать об этом.
     */
    vatPayer: z.boolean().optional().default(false),

    /** Валюта учёта юрлица: у группы с зарубежным лицом она своя. */
    baseCurrency: optionalText(),

    directorName: optionalText(),
    legalAddress: optionalText(),

    /**
     * Фактический адрес.
     *
     * Отдельно от юридического: они совпадают далеко не всегда, а в
     * документах нужны оба.
     */
    actualAddress: optionalText(),

    // --- Банк -------------------------------------------------------------
    // Реквизиты нужны печатным формам (§8.3). Там действует правило «всё или
    // ничего»: неполные банковские реквизиты в счёте хуже отсутствующих —
    // по ним нельзя заплатить, а выглядят они заполненными.
    bankName: optionalText(),

    /**
     * БИК: девять цифр с контрольной проверкой.
     *
     * Проверка взята из того же места, что и в реквизитах организации.
     */
    bik: checkedText(isValidBik, 'validation.bik.format'),

    /** Расчётный счёт: двадцать цифр. */
    account: optionalText().superRefine((value, ctx) => {
      if (!value) return;

      if (!/^\d{20}$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: intl.get('validation.account.length'),
        });
      }
    }),

    /** Корреспондентский счёт банка: тоже двадцать цифр. */
    correspondentAccount: optionalText().superRefine((value, ctx) => {
      if (!value) return;

      if (!/^\d{20}$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: intl.get('validation.account.length'),
        });
      }
    }),

    /**
     * Доля владельца в процентах. Нужна консолидации (этап 7): по ней
     * урезаются показатели юрлица, принадлежащего группе не целиком.
     * Больше 100% или меньше нуля доля быть не может.
     */
    ownershipShare: z
      .string()
      .trim()
      .optional()
      .default('100')
      .superRefine((value, ctx) => {
        if (!value) return;

        const parsed = Number(String(value).replace(',', '.'));

        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: intl.get('legal_entities.error.ownership_share'),
          });
        }
      }),

    isPrimary: z.boolean().optional().default(false),
    active: z.boolean().optional().default(true),
  });

export type LegalEntityFormValues = z.infer<
  ReturnType<typeof getLegalEntitySchema>
>;
