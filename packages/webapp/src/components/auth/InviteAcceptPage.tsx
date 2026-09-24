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
// Сохраняем существующий provider — он несёт логику загрузки meta и обработки 404 токена.
import {
  InviteAcceptProvider,
  useInviteAcceptContext,
} from '@/containers/Authentication/InviteAcceptProvider';

import { inviteAcceptSchema, type InviteAcceptInput } from './schemas';
import intl from 'react-intl-universal';

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
    resolver: zodResolver(inviteAcceptSchema()),
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
        <p className="text-text-secondary">{intl.get('auth.loading_invite')}</p>
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
        err instanceof Error ? err.message : intl.get('auth.invite.failed');
      toast.error(message);
    }
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">
          {intl.get('auth.invite.title')}
        </h1>
        {/* Название организации подставляется В ПРЕДЛОЖЕНИЕ, а не
            приклеивается к его обрывкам: разрезанное предложение нельзя
            перевести — в другом языке части встают в другом порядке. */}
        <p className="mt-1 text-text-secondary">
          {intl.get('auth.invite.invited_to', {
            organization: ctx.inviteMeta.organizationName,
          })}
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {intl.get('auth.invite.sent_to', { email: ctx.inviteMeta.email })}
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
                <FormLabel>{intl.get('first_name')}</FormLabel>
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
                <FormLabel>{intl.get('last_name')}</FormLabel>
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
                <FormLabel>{intl.get('password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={intl.get('auth.password_hint')}
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={
                        showPassword
                            ? intl.get('auth.password.hide')
                            : intl.get('auth.password.show')
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
                <FormLabel>{intl.get('confirm_password')}</FormLabel>
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
                {intl.get('auth.invite.submitting')}
              </>
            ) : (
              <>
                {intl.get('auth.invite.submit')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-2 text-center text-sm text-text-secondary">
        <Link to="/auth/login" variant="muted">
          {intl.get('auth.invite.have_account')}
        </Link>
      </p>
    </>
  );
};

export const InviteAcceptPage = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <InviteAcceptProvider token={token}>
          <InviteAcceptForm />
        </InviteAcceptProvider>
      </div>
    </AuthLayout>
  );
};
