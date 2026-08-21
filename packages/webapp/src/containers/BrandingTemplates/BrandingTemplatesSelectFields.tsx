import intl from 'react-intl-universal';
import { Button, ButtonProps } from '@blueprintjs/core';
import styled from 'styled-components';
import { FFormGroup, Icon } from '@/components';

export const BrandingThemeFormGroup = styled(FFormGroup)`
  margin-bottom: 0;

  .bp4-label {
    color: #7a8492;
  }

  &.bp4-inline label.bp4-label {
    margin-right: 0;
  }
`;

export const BrandingThemeSelectButton = (props: ButtonProps) => {
  return (
    <Button
      text={props?.text || intl.get('branding.templates.brand_theme')}
      rightIcon={<Icon icon="arrow-drop-up-16" iconSize={20} />}
      minimal
      {...props}
    />
  );
};

export const convertBrandingTemplatesToOptions = (
  brandingTemplates: Array<any>,
) => {
  // Пока шаблоны не загрузились (или запрос упал), здесь был undefined —
  // и FSelect падал на items.find, роняя всю форму белым экраном.
  return (
    brandingTemplates?.map((template) => ({
      text: template.template_name,
      value: template.id,
    })) ?? []
  );
};
