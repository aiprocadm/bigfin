import React from 'react';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { FFormGroup, FEditableText, FormattedMessage as T } from '@/components';
import { IntercompanyFieldLegacy } from '@/components/legal-entities/IntercompanyField';

export function MakeJournalFormFooterLeft() {
  return (
    <React.Fragment>
      {/* --------- Description --------- */}
      <DescriptionFormGroup
        label={<T id={'description'} />}
        name={'description'}
      >
        <FEditableText
          name={'description'}
          placeholder={intl.get('make_jorunal.decscrption.placeholder')}
          multiline
          fastField
        />
      </DescriptionFormGroup>

      {/* Внутригрупповая операция (остаток К2 ТЗ). Поля нет вовсе,
          пока юрлицо одно: внутригрупповых операций не бывает. */}
      <IntercompanyFieldLegacy name={'is_intercompany'} />
    </React.Fragment>
  );
}

const DescriptionFormGroup = styled(FFormGroup)`
  &.bp4-form-group {
    .bp4-label {
      font-size: 12px;
      margin-bottom: 12px;
    }
    .bp4-form-content {
      margin-left: 10px;
    }
  }
`;
