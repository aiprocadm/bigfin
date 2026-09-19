import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { ChevronDown, Download } from 'lucide-react';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSampleSheetImport } from '@/hooks/query/import';
import { useImportFileContext } from './ImportFileProvider';

type SampleFormat = 'csv' | 'xlsx';

/** Карточка со скачиванием файла-образца (CSV/XLSX). */
export function ImportSampleDownload() {
  const { resource, sampleFileName, exampleTitle, exampleDescription } =
    useImportFileContext();
  const { mutateAsync: downloadSample } = useSampleSheetImport();

  // Скачивание образца в выбранном формате.
  const handleDownloadBtnClick = (format: SampleFormat) => () => {
    downloadSample({
      filename: sampleFileName || `sample-${resource}`,
      resource,
      format,
    })
      .then(() => {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: intl.get('import.sample.download_success'),
        });
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-default border border-border bg-surface p-5">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-text-primary">
          {exampleTitle}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {exampleDescription}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary">
            <Download className="h-4 w-4" aria-hidden />
            {intl.get('import.sample.download_file')}
            <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        {/* Контент в портале вне .bigfin-ui — класс нужен для шрифта/сброса. */}
        <DropdownMenuContent align="end" className="bigfin-ui">
          <DropdownMenuItem onClick={handleDownloadBtnClick('csv')}>
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadBtnClick('xlsx')}>
            XLSX
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
