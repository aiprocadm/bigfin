import { useEffect } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { useMutation } from 'react-query';
import { Download, Lock } from 'lucide-react';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { downloadFile } from '@/hooks/useDownloadFile';
import { useCanExport } from '@/hooks/utils/useAbilityContext';
import useApiRequest from '@/hooks/useRequest';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { showApiError } from '@/utils/showApiError';
import { compose } from '@/utils';

interface ExportDataPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

/**
 * «Выгрузить всё» (С3 карты v14): владение данными — вся организация одной
 * xlsx-книгой, лист на каждый список.
 */
function ExportDataPage({ changePreferencesPageTitle }: ExportDataPageProps) {
  const apiRequest: any = useApiRequest();
  const canExport = useCanExport();

  useEffect(() => {
    changePreferencesPageTitle(intl.get('export_data.title'));
  }, [changePreferencesPageTitle]);

  const { mutate: exportAll, isLoading } = useMutation<any, any, void>(
    (): Promise<any> => apiRequest.get('/export/all', { responseType: 'blob' }),
    {
      onSuccess: (res: any) => {
        downloadFile(res.data, 'bigfin-export.xlsx');
        AppToaster.show({
          message: intl.get('export_data.done'),
          intent: Intent.SUCCESS,
        });
      },
      onError: (error) => showApiError(error),
    },
  );

  // Полная выгрузка — книга Excel, а таблицу сервер без права «Выгрузка
  // данных» не отдаёт: ответ 403 открыл бы общий экран «нет доступа»
  // (FT-082 ТЗ-3). Поэтому кнопки нет — вместо неё объяснение, у кого
  // просить право. Проверка — после всех хуков.
  if (!canExport) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden />}
          title={intl.get('export_right.no_access.title')}
          description={intl.get('export_right.no_access.description')}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            {intl.get('export_data.description')}
          </p>
          <div>
            <Button onClick={() => exportAll()} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('export_data.button')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default compose(withDashboardActions)(ExportDataPage);
