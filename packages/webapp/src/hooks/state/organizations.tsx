import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setOrganizations } from '@/store/organizations/organizations.actions';
import { getCurrentOrganizationFactory } from '@/store/authentication/authentication.selectors';

export const useSetOrganizations = () => {
  const dispatch = useDispatch();

  return useCallback((organizations: any) => {
    dispatch(setOrganizations(organizations))    
  }, [dispatch]);
};

/**
 * Организация, в которой человек сейчас работает.
 *
 * Поля перечислены не все — только те, к которым обращаются экраны. Раньше
 * типа не было вовсе, отбор отдавал «пустой объект», и `organization.metadata`
 * или `organization.base_currency` считались ошибкой (Д24 карты v75).
 */
export interface CurrentOrganization {
  id?: number;
  name?: string;
  base_currency?: string;
  timezone?: string;
  fiscal_year?: string;
  language?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export const useCurrentOrganization = (): CurrentOrganization => {
  return useSelector(getCurrentOrganizationFactory()) as CurrentOrganization;
};