import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Intent } from '@blueprintjs/core';
import { omit } from 'lodash';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useUploadAttachments } from '@/hooks/query/attachments';
import { useUpdateOrganization } from '@/hooks/query';
import {
  excludePrivateProps,
  transformToCamelCase,
  transformToForm,
  transfromToSnakeCase,
} from '@/utils';
import { PreferencesBrandingFormContent } from './PreferencesBrandingFormContent';
import {
  brandingSchema,
  type BrandingFormValues,
} from './PreferencesBranding.zod';
import { usePreferencesBrandingBoot } from './PreferencesBrandingBoot';

const defaultValues: BrandingFormValues = {
  logoKey: '',
  logoUri: '',
  primaryColor: '',
};

/**
 * Форма оформления: RHF-обёртка с загрузкой логотипа и сохранением.
 */
export const PreferencesBrandingForm = () => {
  const { organization, isOrganizationLoading } = usePreferencesBrandingBoot();

  // Данные организации нужны для initial values — ждём загрузку.
  if (isOrganizationLoading) {
    return <Skeleton className="h-48 w-full max-w-2xl" />;
  }
  return <BrandingFormInner organization={organization} />;
};

function BrandingFormInner({
  organization,
}: {
  organization: { metadata?: Record<string, unknown> };
}) {
  // Легаси-хуки без типов — уточняем сигнатуры локально.
  const { mutateAsync: uploadAttachmentsMutate } = useUploadAttachments({});
  const uploadAttachments = uploadAttachmentsMutate as unknown as (
    fd: FormData,
  ) => Promise<{ key?: string }>;

  const { mutateAsync: updateOrganizationMutate } = useUpdateOrganization();
  const updateOrganization = updateOrganizationMutate as unknown as (
    values: Record<string, unknown>,
  ) => Promise<unknown>;

  const initialValues: BrandingFormValues = {
    ...defaultValues,
    ...transformToForm(
      transformToCamelCase(organization?.metadata),
      defaultValues,
    ),
  };

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: BrandingFormValues) => {
    const _values = { ...values };

    // Сначала выгружаем файл логотипа, если он выбран.
    if (values._logoFile) {
      const formData = new FormData();
      formData.append('file', values._logoFile);
      formData.append('internalKey', Date.now().toString());

      try {
        const uploaded = await uploadAttachments(formData);
        _values.logoKey = uploaded?.key ?? '';
      } catch {
        AppToaster.show({
          message: intl.get('preferences.branding.logo.upload_failed'),
          intent: Intent.DANGER,
        });
        return;
      }
    }
    // Приватные поля (_*) и локальный logoUri на сервер не отправляем.
    const payload = transfromToSnakeCase(
      omit(excludePrivateProps(_values), ['logoUri']),
    ) as Record<string, unknown>;

    try {
      await updateOrganization(payload);
      AppToaster.show({
        message: intl.get('preferences.branding.updated_successfully'),
        intent: Intent.SUCCESS,
      });
    } catch {
      // Ошибки полей возвращает бэкенд; глобальный тост не показываем (как в легаси).
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        <PreferencesBrandingFormContent />
        <div className="flex gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {intl.get('save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
