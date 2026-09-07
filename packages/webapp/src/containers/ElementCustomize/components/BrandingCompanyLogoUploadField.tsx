import { useFormikContext } from 'formik';
import { FFormGroup } from '@/components';
import { CompanyLogoUpload } from './CompanyLogoUpload';

export function BrandingCompanyLogoUploadField() {
  const { setFieldValue, values } = useFormikContext<any>();

  return (
    <FFormGroup name={'companyLogo'} label={''}>
      <CompanyLogoUpload
        initialPreview={values.companyLogoUri}
        onChange={(file) => {
          // Освобождаем предыдущий blob-URL логотипа перед заменой —
          // иначе он течёт на каждый выбор файла (серверные URL не трогаем).
          if (
            typeof values.companyLogoUri === 'string' &&
            values.companyLogoUri.startsWith('blob:')
          ) {
            URL.revokeObjectURL(values.companyLogoUri);
          }
          const imageUrl = file ? URL.createObjectURL(file) : '';

          // Reset the logo key since it is changed.
          setFieldValue('companyLogoKey', '');

          setFieldValue('_companyLogoFile', file);
          setFieldValue('companyLogoUri', imageUrl);
        }}
      />
    </FFormGroup>
  );
}
