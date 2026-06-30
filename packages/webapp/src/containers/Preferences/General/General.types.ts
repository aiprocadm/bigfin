/**
 * Тип значения контекста GeneralFormProvider. Сам провайдер — легаси без
 * типизации (createContext без типа), поэтому потребители приводят результат
 * useGeneralFormContext() к этому интерфейсу.
 */
export interface GeneralFormContextValue {
  isOrganizationLoading: boolean;
  isDateFormatsLoading: boolean;
  updateOrganization: (values: Record<string, unknown>) => Promise<unknown>;
  organization: { metadata?: Record<string, any> };
  dateFormats: { key: string; label: string }[];
  baseCurrencyMutateAbility: unknown[];
}
