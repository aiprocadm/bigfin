import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  CheckCircle2,
  FilePlus2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Features } from '@/constants';
import {
  AbilitySubject,
  SaleEstimateAction,
  SaleInvoiceAction,
} from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { useFeatureCan } from '@/hooks/state';
import { compose } from '@/utils';

import type { EstimateDetail } from './types';

interface EstimateDetailHeaderV2Props {
  estimate: EstimateDetail;
  estimateId: number;
}

// Легаси-HOC'и без типов не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  openDrawer: (name: string, payload?: Record<string, unknown>) => void;
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

// useFeatureCan — легаси-хук без типов, кастуем результат локально.
type UseFeatureCanResult = { featureCan: (feature: string) => boolean };

type EstimateBadgeVariant = 'success' | 'destructive' | 'default' | 'outline';

/**
 * Статус сметы → i18n-ключ и вариант Badge (паритет с легаси Choose/Tag):
 * одобрена/отклонена/истекла/отправлена/черновик. Жёлтый (default) —
 * редкий предупреждающий сигнал «истекла», по стандарту простоты.
 */
export function getEstimateStatus(estimate: EstimateDetail): {
  labelKey: string;
  variant: EstimateBadgeVariant;
} {
  if (estimate.is_approved) return { labelKey: 'approved', variant: 'success' };
  if (estimate.is_rejected) {
    return { labelKey: 'rejected', variant: 'destructive' };
  }
  if (estimate.is_expired) {
    return { labelKey: 'estimate.status.expired', variant: 'default' };
  }
  if (estimate.is_delivered) {
    return { labelKey: 'delivered', variant: 'success' };
  }
  return { labelKey: 'draft', variant: 'outline' };
}

/**
 * Шапка деталей сметы: номер + статус-пилюля + «Редактировать» + меню «⋯»
 * со всеми действиями легаси actions-bar (преобразовать в счёт, отправка,
 * печать, SMS, одобрение/отклонение, удаление).
 */
function EstimateDetailHeaderV2Root({
  estimate,
  estimateId,
  openAlert,
  openDialog,
  openDrawer,
  closeDrawer,
}: EstimateDetailHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();
  const { featureCan } = useFeatureCan() as UseFeatureCanResult;

  const status = getEstimateStatus(estimate);

  // Переход на страницу + закрытие drawer'а (как в легаси actions-bar).
  const handleEditEstimate = () => {
    history.push(`/estimates/${estimateId}/edit`);
    closeDrawer(DRAWERS.ESTIMATE_DETAILS);
  };
  const handleConvertEstimate = () => {
    history.push(`/invoices/new?from_estimate_id=${estimateId}`, {
      action: estimateId,
    });
    closeDrawer(DRAWERS.ESTIMATE_DETAILS);
  };

  const handleMailEstimate = () => {
    openDrawer(DRAWERS.ESTIMATE_SEND_MAIL, { estimateId });
  };
  const handlePrintEstimate = () => {
    openDialog('estimate-pdf-preview', { estimateId });
  };
  const handleNotifyViaSMS = () => {
    openDialog('notify-estimate-via-sms', { estimateId });
  };
  const handleApproveEstimate = () => {
    openAlert('estimate-Approve', { estimateId });
  };
  const handleRejectEstimate = () => {
    openAlert('estimate-reject', { estimateId });
  };
  const handleDeleteEstimate = () => {
    openAlert('estimate-delete', { estimateId });
  };

  // Условия видимости «одобрить/отклонить» — как в легаси more-menu:
  // отправленная смета может сменить решение или получить его впервые.
  const isDelivered = Boolean(estimate.is_delivered);
  const showApprove =
    isDelivered && (estimate.is_rejected || !estimate.is_approved);
  const showReject =
    isDelivered && (estimate.is_approved || !estimate.is_rejected);

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('estimate.drawer.title', {
            number: estimate.estimate_number,
          })}
        </DrawerTitle>

        <Badge variant={status.variant}>{intl.get(status.labelKey)}</Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={SaleEstimateAction.Edit} a={AbilitySubject.Estimate}>
            <Button variant="secondary" size="sm" onClick={handleEditEstimate}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_estimate')}
            </Button>
          </Can>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-8 sm:w-8"
                aria-label={intl.get('more_actions')}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {!estimate.is_converted_to_invoice ? (
                <Can I={SaleInvoiceAction.Create} a={AbilitySubject.Invoice}>
                  <DropdownMenuItem onClick={handleConvertEstimate}>
                    <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
                    {intl.get('convert_to_invoice')}
                  </DropdownMenuItem>
                </Can>
              ) : null}

              <Can I={SaleEstimateAction.View} a={AbilitySubject.Estimate}>
                <DropdownMenuItem onClick={handleMailEstimate}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('send_mail')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintEstimate}>
                  <Printer className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('print')}
                </DropdownMenuItem>
              </Can>

              <Can I={SaleEstimateAction.NotifyBySms} a={AbilitySubject.Estimate}>
                <DropdownMenuItem onClick={handleNotifyViaSMS}>
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('notify_via_sms.dialog.notify_via_sms')}
                </DropdownMenuItem>
              </Can>

              {showApprove || showReject ? (
                <Can I={SaleEstimateAction.Edit} a={AbilitySubject.Estimate}>
                  <DropdownMenuSeparator />
                  {showApprove ? (
                    <DropdownMenuItem onClick={handleApproveEstimate}>
                      <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                      {intl.get('mark_as_approved')}
                    </DropdownMenuItem>
                  ) : null}
                  {showReject ? (
                    <DropdownMenuItem onClick={handleRejectEstimate}>
                      <XCircle className="mr-2 h-4 w-4" aria-hidden />
                      {intl.get('mark_as_rejected')}
                    </DropdownMenuItem>
                  ) : null}
                </Can>
              ) : null}

              <Can I={SaleEstimateAction.Delete} a={AbilitySubject.Estimate}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteEstimate}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {featureCan(Features.Branches) && estimate.branch?.name ? (
        <p className="text-sm text-text-secondary">
          {intl.get('estimate.drawer.subtitle', {
            value: estimate.branch.name,
          })}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const EstimateDetailHeaderV2 = compose(
  withDrawerActions,
  withDialogActions,
  withAlertActions,
)(EstimateDetailHeaderV2Root) as ComponentType<EstimateDetailHeaderV2Props>;
