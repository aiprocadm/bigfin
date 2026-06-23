// @ts-nocheck
import intl from 'react-intl-universal';
import { Button, Callout, Intent, Text } from '@blueprintjs/core';
import clsx from 'classnames';
import {
  ImportFilePreviewBootProvider,
  useImportFilePreviewBootContext,
} from './ImportFilePreviewBoot';
import { useImportFileContext } from './ImportFileProvider';
import { useImportFileProcess } from '@/hooks/query/import';
import { AppToaster, Box, Group, Stack } from '@/components';
import { CLASSES } from '@/constants';
import { ImportStepperStep } from './_types';
import { ImportFileContainer } from './ImportFileContainer';
import { SectionCard, Section } from '@/components/Section';
import styles from './ImportFilePreview.module.scss';

export function ImportFilePreview() {
  const { importId } = useImportFileContext();

  return (
    <ImportFilePreviewBootProvider importId={importId}>
      <ImportFilePreviewContent />
    </ImportFilePreviewBootProvider>
  );
}

function ImportFilePreviewContent() {
  const { importPreview } = useImportFilePreviewBootContext();

  return (
    <Box>
      <ImportFileContainer>
        <Stack spacing={20}>
          <Callout
            intent={
              importPreview.createdCount <= 0 ? Intent.DANGER : Intent.NONE
            }
          >
            {intl.get('import.preview.ready_summary', {
              created: importPreview.createdCount,
              total: importPreview.totalCount,
            })}
          </Callout>

          <ImportFilePreviewImported />
          <ImportFilePreviewSkipped />
          <ImportFilePreviewUnmapped />
        </Stack>
      </ImportFileContainer>
      <ImportFilePreviewFloatingActions />
    </Box>
  );
}

function ImportFilePreviewImported() {
  const { importPreview } = useImportFilePreviewBootContext();

  return (
    <Section
      collapseProps={{ defaultIsOpen: false }}
      defaultIsOpen={true}
      title={intl.get('import.preview.ready_title', {
        count: importPreview.createdCount,
      })}
    >
      <SectionCard padded={true}>
        <Text>
          {intl.get('import.preview.ready_text', {
            count: importPreview.createdCount,
          })}
        </Text>
        <ul className={styles.previewList}>
          <li>
            {intl.get('import.preview.to_create')}{' '}
            <span>({importPreview.createdCount})</span>
          </li>
          <li>
            {intl.get('import.preview.to_skip')}{' '}
            <span>({importPreview.skippedCount})</span>
          </li>
          <li>
            {intl.get('import.preview.with_errors')}{' '}
            <span>({importPreview.errorsCount})</span>
          </li>
        </ul>
      </SectionCard>
    </Section>
  );
}

function ImportFilePreviewSkipped() {
  const { importPreview } = useImportFilePreviewBootContext();

  // Can't continue if there's no skipped items.
  if (importPreview.skippedCount <= 0) return null;

  return (
    <Section
      collapseProps={{ defaultIsOpen: false }}
      collapsible={true}
      title={intl.get('import.preview.skipped_title', {
        count: importPreview.skippedCount,
      })}
    >
      <SectionCard padded={true}>
        <table className={clsx('bp4-html-table', styles.skippedTable)}>
          <tbody>
            {importPreview?.errors.map((error, key) => (
              <tr key={key}>
                <td>{error.rowNumber}</td>
                <td>{error.uniqueValue}</td>
                <td>{error.errorMessage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </Section>
  );
}

function ImportFilePreviewUnmapped() {
  const { importPreview } = useImportFilePreviewBootContext();

  // Can't continue if there's no unmapped columns.
  if (importPreview?.unmappedColumnsCount <= 0) return null;

  return (
    <Section
      collapseProps={{ defaultIsOpen: false }}
      collapsible={true}
      title={intl.get('import.preview.unmapped_title', {
        count: importPreview?.unmappedColumnsCount,
      })}
    >
      <SectionCard padded={true}>
        <ul className={styles.unmappedList}>
          {importPreview.unmappedColumns?.map((column, key) => (
            <li key={key}>{column}</li>
          ))}
        </ul>
      </SectionCard>
    </Section>
  );
}

function ImportFilePreviewFloatingActions() {
  const { importId, setStep, onImportSuccess, onImportFailed } =
    useImportFileContext();
  const { importPreview } = useImportFilePreviewBootContext();
  const { mutateAsync: importFile, isLoading: isImportFileLoading } =
    useImportFileProcess();

  const isValidToImport = importPreview?.createdCount > 0;

  const handleSubmitBtn = () => {
    importFile(importId)
      .then(() => {
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: intl.get('import.preview.success', {
            count: importPreview.createdCount,
          }),
        });
        onImportSuccess && onImportSuccess();
      })
      .catch((error) => {
        onImportFailed && onImportFailed();
      });
  };
  const handleCancelBtnClick = () => {
    setStep(ImportStepperStep.Mapping);
  };

  return (
    <div className={clsx(CLASSES.PAGE_FORM_FLOATING_ACTIONS)}>
      <Group spacing={10}>
        <Button onClick={handleCancelBtnClick}>{intl.get('cancel')}</Button>
        <Button
          type="submit"
          intent={Intent.PRIMARY}
          loading={isImportFileLoading}
          onClick={handleSubmitBtn}
          disabled={!isValidToImport}
        >
          {intl.get('import')}
        </Button>
      </Group>
    </div>
  );
}
