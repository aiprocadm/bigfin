// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Button } from '@/components/ui/button';
import {
  OnecImportReport,
  OnecPreviewReport,
  useOnecImport,
  useOnecImportPreview,
} from '@/hooks/query/onecImport';

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

/**
 * ⑩ Импорт справочников из 1С (CommerceML): выбор файла → предпросмотр →
 * импорт. За флагом `onec_import`.
 */
export default function OnecImportPage() {
  const { featureCan } = useFeatureCan();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<OnecPreviewReport | null>(null);
  const [result, setResult] = React.useState<OnecImportReport | null>(null);

  const previewMutation = useOnecImportPreview();
  const importMutation = useOnecImport();

  if (!featureCan('onec_import')) return null;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    if (!file) return;
    try {
      setPreview(unwrap(await previewMutation.mutateAsync(file)));
      setResult(null);
    } catch {
      toast.error(intl.get('onec_import.error.parse'));
    }
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      const report = unwrap(await importMutation.mutateAsync(file));
      setResult(report);
      toast.success(
        intl.get('onec_import.done', {
          created: report.items.created + report.contacts.created,
          updated: report.items.updated + report.contacts.updated,
        }),
      );
    } catch {
      toast.error(intl.get('onec_import.error.import'));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {intl.get('onec_import.page.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('onec_import.page.subtitle')}
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-3 rounded-md border p-4">
        <label className="text-sm">{intl.get('onec_import.file')}</label>
        <input
          type="file"
          accept=".xml"
          onChange={pickFile}
          className="text-sm"
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={!file || previewMutation.isLoading}
          >
            {intl.get('onec_import.action.preview')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !preview || importMutation.isLoading}
          >
            {intl.get('onec_import.action.import')}
          </Button>
        </div>
      </div>

      {preview && (
        <div className="flex max-w-xl flex-col gap-2 rounded-md border p-4">
          <h2 className="font-medium">
            {intl.get('onec_import.preview.title')}
          </h2>
          <p className="text-sm">
            {intl.get('onec_import.preview.items', {
              create: preview.items.toCreate,
              update: preview.items.toUpdate,
            })}
          </p>
          <p className="text-sm">
            {intl.get('onec_import.preview.contacts', {
              create: preview.contacts.toCreate,
              update: preview.contacts.toUpdate,
            })}
          </p>
        </div>
      )}

      {result && (
        <div className="flex max-w-xl flex-col gap-2 rounded-md border p-4">
          <h2 className="font-medium">
            {intl.get('onec_import.result.title')}
          </h2>
          <p className="text-sm">
            {intl.get('onec_import.result.items', {
              created: result.items.created,
              updated: result.items.updated,
            })}
          </p>
          <p className="text-sm">
            {intl.get('onec_import.result.contacts', {
              created: result.contacts.created,
              updated: result.contacts.updated,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
