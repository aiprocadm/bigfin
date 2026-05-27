import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// The hooks module is @ts-nocheck legacy JS — useMutation params are
// inferred as `void`, so we narrow them here at the call site.
import { useAuthResetPassword } from '@/hooks/query/authentication';

import { resetPasswordSchema, type ResetPasswordInput } from './schemas';

type ResetPasswordVars = { password: string; confirm_password: string };
type AuthMutation<V> = {
  mutateAsync: (vars: [string, V]) => Promise<unknown>;
};

const REDIRECT_AFTER_SUCCESS_MS = 1500;

type Mode = 'idle' | 'success' | 'token-expired';

const hasTokenInvalidError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object' || !('response' in err)) return false;
  const response = (err as { response?: { data?: { errors?: unknown } } })
    .response;
  const errors = response?.data?.errors;
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (e) => e && typeof e === 'object' && 'type' in e && e.type === 'TOKEN_INVALID',
  );
};

export const ResetPasswordPage = () => {
  const { token } = useParams<{ token: string }>();
  const history = useHistory();
  const [mode, setMode] = useState<Mode>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const { mutateAsync: resetPassword } = useAuthResetPassword(
    {},
  ) as unknown as AuthMutation<ResetPasswordVars>;

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (mode !== 'success') return;
    const id = setTimeout(
      () => history.push('/auth/login'),
      REDIRECT_AFTER_SUCCESS_MS,
    );
    return () => clearTimeout(id);
  }, [mode, history]);

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await resetPassword([
        token,
        { password: data.password, confirm_password: data.confirmPassword },
      ]);
      setMode('success');
    } catch (err) {
      if (hasTokenInvalidError(err)) {
        setMode('token-expired');
        return;
      }
      const message = err instanceof Error ? err.message : 'Сетевая ошибка';
      toast.error(`Не удалось сменить пароль: ${message}`);
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            Новый пароль
          </h1>
          <p className="mt-1 text-text-secondary">
            Придумайте новый пароль для входа в Bigfin.
          </p>
        </div>

        {mode === 'success' && (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Пароль обновлён. Перенаправляем ко входу...
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Spinner size="sm" />
            </div>
          </>
        )}

        {mode === 'token-expired' && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ссылка устарела или уже использована. Запросите новую — мы
                отправим её на email.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              onClick={() => history.push('/auth/forgot-password')}
            >
              Запросить новую ссылку
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {mode === 'idle' && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Новый пароль</FormLabel>
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

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Сохраняем...
                  </>
                ) : (
                  <>
                    Сохранить новый пароль
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        <p className="mt-2 text-center text-sm text-text-secondary">
          <Link to="/auth/login" variant="muted">
            ← Вернуться к входу
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
