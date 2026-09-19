import intl from 'react-intl-universal';
import { z } from 'zod';

/**
 * Проверки полей входа и регистрации.
 *
 * ПОЧЕМУ ФУНКЦИИ, А НЕ ГОТОВЫЕ СХЕМЫ. Раньше схемы объявлялись прямо здесь
 * значениями, а тексты ошибок были вписаны по-русски. Перевести их «на месте»
 * нельзя: значение модуля вычисляется при его загрузке — раньше, чем словарь
 * успевает загрузиться, — и в ошибке оказалась бы пустая строка.
 *
 * Поэтому схема собирается в тот миг, когда она нужна форме. Стоит это одной
 * парой скобок на вызове: `zodResolver(loginSchema())`.
 */

/** Наименьшая длина пароля. Держим в одном месте — правило одно на все формы. */
const PASSWORD_MIN_LENGTH = 10;

const passwordField = () =>
  z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      intl.get('auth.validation.password_too_short', {
        min: PASSWORD_MIN_LENGTH,
      }),
    );

const emailField = () => z.string().email(intl.get('auth.validation.email'));

/** «Пароли не совпадают» — правило повторяется в трёх формах. */
const withMatchingPasswords = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (data: any) => data.password === data.confirmPassword,
    {
      message: intl.get('auth.validation.passwords_mismatch'),
      path: ['confirmPassword'],
    },
  );

export const loginSchema = () =>
  z.object({
    email: emailField(),
    password: z.string().min(1, intl.get('auth.validation.password_required')),
    rememberMe: z.boolean().optional(),
  });

export const registerSchema = () =>
  withMatchingPasswords(
    z.object({
      name: z.string().min(1, intl.get('auth.validation.name_required')),
      email: emailField(),
      password: passwordField(),
      confirmPassword: z.string(),
      agreedToTerms: z.boolean(),
    }),
  ).refine((data: any) => data.agreedToTerms === true, {
    message: intl.get('auth.validation.terms_required'),
    path: ['agreedToTerms'],
  });

/**
 * Код второго шага: 6 цифр из приложения-аутентификатора либо резервный код
 * из 8 букв и цифр (дефис в середине не обязателен).
 */
export const twoFactorCodeSchema = () =>
  z.object({
    code: z
      .string()
      .trim()
      .refine(
        (v) => /^\d{6}$/.test(v) || /^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(v),
        intl.get('auth.validation.two_factor_code'),
      ),
  });

export const forgotPasswordSchema = () =>
  z.object({
    email: emailField(),
  });

export const resetPasswordSchema = () =>
  withMatchingPasswords(
    z.object({
      password: passwordField(),
      confirmPassword: z.string(),
    }),
  );

export const inviteAcceptSchema = () =>
  withMatchingPasswords(
    z.object({
      firstName: z.string().min(1, intl.get('auth.validation.name_required')),
      lastName: z
        .string()
        .min(1, intl.get('auth.validation.last_name_required')),
      password: passwordField(),
      confirmPassword: z.string(),
    }),
  );

export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof registerSchema>>;
export type ForgotPasswordInput = z.infer<
  ReturnType<typeof forgotPasswordSchema>
>;
export type ResetPasswordInput = z.infer<
  ReturnType<typeof resetPasswordSchema>
>;
export type InviteAcceptInput = z.infer<ReturnType<typeof inviteAcceptSchema>>;
export type TwoFactorCodeInput = z.infer<
  ReturnType<typeof twoFactorCodeSchema>
>;
