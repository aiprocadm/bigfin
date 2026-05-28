import { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
// Сохраняем существующий provider — он несёт логику загрузки meta и обработки 404 токена.
import {
  InviteAcceptProvider,
  useInviteAcceptContext,
} from '@/containers/Authentication/InviteAcceptProvider';

import { inviteAcceptSchema, type InviteAcceptInput } from './schemas';

type InviteAcceptApiPayload = {
  first_name: string;
  last_name: string;
  password: string;
  organization_name: string;
};

type InviteMutateFn = (
  args: [InviteAcceptApiPayload, string],
) => Promise<unknown>;

const InviteAcceptForm = () => {
  const history = useHistory();
  const ctx = useInviteAcceptContext() as {
    token: string;
    inviteMeta: { email: string; organizationName: string } | null;
    isInviteMetaLoading: boolean;
    inviteAcceptMutate: InviteMutateFn;
  };
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<InviteAcceptInput>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (ctx.isInviteMetaLoading || !ctx.inviteMeta) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Spinner size="md" />
        <p className="text-text-secondary">Загружаем приглашение...</p>
      </div>
    );
  }

  const onSubmit = async (data: InviteAcceptInput) => {
    try {
      await ctx.inviteAcceptMutate([
        {
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
          organization_name: ctx.inviteMeta!.organizationName,
        },
        ctx.token,
      ]);
      toast.success(
        `Аккаунт создан. Вы приняли приглашение в «${ctx.inviteMeta!.organizationName}».`,
      );
      history.push('/auth/login');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось принять приглашение';
      toast.error(message);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">
          Приглашение в Bigfin
        </h1>
        <p className="mt-1 text-text-secondary">
          Вас пригласили в организацию{' '}
          <strong className="text-text-primary">
            «{ctx.inviteMeta.organizationName}»
          </strong>
          . Заполните данные, чтобы создать аккаунт.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Приглашение отправлено на <strong>{ctx.inviteMeta.email}</strong>.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Фамилия</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
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

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Spinner size="sm" />
                Создаём аккаунт...
              </>
            ) : (
              <>
                Принять приглашение
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-center text-sm text-text-secondary">
        <Link to="/auth/login" variant="muted">
          ← У меня уже есть аккаунт
        </Link>
      </p>
    </>
  );
};

export const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <InviteAcceptProvider token={token}>
          <InviteAcceptForm />
        </InviteAcceptProvider>
      </div>
    </AuthLayout>
  );
};
