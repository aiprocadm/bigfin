import ApiService from '@/services/ApiService';

export const submitResetPassword = (password: any) => {
  return (dispatch: any) => {
    return ApiService.post('auth/reset_password', password);
  };
};
