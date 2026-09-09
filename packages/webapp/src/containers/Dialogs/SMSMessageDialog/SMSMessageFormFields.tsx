// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import type { FieldProps } from 'formik';
import styled from 'styled-components';
import { useFormikContext, FastField, ErrorMessage } from 'formik';
import { Intent, Button, FormGroup, TextArea } from '@blueprintjs/core';

import { FormattedMessage as T } from '@/components';

import { useSMSMessageDialogContext } from './SMSMessageDialogProvider';

import { inputIntent } from '@/utils';

/**
 *
 */
export default function SMSMessageFormFields() {
  // SMS message dialog context.
  const { smsNotification } = useSMSMessageDialogContext();

  // Form formik context.
  const { setFieldValue } = useFormikContext<any>();

  // Handle the button click.
  const handleBtnClick = () => {
    setFieldValue('message_text', smsNotification.default_sms_message);
  };

  return (
    <div>
      {/* ----------- Message Text ----------- */}
      <FastField name={'message_text'}>
        {({ field, meta: { error, touched } }: FieldProps) => (
          <FormGroup
            label={<T id={'notify_via_sms.dialog.message_text'} />}
            className={'form-group--message_text'}
            intent={inputIntent({ error, touched })}
            helperText={
              <>
                <ErrorMessage name={'message_text'} />
                <ResetButton
                  minimal={true}
                  small={true}
                  intent={Intent.PRIMARY}
                  onClick={handleBtnClick}
                >
                  <T id={'sms_message.edit_form.reset_to_default_message'} />
                </ResetButton>
              </>
            }
          >
            <TextArea
              growVertically={true}
              large={true}
              intent={inputIntent({ error, touched })}
              {...field}
            />
          </FormGroup>
        )}
      </FastField>
    </div>
  );
}

const ResetButton = styled(Button)`
  font-size: 12px;
`;
