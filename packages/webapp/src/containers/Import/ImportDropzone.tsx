import { useRef, useState } from 'react';
import intl from 'react-intl-universal';
import { Field, type FieldProps } from 'formik';
import { Intent } from '@blueprintjs/core';
import { Upload, X } from 'lucide-react';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useAlertsManager } from './AlertsManager';

const ACCEPTED_EXTENSIONS = ['csv', 'xls', 'xlsx'];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface ImportDropzoneFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Дропзона файла импорта (по образцу Branding): рамка с пунктиром,
 * скрытый input и кнопка выбора. Проверяем расширение и размер на клиенте,
 * остальное валидирует сервер.
 */
function ImportDropzoneField({ value, onChange }: ImportDropzoneFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const applyFile = (file: File | null) => {
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        AppToaster.show({
          intent: Intent.DANGER,
          message: intl.get('import.upload.error.unsupported_extension'),
        });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        AppToaster.show({
          intent: Intent.DANGER,
          message: intl.get('import.dropzone.error.max_size'),
        });
        return;
      }
    }
    onChange(file);
    if (!file && inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) applyFile(file);
      }}
      className={cn(
        'flex flex-col items-center gap-3 rounded-default border border-dashed border-border bg-surface px-6 py-10 text-center',
        isDragOver && 'border-action bg-surface-elevated',
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
        <Upload className="h-6 w-6" aria-hidden />
      </span>

      {value ? (
        <div className="flex flex-col items-center gap-1">
          <div className="text-sm font-medium text-text-primary">
            {value.name}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger"
            onClick={() => applyFile(null)}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {intl.get('import.dropzone.remove_file')}
          </Button>
        </div>
      ) : (
        <div className="text-sm font-medium text-text-primary">
          {intl.get('import.dropzone.title')}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
      >
        {value
          ? intl.get('import.dropzone.replace_file')
          : intl.get('upload_file')}
      </Button>
    </div>
  );
}

/** Поле файла в Formik-форме шага загрузки + подсказки о форматах. */
export function ImportDropzone() {
  const { hideAlerts } = useAlertsManager();

  return (
    <div className="flex flex-col">
      <Field id="file" name="file">
        {({ field, form }: FieldProps) => (
          <ImportDropzoneField
            value={(field.value as File | null) ?? null}
            onChange={(file) => {
              hideAlerts();
              form.setFieldValue('file', file);
            }}
          />
        )}
      </Field>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span>{intl.get('import.dropzone.supported_formats')}</span>
        <span>{intl.get('import.dropzone.maximum_size')}</span>
      </div>
    </div>
  );
}
