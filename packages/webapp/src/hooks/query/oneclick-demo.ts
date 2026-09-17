import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from 'react-query';
import useApiRequest from '../useRequest';
import {
  useSetAuthToken,
  useSetAuthUserId,
  useSetOrganizationId,
} from '../state';
import { setAuthLoginCookies } from './authentication';
import { batch } from 'react-redux';
import { transformToCamelCase } from '@/utils';

interface CreateOneClickDemoValues {}
/**
 * Что отдаёт заведение демо — данные из ответа сервера
 * `{ type, code, message, data }`, разобранные в верблюжье написание, как у
 * соседнего `useOneClickDemoBuildJob`.
 *
 * Раньше крючок отдавал ответ **как есть**, а экран читал
 * `res.data.data.demo_id` в змеином написании; объявление при этом врало
 * (Д10 карты v82). Теперь крючок приведён к соседям (Д10 карты v85).
 */
export interface CreateOneClickDemoRes {
  demoId: string;
  email: string;
  buildJob: { jobId: string };
}

/**
 * Creates one-click demo account.
 * @param {UseMutationOptions<CreateOneClickDemoRes, Error, CreateOneClickDemoValues>} props
 * @returns {UseMutationResult<CreateOneClickDemoRes, Error, CreateOneClickDemoValues>}
 */
export function useCreateOneClickDemo(
  props?: UseMutationOptions<
    CreateOneClickDemoRes,
    Error,
    CreateOneClickDemoValues
  >,
): UseMutationResult<CreateOneClickDemoRes, Error, CreateOneClickDemoValues> {
  const apiRequest = useApiRequest();

  return useMutation<CreateOneClickDemoRes, Error, CreateOneClickDemoValues>(
    () =>
      apiRequest
        .post(`/demo/one_click`)
        .then((res) => transformToCamelCase(res.data.data)),
    { ...props },
  );
}

interface OneClickDemoBuildJobRes {
  id: string;
  state: string;
  isCompleted: boolean;
  isRunning: boolean;
  isWaiting: boolean;
  isFailed: boolean;
}

/**
 * Состояние постройки демо-организации. Спрашиваем по ключу демо, а не по
 * номеру джоба: номер джоба у очереди угадываемый, ключ демо — нет
 * (Д1 карты v18).
 */
export function useOneClickDemoBuildJob(
  demoId: string,
  props?: UseQueryOptions<OneClickDemoBuildJobRes, Error>,
): UseQueryResult<OneClickDemoBuildJobRes, Error> {
  const apiRequest = useApiRequest();

  return useQuery<OneClickDemoBuildJobRes, Error>(
    ['ONE_CLICK_DEMO_BUILD_JOB', demoId],
    () =>
      apiRequest
        .get(`/demo/one_click/${demoId}/build_job`)
        .then((res) => transformToCamelCase(res.data)),
    { ...props },
  );
}

interface OneClickSigninDemoValues {
  demoId: string;
}
/**
 * Вход в демо тоже возвращает ответ **как есть**, без разбора — обработчик
 * читает `res.data.access_token`. Объявлено было пустым (Д9 карты v83).
 */
interface OneClickSigninDemoRes {
  data: {
    access_token: string;
    organization_id: string;
    user_id: string;
  };
}

/**
 * Sign-in to the created one-click demo account.
 * @param {UseMutationOptions<OneClickSigninDemoRes, Error, OneClickSigninDemoValues>} props
 * @returns {UseMutationResult<OneClickSigninDemoRes, Error, OneClickSigninDemoValues>}
 */
export function useOneClickDemoSignin(
  props?: UseMutationOptions<
    OneClickSigninDemoRes,
    Error,
    OneClickSigninDemoValues
  >,
): UseMutationResult<OneClickSigninDemoRes, Error, OneClickSigninDemoValues> {
  const apiRequest = useApiRequest();

  const setAuthToken = useSetAuthToken();
  const setOrganizationId = useSetOrganizationId();
  const setUserId = useSetAuthUserId();

  return useMutation<OneClickSigninDemoRes, Error, OneClickSigninDemoValues>(
    ({ demoId }) =>
      apiRequest.post(`/demo/one_click_signin`, { demo_id: demoId }),
    {
      onSuccess: (res) => {
        // Вход в демо отдаёт ровно тот же ответ, что обычный вход
        // (`access_token` / `organization_id` / `user_id`). Прежний код
        // читал `token` и `tenant.organization_id` — таких полей сервер не
        // отдаёт вовсе, поэтому вход не срабатывал (Д1 карты v18).
        setAuthLoginCookies(res.data);

        batch(() => {
          setAuthToken(res.data.access_token);
          setOrganizationId(res.data.organization_id);
          setUserId(res.data.user_id);
        });
      },
      ...props,
    },
  );
}
