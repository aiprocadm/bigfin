import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/Link';
import { Spinner } from '@/components/ui/Spinner';
// Legacy JS hook (// @ts-nocheck) — мы передаём { token, email } и получаем mutation.
import { useAuthSignUpVerify } from '@/hooks/query';

type Mode = 'verifying' | 'success' | 'invalid-link' | 'failed';

type SignupVerifyVars = { token: string; email: string };
type SignupVerifyMutation = {
  mutateAsync: (vars: SignupVerifyVars) => Promise<unknown>;
};

const REDIRECT_AFTER_SUCCESS_MS = 2000;

export const EmailConfirmationPage = () => {
  const history = useHistory();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get('token');
  const email = params.get('email');

  const { mutateAsync: verifyEmail } =
    useAuthSignUpVerify({}) as unknown as SignupVerifyMutation;

  const [mode, setMode] = useState<Mode>(
    token && email ? 'verifying' : 'invalid-link',
  );

  useEffect(() => {
    if (mode !== 'verifying' || !token || !email) return;
    verifyEmail({ token, email })
      .then(() => setMode('success'))
      .catch(() => setMode('failed'));
  }, [mode, token, email, verifyEmail]);

  useEffect(() => {
    if (mode !== 'success') return;
    const id = setTimeout(
      () => history.push('/auth/login'),
      REDIRECT_AFTER_SUCCESS_MS,
    );
    return () => clearTimeout(id);
  }, [mode, history]);

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">
            Подтверждение email
          </h1>
        </div>

        {mode === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spinner size="md" />
            <p className="text-text-secondary">Подтверждаем ваш email...</p>
          </div>
        )}

        {mode === 'success' && (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Email подтверждён. Перенаправляем ко входу...
              </AlertDescription>
            </Alert>
            <Button type="button" onClick={() => history.push('/auth/login')}>
              Войти в Bigfin
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {(mode === 'failed' || mode === 'invalid-link') && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mode === 'invalid-link'
                  ? 'Ссылка повреждена. Проверьте, что вы открыли её целиком.'
                  : 'Не удалось подтвердить email. Возможно, ссылка устарела.'}
              </AlertDescription>
            </Alert>
            <Button type="button" onClick={() => history.push('/auth/login')}>
              Перейти ко входу
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
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
