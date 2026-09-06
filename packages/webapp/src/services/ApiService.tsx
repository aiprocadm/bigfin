import axios from '@/services/axios';

export default {

  get(resource: any, params?: any) {
    return axios.get(`/api/${resource}`, params);
  },

  post(resource: any, params?: any, config?: any) {
    return axios.post(`/api/${resource}`, params, config);
  },

  update(resource: any, slug: any, params?: any) {
    return axios.put(`/api/${resource}/${slug}`, params);
  },

  put(resource: any, params?: any) {
    return axios.put(`/api/${resource}`, params);
  },

  delete(resource: any, params?: any) {
    return axios.delete(`/api/${resource}`, params);
  }
};