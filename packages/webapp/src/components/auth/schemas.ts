import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Введите имя'),
    email: z.string().email('Введите корректный email'),
    password: z.string().min(10, 'Пароль должен быть не короче 10 символов'),
    confirmPassword: z.string(),
    agreedToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .refine((data) => data.agreedToTerms === true, {
    message: 'Необходимо согласие с условиями',
    path: ['agreedToTerms'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(10, 'Пароль должен быть не короче 10 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
