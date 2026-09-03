import { transformToForm } from '@/utils';

const attachmentReqSchema = {
  key: '',
  size: '',
  origin_name: '',
  mime_type: '',
};

export const transformAttachmentsToForm = (values: any) => {
  return values.attachments?.map((attachment: any) =>
    transformToForm(attachment, attachmentReqSchema),
  );
};

export const transformAttachmentsToRequest = (values: any) => {
  return values.attachments?.map((attachment: any) => ({ key: attachment.key }));
};
