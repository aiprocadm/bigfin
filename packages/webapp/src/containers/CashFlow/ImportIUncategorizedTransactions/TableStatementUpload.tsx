// @ts-nocheck
// © 2026 Bigfin
import React, { useRef, useState } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import {
  useImportTableStatement,
  usePreviewTableStatement,
} from '@/hooks/query/bank-statement-import';

/**
 * ⑨a Загрузка выписки таблицей (CSV/Excel): сначала проверка — что
 * распозналось, потом импорт. Колонки определяются автоматически.
 */
export function TableStatementUpload({ accountId, onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const { mutateAsync: previewTable, isLoading: isChecking } =
    usePreviewTableStatement();
  const { mutateAsync: importTable, isLoading: isImporting } =
    useImportTableStatement();

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    setFile(picked ?? null);
    setPreview(null);
    if (!picked) return;

    previewTable({ accountId, file: picked })
      .then(setPreview)
      .catch(() => {
        AppToaster.show({
          message: intl.get('bank_import.table.columns_error'),
          intent: Intent.DANGER,
        });
        setFile(null);
      })
      .finally(() => {
        if (inputRef.current) inputRef.current.value = '';
      });
  };

  const handleImport = () => {
    if (!file) return;

    importTable({ accountId, file })
      .then((data) => {
        const hasSkipped = (data.skipped ?? 0) > 0;
        const nothingImported = (data.imported ?? 0) === 0 && hasSkipped;
        AppToaster.show({
          message: hasSkipped
            ? intl.get('bank_import.result_detail', {
                imported: data.imported,
                skipped: data.skipped,
                duplicates: data.duplicates ?? 0,
                noDirection: data.noDirection ?? 0,
                unparsed: data.unparsed ?? 0,
              })
            : intl.get('bank_import.result_ok', { imported: data.imported }),
          intent: nothingImported ? Intent.WARNING : Intent.SUCCESS,
        });
        onImported();
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('bank_import.parse_error'),
          intent: Intent.DANGER,
        });
      });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        className="bp4-button"
        disabled={isChecking || isImporting}
        onClick={() => inputRef.current?.click()}
      >
        {intl.get('bank_import.table.upload')}
      </button>

      {preview && (
        <div style={{ marginTop: 12, maxWidth: 640 }}>
          <p>
            {intl.get('bank_import.table.preview_summary', {
              total: preview.total,
              toImport: preview.toImport,
              duplicates: preview.duplicates,
            })}
          </p>
          {preview.unparsed > 0 && (
            <p className="bp4-text-muted">
              {intl.get('bank_import.table.unparsed', {
                count: preview.unparsed,
              })}
            </p>
          )}
          {preview.warnings.includes('amountSignAssumed') && (
            <p className="bp4-text-muted">
              {intl.get('bank_import.table.sign_assumed')}
            </p>
          )}
          <p className="bp4-text-muted">
            {intl.get('bank_import.table.columns', {
              columns: Object.values(preview.columns).filter(Boolean).join(', '),
            })}
          </p>

          <div className="overflow-x-auto">
            <table className="bp4-html-table bp4-html-table-condensed">
              <thead>
                <tr>
                  <th>{intl.get('bank_import.table.col_date')}</th>
                  <th>{intl.get('bank_import.table.col_amount')}</th>
                  <th>{intl.get('bank_import.table.col_description')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    <td>{row.date}</td>
                    <td>{row.amount}</td>
                    <td>{row.payee || row.description || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="bp4-button bp4-intent-primary"
            style={{ marginTop: 8 }}
            disabled={isImporting || preview.toImport === 0}
            onClick={handleImport}
          >
            {intl.get('bank_import.table.import')}
          </button>
        </div>
      )}
    </div>
  );
}
