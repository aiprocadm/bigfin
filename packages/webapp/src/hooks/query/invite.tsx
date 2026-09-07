import { useMutation } from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import { transformToCamelCase } from '@/utils';

/**
 * Authentication invite accept.
 */
export const useAuthInviteAccept = (props: any) => {
  const apiRequest = useApiRequest();

  return useMutation(
    ([values, token]: [any, any]) => apiRequest.post(`invite/accept/${token}`, values),
    props,
  );
}

/**
 * Retrieve the invite meta by the given token.
 * @param {string} token - Token.
 */
export const useInviteMetaByToken = (token: any, props: any) => {
  return useRequestQuery(
    ['INVITE_META', token],
    { method: 'get', url: `invite/check/${token}` },
    {
      select: (res: any) => transformToCamelCase(res.data),
      ...props
    }
  );
}


export const useResendInvitation = (props: any) => {
  const apiRequest = useApiRequest();

  return useMutation(
    (userId) => apiRequest.post(`invite/users/${userId}/resend`),
    props
  )
}