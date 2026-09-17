import { compose } from '@/utils';
import * as R from 'ramda';
import { DataTable, TableSkeletonRows } from '@/components';
import { useBrandingTemplatesBoot } from './BrandingTemplatesBoot';
import { ActionsMenu } from './_components';
import { DRAWERS } from '@/constants/drawers';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '@/containers/Drawer/withDrawerActions';
import { getCustomizeDrawerNameFromResource } from './_utils';
import { useBrandingTemplatesColumns } from './_hooks';
import styles from './BrandTemplates.module.scss';

// Обёртки подставляют `openAlert` и `openDrawer`; раньше объявление было
// пустым, и оба «не существовали» для проверки типов (Д11 карты v88).
type BrandingTemplatesTableProps = WithAlertActionsProps &
  WithDrawerActionsProps;

function BrandingTemplateTableRoot({
  openAlert,
  openDrawer,
}: BrandingTemplatesTableProps) {
  // Table columns.
  const columns = useBrandingTemplatesColumns();
  const { isPdfTemplatesLoading, pdfTemplates } = useBrandingTemplatesBoot();

  const handleEditTemplate = (template: any) => {
    openDrawer(DRAWERS.INVOICE_CUSTOMIZE, {
      templateId: template.id,
      resource: template.resource,
    });
  };

  const handleDeleteTemplate = (template: any) => {
    openAlert('branding-template-delete', { templateId: template.id });
  };

  const handleCellClick = (cell: any, event: any) => {
    const templateId = cell.row.original.id;
    const resource = cell.row.original.resource;

    // Retrieves the customize drawer name from the given resource name.
    const drawerName = getCustomizeDrawerNameFromResource(resource);

    openDrawer(drawerName, { templateId, resource });
  };

  // Handle mark as default button click.
  const handleMarkDefaultTemplate = (template: any) => {
    openAlert('branding-template-mark-default', { templateId: template.id });
  };

  return (
    <DataTable
      columns={columns}
      data={pdfTemplates || []}
      loading={isPdfTemplatesLoading}
      progressBarLoading={isPdfTemplatesLoading}
      TableLoadingRenderer={TableSkeletonRows}
      ContextMenu={ActionsMenu}
      noInitialFetch={true}
      payload={{
        onDeleteTemplate: handleDeleteTemplate,
        onEditTemplate: handleEditTemplate,
        onMarkDefaultTemplate: handleMarkDefaultTemplate,
      }}
      rowContextMenu={ActionsMenu}
      onCellClick={handleCellClick}
      className={styles.table}
    />
  );
}

// Сборка своя, а не `R.compose`: у ramda объявление не умеет вычесть свойства,
// которые подставляет надстройка, — получается «ничего» (`never`), и место
// вызова не может передать ни одного свойства (Д22 карты v82).
export const BrandingTemplatesTable = compose(
  withAlertActions,
  withDrawerActions,
)(BrandingTemplateTableRoot);
