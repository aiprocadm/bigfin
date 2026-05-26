import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
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
import { useAuthSendResetPassword } from '@/hooks/query/authentication';

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from './schemas';

type SendResetVars = { email: string };
type AuthMutation<V> = { mutateAsync: (vars: V) => Promise<unknown> };

export const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  const { mutateAsync: sendReset } = useAuthSendResetPassword({}) as unknown as AuthMutation<SendResetVars>;

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await sendReset({ email: data.email });
      // Differs from legacy SendResetPassword.tsx, which pushed back to
      // /auth/login + transient toast. The persistent success alert is
      // friendlier UX — users typically tab out to check email.
      setSent(true);
    } catch (err) {
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
            Сброс пароля
          </h1>
          <p className="mt-1 text-text-secondary">
            Введите email — пришлём ссылку для смены пароля.
          </p>
        </div>

        {sent ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Письмо отправлено. Проверьте почту — ссылка действительна 1 час.
            </AlertDescription>
          </Alert>
        ) : (
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
                        autoComplete="email"
                        placeholder="name@company.ru"
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
                    Отправляем...
                  </>
                ) : (
                  <>
                    Отправить ссылку
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
