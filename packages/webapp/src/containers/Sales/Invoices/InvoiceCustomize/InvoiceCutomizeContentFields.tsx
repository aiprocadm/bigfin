import intl from 'react-intl-universal';
import { Stack } from '@/components';
import { Classes } from '@blueprintjs/core';
import { getFieldsGroups } from './constants';
import {
  ElementCustomizeFieldsGroup,
  ElementCustomizeContentItemFieldGroup,
} from '@/containers/ElementCustomize/ElementCustomizeFieldsGroup';

export function InvoiceCustomizeContentFields() {
  return (
    <Stack
      spacing={10}
      style={{ padding: 20, paddingBottom: 40, flex: '1 1 auto' }}
    >
      <Stack spacing={10}>
        <h3 style={{ fontWeight: 600 }}>{intl.get('customize.invoice.title')}</h3>
        <p className={Classes.TEXT_MUTED}>{intl.get('customize.invoice.description')}</p>
      </Stack>

      <Stack>
        {getFieldsGroups().map((group) => (
          <ElementCustomizeFieldsGroup label={group.label}>
            {group.fields.map((item, index) => (
              <ElementCustomizeContentItemFieldGroup
                key={index}
                switchProps={{
                  name: item.enableKey,
                  label: item.label,
                }}
                inputGroupProps={{
                  name: item.labelKey,
                }}
              />
            ))}
          </ElementCustomizeFieldsGroup>
        ))}
      </Stack>
    </Stack>
  );
}
