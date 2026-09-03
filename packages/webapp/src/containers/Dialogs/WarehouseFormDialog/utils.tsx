import intl from 'react-intl-universal';

/**
 * Transformes the response errors types.
 */
export const transformErrors = (errors: any, { setErrors }: any) => {
  if (errors.find((error: any) => error.type === 'WAREHOUSE_CODE_NOT_UNIQUE')) {
    setErrors({
      code: intl.get('warehouse.error.warehouse_code_not_unique'),
    });
  }
};
