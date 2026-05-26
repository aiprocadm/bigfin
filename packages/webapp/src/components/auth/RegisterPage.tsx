import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// The hooks module is @ts-nocheck legacy JS — useMutation params are
// inferred as `void`, so we narrow them here at the call site.
import { useAuthLogin, useAuthRegister } from '@/hooks/query/authentication';

import { registerSchema, type RegisterInput } from './schemas';

type LoginVars = { email: string; password: string };
type RegisterVars = LoginVars & { first_name: string; last_name: string };
type AuthMutation<V> = { mutateAsync: (vars: V) => Promise<unknown> };

/**
 * Splits a single "Имя Фамилия" string into first_name / last_name that
 * the legacy `auth/signup` endpoint expects. If the user only typed one
 * word we duplicate it into both fields — the backend may enforce a
 * non-empty last_name, and a duplicated value is the least-surprising
 * fallback. A proper two-field UI is tracked for D-Phase-3.
 */
const splitName = (raw: string): { first_name: string; last_name: string } => {
  const trimmed = raw.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { first_name: trimmed, last_name: trimmed };
  }
  return {
    first_name: trimmed.slice(0, spaceIdx),
    last_name: trimmed.slice(spaceIdx + 1).trim() || trimmed,
  };
};

export const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { mutateAsync: register } = useAuthRegister({}) as unknown as AuthMutation<RegisterVars>;
  const { mutateAsync: login } = useAuthLogin({}) as unknown as AuthMutation<LoginVars>;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreedToTerms: false,
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    const { first_name, last_name } = splitName(data.name);
    try {
      await register({
        first_name,
        last_name,
        email: data.email,
        password: data.password,
      });
      // Legacy Register.tsx auto-logs in after signup. Same behaviour here —
      // EnsureUserEmailNotVerified will then redirect to /auth/register/verify.
      await login({ email: data.email, password: data.password });
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 400 || status === 409) {
        setServerError('Этот email уже зарегистрирован');
        return;
      }
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      toast.error(`Сетевая ошибка: ${message}`);
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            Создайте аккаунт
          </h1>
          <p className="mt-1 text-text-secondary">Бесплатно. Без карты.</p>
        </div>

        {serverError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Иван" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.ru"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Минимум 10 символов"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={
                          showPassword ? 'Скрыть пароль' : 'Показать пароль'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтвердите пароль</FormLabel>
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      id="terms"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="terms" className="cursor-pointer leading-snug">
                      Я принимаю{' '}
                      <Link to="/terms" variant="default" className="text-sm">
                        Условия
                      </Link>{' '}
                      и{' '}
                      <Link to="/privacy" variant="default" className="text-sm">
                        Политику конфиденциальности
                      </Link>
                    </Label>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  Создаём...
                </>
              ) : (
                <>
                  Зарегистрироваться
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="mt-2 text-center text-sm text-text-secondary">
              Уже есть аккаунт? <Link to="/auth/login">Войдите</Link>
            </p>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
