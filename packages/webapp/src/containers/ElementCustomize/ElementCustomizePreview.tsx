// @ts-nocheck
import * as R from 'ramda';
import intl from 'react-intl-universal';
import { Stack } from '@/components';
import { ElementCustomizeHeader } from './ElementCustomizeHeader';
import { ElementCustomizePreviewContent } from './ElementCustomizePreviewContent';
import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';

function ElementCustomizePreviewRoot({ closeDrawer }) {
  const { name } = useDrawerContext();

  const handleCloseBtnClick = () => {
    closeDrawer(name);
  };
  return (
    <Stack
      spacing={0}
      style={{
        borderLeft: '1px solid var(--color-element-customize-divider)',
        height: '100vh',
        flex: '1 1',
      }}
    >
      <ElementCustomizeHeader
        label={intl.get('preview')}
        closeButton
        onClose={handleCloseBtnClick}
      />
      <ElementCustomizePreviewContent />
    </Stack>
  );
}

export const ElementCustomizePreview = R.compose(withDrawerActions)(
  ElementCustomizePreviewRoot,
);
