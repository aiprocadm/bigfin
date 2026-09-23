import { useRef } from 'react';
import intl from 'react-intl-universal';
import classNames from 'classnames';
import {
  Classes,
  Intent,
  Menu,
  MenuItem,
  ProgressBar,
  Text,
} from '@blueprintjs/core';

import { AppToaster, If, Stack } from '@/components';
import { usePurchaseByItemsContext } from './PurchasesByItemsProvider';
import FinancialLoadingBar from '../FinancialLoadingBar';
import {
  usePurchasesByItemsCsvExport,
  usePurchasesByItemsXlsxExport,
} from '@/hooks/query';
import { useCanExport } from '@/hooks/utils/useAbilityContext';

/**
 * Purchases by items progress loading bar.
 */
export function PurchasesByItemsLoadingBar() {
  const { isFetching } = usePurchaseByItemsContext();

  return (
    <If condition={isFetching}>
      <FinancialLoadingBar />
    </If>
  );
}

/**
 * Retrieves the purchases by items export menu.
 * @returns {JSX.Element}
 */
export const PurchasesByItemsExportMenu = () => {
  const canExport = useCanExport();
  // Ключ уведомления: до первого показа его нет.
  const toastKey = useRef<string | null>(null);
  const commonToastConfig = { isCloseButtonShown: true, timeout: 2000 };
  const { httpQuery } = usePurchaseByItemsContext();

  const openProgressToast = (amount: number) => {
    return (
      <Stack spacing={8}>
        <Text>{intl.get('report_exported_successfully')}</Text>
        <ProgressBar
          className={classNames('toast-progress', {
            [Classes.PROGRESS_NO_STRIPES]: amount >= 100,
          })}
          intent={amount < 100 ? Intent.PRIMARY : Intent.SUCCESS}
          value={amount / 100}
        />
      </Stack>
    );
  };
  // Export the report to xlsx.
  const { mutateAsync: xlsxExport } = usePurchasesByItemsXlsxExport(httpQuery, {
    onDownloadProgress: (xlsxExportProgress: number) => {
      if (!toastKey.current) {
        toastKey.current = AppToaster.show({
          message: openProgressToast(xlsxExportProgress),
          ...commonToastConfig,
        });
      } else {
        AppToaster.show(
          {
            message: openProgressToast(xlsxExportProgress),
            ...commonToastConfig,
          },
          toastKey.current,
        );
      }
    },
  });
  // Export the report to csv.
  const { mutateAsync: csvExport } = usePurchasesByItemsCsvExport(httpQuery, {
    onDownloadProgress: (xlsxExportProgress: number) => {
      if (!toastKey.current) {
        toastKey.current = AppToaster.show({
          message: openProgressToast(xlsxExportProgress),
          ...commonToastConfig,
        });
      } else {
        AppToaster.show(
          {
            message: openProgressToast(xlsxExportProgress),
            ...commonToastConfig,
          },
          toastKey.current,
        );
      }
    },
  });
  // Handle csv export button click.
  const handleCsvExportBtnClick = () => {
    csvExport();
  };
  // Handle xlsx export button click.
  const handleXlsxExportBtnClick = () => {
    xlsxExport();
  };

  // Без права «Выгрузка данных» сервер ответит 403 (FT-082 ТЗ-3) —
  // пунктов XLSX/CSV не показываем. Проверка — после всех хуков.
  if (!canExport) {
    return null;
  }

  return (
    <Menu>
      <MenuItem
        text={'XLSX (Microsoft Excel)'}
        onClick={handleXlsxExportBtnClick}
      />
      <MenuItem text={'CSV'} onClick={handleCsvExportBtnClick} />
    </Menu>
  );
};
