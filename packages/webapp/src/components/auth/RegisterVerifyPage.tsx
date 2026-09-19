import intl from 'react-intl-universal';
import { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { Toaster } from '@/components/ui/sonner';
// Legacy JS hooks (// @ts-nocheck) — типы здесь сужаем вручную.
import { useAuthActions, useAuthUserVerifyEmail } from '@/hooks/state';
import { useAuthSignUpVerifyResendMail } from '@/hooks/query';

type ResendMutation = { mutateAsync: () => Promise<unknown>; isLoading: boolean };

export const RegisterVerifyPage = () => {
  const { setLogout } = useAuthActions() as { setLogout: () => void };
  const emailAddress = useAuthUserVerifyEmail() as string | null;
  const { mutateAsync: resend, isLoading } =
    useAuthSignUpVerifyResendMail({}) as unknown as ResendMutation;
  const [justResent, setJustResent] = useState(false);

  const handleResend = async () => {
    try {
      await resend();
      setJustResent(true);
      toast.success(intl.get('auth.verify.resent_toast'));
    } catch {
      toast.error(intl.get('auth.verify.resend_failed'));
    }
  };

  return (
    <AuthLayout>
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent"
            aria-hidden
          >
            <Mail className="h-6 w-6" />
          </span>
          <h1 className="text-3xl font-semibold text-text-primary">
            {intl.get('auth.verify.title')}
          </h1>
          {/* Адрес подставляется В ПРЕДЛОЖЕНИЕ, а не приклеивается к его
              обрывкам: разрезанное предложение нельзя перевести — в другом
              языке части встают в другом порядке. */}
          <p className="text-text-secondary">
            {intl.get('auth.verify.sent_to', {
              email: emailAddress ?? intl.get('auth.verify.fallback_email'),
            })}
          </p>
        </div>

        {justResent && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {intl.get('auth.verify.resent')}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button type="button" onClick={handleResend} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" />
                {intl.get('auth.verify.sending')}
              </>
            ) : (
              intl.get('auth.verify.resend')
            )}
          </Button>

          <Button type="button" variant="secondary" onClick={setLogout}>
            {intl.get('auth.verify.not_my_email')}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};
