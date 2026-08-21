// @ts-nocheck
import intl from 'react-intl-universal';
import * as Yup from 'yup';
import { useState } from 'react';
import {
  ElementCustomize,
  ElementCustomizeProps,
} from '../ElementCustomize/ElementCustomize';
import {
  transformToEditRequest,
  transformToNewRequest,
  useBrandingState,
  useBrandingTemplateFormInitialValues,
} from './_utils';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';
import {
  useCreatePdfTemplate,
  useEditPdfTemplate,
} from '@/hooks/query/pdf-templates';
import { FormikHelpers } from 'formik';
import { BrandingTemplateValues, BrandingState } from './types';
import { useUploadAttachments } from '@/hooks/query/attachments';
import { excludePrivateProps } from '@/utils';

interface BrandingTemplateFormProps<
  T extends BrandingTemplateValues,
  Y extends BrandingState
> extends ElementCustomizeProps<T, Y> {
  resource: string;
  templateId?: number;
  onSuccess?: () => void;
  onError?: () => void;

  /* The default values hold the initial values of the form and the values being sent to the server. */
  defaultValues?: T;
}

export function BrandingTemplateForm<
  T extends BrandingTemplateValues,
  Y extends BrandingState,
>({
  templateId,
  onSuccess,
  onError,
  defaultValues,
  resource,
  ...props
}: BrandingTemplateFormProps<T, Y>) {
  // Create/edit pdf template mutators.
  const { mutateAsync: createPdfTemplate } = useCreatePdfTemplate();
  const { mutateAsync: editPdfTemplate } = useEditPdfTemplate();

  const initialValues = useBrandingTemplateFormInitialValues<T>(defaultValues);
  const [, setIsLoading] = useState<boolean>(false);

  // Uploads the attachments.
  const { mutateAsync: uploadAttachments } = useUploadAttachments({
    onSuccess: () => {
      setIsLoading(true);
    },
  });
  // Handles the form submitting.
  //  - Uploads the company logos.
  //  - Push the updated data.
  const handleFormSubmit = async (
    values: T,
    { setSubmitting, setFieldValue }: FormikHelpers<T>,
  ) => {
    const _values = { ...values };

    // Handle create/edit request success.
    const handleSuccess = (message: string) => {
      AppToaster.show({ intent: Intent.SUCCESS, message });
      setSubmitting(false);
      onSuccess && onSuccess();
    };
    // Handle create/edit request error.
    const handleError = (message: string) => {
      AppToaster.show({ intent: Intent.DANGER, message });
      setSubmitting(false);
      onError && onError();
    };
    // Start upload the company logo file if it is presented.
    if (values._companyLogoFile) {
      setIsLoading(true);
      const formData = new FormData();
      const key = Date.now().toString();

      formData.append('file', values._companyLogoFile);
      formData.append('internalKey', key);

      try {
        const uploadedAttachmentRes = await uploadAttachments(formData);
        setIsLoading(false);

        // Adds the attachment key to the values after finishing upload.
        _values['companyLogoKey'] = uploadedAttachmentRes?.key;
      } catch {
        handleError(intl.get('branding.templates.error.upload_logo'));
        setIsLoading(false);
        return;
      }
    }
    // Exclude all the private props that starts with _.
    const excludedPrivateValues = excludePrivateProps(_values);

    // Transform the the form values to request based on the mode (new or edit mode).
    const reqValues = templateId
      ? transformToEditRequest(excludedPrivateValues, initialValues)
      : transformToNewRequest(excludedPrivateValues, initialValues, resource);

    // Template id is presented means edit mode.
    if (templateId) {
      setSubmitting(true);

      try {
        await editPdfTemplate({ templateId, values: reqValues });
        handleSuccess(intl.get('branding.templates.updated'));
      } catch {
        handleError(intl.get('branding.templates.error.update'));
      }
    } else {
      setSubmitting(true);

      try {
        await createPdfTemplate(reqValues);
        handleSuccess(intl.get('branding.templates.created'));
      } catch {
        handleError(intl.get('branding.templates.error.create'));
      }
    }
  };

  return (
    <ElementCustomize<T, Y>
      initialValues={initialValues}
      validationSchema={getValidationSchema()}
      onSubmit={handleFormSubmit}
      {...props}
    />
  );
}

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
export const getValidationSchema = () =>
  Yup.object().shape({
    templateName: Yup.string().required(
      intl.get('branding.templates.validation.name_required'),
    ),
  });
