import clsx from 'classnames';
import intl from 'react-intl-universal';
import { Classes, Tag } from '@blueprintjs/core';
import { Group } from '@/components';

export const useBrandingTemplatesColumns = () => {
  return [
    {
      Header: intl.get('branding.templates.col.template_name'),
      accessor: (row: any) => (
        <Group spacing={10}>
          {row.template_name} {row.default && (
            <Tag round>{intl.get('branding_templates.label.default')}</Tag>
          )}
        </Group>
      ),
      width: 65,
      clickable: true,
    },
    {
      Header: intl.get('branding.templates.col.created_at'),
      accessor: 'created_at_formatted',
      width: 35,
      className: clsx(Classes.TEXT_MUTED),
      clickable: true,
    },
  ];
};
