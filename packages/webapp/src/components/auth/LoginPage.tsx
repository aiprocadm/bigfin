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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// The hooks module is @ts-nocheck legacy JS — useMutation params are
// inferred as `void`, so we narrow them here at the call site.
import {
  useAuthLogin,
  useAuthSigninTwoFactor,
} from '@/hooks/query/authentication';

import {
  loginSchema,
  twoFactorCodeSchema,
  type LoginInput,
  type TwoFactorCodeInput,
} from './schemas';

type LoginVars = { email: string; password: string };
type TwoFactorVars = { twoFactorToken: string; code: string };
type AuthMutation<V> = { mutateAsync: (vars: V) => Promise<unknown> };
type SigninResponse = {
  data?: { requires_two_factor?: boolean; two_factor_token?: string };
};

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Полу-токен второго шага: не null — показываем форму кода 2FA.
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const { mutateAsync: login } = useAuthLogin({}) as unknown as AuthMutation<LoginVars>;
  const { mutateAsync: loginTwoFactor } = useAuthSigninTwoFactor(
    {},
  ) as unknown as AuthMutation<TwoFactorVars>;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const codeForm = useForm<TwoFactorCodeInput>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      // rememberMe is intentionally not forwarded — backend ignores it.
      // EnsureAuthNotAuthenticated guard around /auth/* redirects to / on success.
      const res = (await login({
        email: data.email,
        password: data.password,
      })) as SigninResponse;

      // Сервер сериализует ответы в snake_case.
      if (res?.data?.requires_two_factor && res.data.two_factor_token) {
        setTwoFactorToken(res.data.two_factor_token);
        codeForm.reset({ code: '' });
      }
    } catch (err) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 401 || status === 403) {
        setServerError('Неверный email или пароль');
        return;
      }
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      toast.error(`Сетевая ошибка: ${message}`);
    }
  };

  const backToPassword = (message: string | null = null) => {
    setTwoFactorToken(null);
    setUseBackupCode(false);
    setServerError(message);
  };

  const onSubmitCode = async (data: TwoFactorCodeInput) => {
    if (!twoFactorToken) return;
    setServerError(null);
    try {
      // Успех → EnsureAuthNotAuthenticated redirects to / (как обычный вход).
      await loginTwoFactor({ twoFactorToken, code: data.code });
    } catch (err) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as {
              response?: { status?: number; data?: { code?: string } };
            }).response
          : undefined;
      // Полу-токен живёт 5 минут: истёк — возвращаемся к паролю.
      if (response?.data?.code === 'TWO_FACTOR_TOKEN_INVALID') {
        backToPassword('Время вышло, войдите заново');
        return;
      }
      if (response?.status === 401 || response?.status === 403) {
        setServerError('Неверный код, попробуйте ещё раз');
        return;
      }
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      toast.error(`Сетевая ошибка: ${message}`);
    }
  };

  // Шаг 2: у аккаунта включена 2FA — спрашиваем код.
  if (twoFactorToken) {
    return (
      <AuthLayout>
        <Toaster />
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">
              Подтвердите вход
            </h1>
            <p className="mt-1 text-text-secondary">
              {useBackupCode
                ? 'Введите один из резервных кодов'
                : 'Введите код из приложения-аутентификатора'}
            </p>
          </div>

          {serverError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          {/* key обязателен: у шага пароля и шага кода совпадает структура
              JSX, и React переиспользует те же узлы. Controller тогда
              остаётся привязанным к полю первой формы, и поле кода молча
              не принимает ввод. */}
          <Form key="two-factor" {...codeForm}>
            <form
              onSubmit={codeForm.handleSubmit(onSubmitCode)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={codeForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {useBackupCode ? 'Резервный код' : 'Код из приложения'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        inputMode={useBackupCode ? 'text' : 'numeric'}
                        autoComplete="one-time-code"
                        placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
                        maxLength={useBackupCode ? 9 : 6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={codeForm.formState.isSubmitting}
              >
                {codeForm.formState.isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Проверяем...
                  </>
                ) : (
                  <>
                    Подтвердить
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <button
                type="button"
                className="text-sm text-text-secondary underline-offset-4 hover:underline"
                onClick={() => {
                  setUseBackupCode((v) => !v);
                  setServerError(null);
                  codeForm.reset({ code: '' });
                }}
              >
                {useBackupCode
                  ? 'Ввести код из приложения'
                  : 'Использовать резервный код'}
              </button>

              <button
                type="button"
                className="text-sm text-text-muted underline-offset-4 hover:underline"
                onClick={() => backToPassword()}
              >
                Назад ко входу
              </button>
            </form>
          </Form>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            Войдите в Bigfin
          </h1>
          <p className="mt-1 text-text-secondary">
            Введите данные, чтобы продолжить работу
          </p>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@company.ru"
                      autoComplete="email"
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
                        placeholder="••••••••"
                        autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="remember"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label htmlFor="remember" className="cursor-pointer">
                      Запомнить меня
                    </Label>
                  </FormItem>
                )}
              />
              <Link
                to="/auth/forgot-password"
                variant="muted"
                className="text-sm"
              >
                Забыли пароль?
              </Link>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  Входим...
                </>
              ) : (
                <>
                  Войти
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-text-muted">или</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="secondary" type="button" disabled>
              Войти через Google (скоро)
            </Button>

            <p className="mt-2 text-center text-sm text-text-secondary">
              Нет аккаунта?{' '}
              <Link to="/auth/register">Зарегистрируйтесь</Link>
            </p>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
