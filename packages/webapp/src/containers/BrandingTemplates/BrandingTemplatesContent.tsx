import { compose } from '@/utils';
import intl from 'react-intl-universal';
import { Button, Classes, Intent } from '@blueprintjs/core';
import { BrandingTemplatesBoot } from './BrandingTemplatesBoot';
import { Box, Card, DrawerHeaderContent, Group } from '@/components';
import { DRAWERS } from '@/constants/drawers';
import { BrandingTemplatesTable } from './BrandingTemplatesTable';
import { BrandingTemplateActionsBar } from './BrandingTemplatesActionsBar';
import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '@/containers/Drawer/withDrawerActions';

export default function BrandingTemplateContent() {
  return (
    <Box>
      <DrawerHeaderContent
        title={intl.get('branding_templates.title')}
      />
      <Box className={Classes.DRAWER_BODY}>
        <BrandingTemplatesBoot>
          <BrandingTemplateActionsBar />

          <Card style={{ padding: 0 }}>
            <BrandingTemplatesTable />
          </Card>
        </BrandingTemplatesBoot>
      </Box>
    </Box>
  );
}

// Сборка своя, а не `R.compose`: у ramda объявление не умеет вычесть свойства,
// которые подставляет надстройка, — получается «ничего» (`never`), и место
// вызова не может передать ни одного свойства. Порядок применения у обеих
// сборок одинаковый: `compose(f, g)(X)` — это `f(g(X))` (Д22 карты v82).
const BrandingTemplateHeader = compose(withDrawerActions)(
  ({ openDrawer }: WithDrawerActionsProps) => {
    const handleCreateBtnClick = () => {
      openDrawer(DRAWERS.INVOICE_CUSTOMIZE);
    };
    return (
      <Group>
        <Button intent={Intent.PRIMARY} onClick={handleCreateBtnClick}>
          {intl.get('branding.templates.create.invoice')}
        </Button>
      </Group>
    );
  },
);

BrandingTemplateHeader.displayName = 'BrandingTemplateHeader';
