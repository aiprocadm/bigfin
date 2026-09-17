import React, { useRef } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { DashboardInsider, AppToaster } from '@/components';
import { ImportView } from '@/containers/Import/ImportView';
import { useHistory, useParams } from 'react-router-dom';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import { useImport1CStatement } from '@/hooks/query/bank-statement-import';
import { TableStatementUpload } from './TableStatementUpload';

export default function ImportUncategorizedTransactions() {
  const history = useHistory();
  const params = useParams<{ id?: string }>();
  const { featureCan } = useFeatureCan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bankImportEnabled = featureCan(Features.BankStatementImport);

  const { mutateAsync: import1C, isLoading: isImporting } =
    useImport1CStatement();

  const handleImportSuccess = () => {
    history.push(
      `/cashflow-accounts/${params.id}/transactions?filter=uncategorized`,
    );
  };
  const handleCnacelBtnClick = () => {
    history.push(
      `/cashflow-accounts/${params.id}/transactions?filter=uncategorized`,
    );
  };

  const handle1CFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    import1C({ accountId: params.id ?? '', file })
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
          // Ничего не загрузилось, но записи были — это не «успех», а предупреждение.
          intent: nothingImported ? Intent.WARNING : Intent.SUCCESS,
        });
        handleImportSuccess();
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('bank_import.parse_error'),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        // Reset file input so the same file can be re-selected if needed.
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      });
  };

  return (
    <DashboardInsider name={'import-uncategorized-bank-transactions'}>
      {bankImportEnabled && (
        <div style={{ padding: '16px 24px 0' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            onChange={handle1CFileChange}
          />
          <button
            className="bp4-button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            {intl.get('bank_import.upload_1c')}
          </button>

          <TableStatementUpload
            accountId={params.id}
            onImported={handleImportSuccess}
          />
        </div>
      )}
      <ImportView
        resource={'uncategorized_bank_transaction'}
        params={{ accountId: params.id }}
        onImportSuccess={handleImportSuccess}
        onCancelClick={handleCnacelBtnClick}
        sampleFileName={'sample_bank_transactions'}
      />
    </DashboardInsider>
  );
}
