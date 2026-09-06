import ApiService from '@/services/ApiService';

export const submitRegister = ({ form }: any) => {
  return (dispatch: any) => {
    return ApiService.post('auth/register', { ...form });
  };
};
