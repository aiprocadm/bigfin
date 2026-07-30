// Хуки API двухфакторной аутентификации (/auth/2fa/*).
import { useMutation, useQueryClient } from 'react-query';
import useApiRequest from '../useRequest';
import { useRequestQuery } from '../useQueryRequest';

// useRequest — легаси-JS с @ts-nocheck: параметры post выводятся как
// обязательные. Сужаем форму клиента на месте использования.
type ApiClient = {
  post: (url: string, data?: unknown, config?: unknown) => Promise<any>;
};
const useTypedApiRequest = () => useApiRequest() as unknown as ApiClient;

const TwoFactorRoute = {
  State: 'auth/2fa',
  Setup: 'auth/2fa/setup',
  Enable: 'auth/2fa/enable',
  Disable: 'auth/2fa/disable',
  RegenerateBackupCodes: 'auth/2fa/backup-codes/regenerate',
};

const TWO_FACTOR_STATE_KEY = 'TWO_FACTOR_STATE';

export interface TwoFactorState {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
}

/** Состояние 2FA текущего пользователя. Ответ сервера в snake_case. */
export function useTwoFactorState(props = {}) {
  return useRequestQuery(
    [TWO_FACTOR_STATE_KEY],
    { method: 'get', url: TwoFactorRoute.State },
    {
      select: (res: any): TwoFactorState => ({
        enabled: !!res.data.enabled,
        enabledAt: res.data.enabled_at ?? null,
        backupCodesRemaining: res.data.backup_codes_remaining ?? 0,
      }),
      ...props,
    },
  );
}

/** Начать настройку: секрет + otpauth-URI для QR. */
export function useTwoFactorSetup(props = {}) {
  const apiRequest = useTypedApiRequest();

  return useMutation(
    () => apiRequest.post(TwoFactorRoute.Setup),
    props,
  );
}

/** Подтвердить код и включить 2FA; ответ содержит резервные коды. */
export function useTwoFactorEnable(props = {}) {
  const apiRequest = useTypedApiRequest();
  const queryClient = useQueryClient();

  return useMutation(
    (values: { code: string }) =>
      apiRequest.post(TwoFactorRoute.Enable, values),
    {
      ...props,
      onSuccess: (res: any, ...rest: any[]) => {
        queryClient.invalidateQueries(TWO_FACTOR_STATE_KEY);
        (props as any)?.onSuccess?.(res, ...rest);
      },
    },
  );
}

/** Отключить 2FA (подтверждение паролем). */
export function useTwoFactorDisable(props = {}) {
  const apiRequest = useTypedApiRequest();
  const queryClient = useQueryClient();

  return useMutation(
    (values: { password: string }) =>
      apiRequest.post(TwoFactorRoute.Disable, values),
    {
      ...props,
      onSuccess: (res: any, ...rest: any[]) => {
        queryClient.invalidateQueries(TWO_FACTOR_STATE_KEY);
        (props as any)?.onSuccess?.(res, ...rest);
      },
    },
  );
}

/** Перегенерировать резервные коды (подтверждение кодом из приложения). */
export function useTwoFactorRegenerateBackupCodes(props = {}) {
  const apiRequest = useTypedApiRequest();
  const queryClient = useQueryClient();

  return useMutation(
    (values: { code: string }) =>
      apiRequest.post(TwoFactorRoute.RegenerateBackupCodes, values),
    {
      ...props,
      onSuccess: (res: any, ...rest: any[]) => {
        queryClient.invalidateQueries(TWO_FACTOR_STATE_KEY);
        (props as any)?.onSuccess?.(res, ...rest);
      },
    },
  );
}
