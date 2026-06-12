// @ts-nocheck

import intl from 'react-intl-universal';
import { Stepper } from '@/components/Stepper';
import { ImportFileUploadStep } from './ImportFileUploadStep';
import { useImportFileContext } from './ImportFileProvider';
import { ImportFileMapping } from './ImportFileMapping';
import { ImportFilePreview } from './ImportFilePreview';
import styles from './ImportStepper.module.scss';

export function ImportStepper() {
  const { step } = useImportFileContext();

  return (
    <Stepper
      active={step}
      classNames={{
        content: styles.content,
        items: styles.items,
      }}
    >
      <Stepper.Step label={intl.get('import.stepper.file_upload')}>
        <ImportFileUploadStep />
      </Stepper.Step>

      <Stepper.Step label={intl.get('import.stepper.mapping')}>
        <ImportFileMapping />
      </Stepper.Step>

      <Stepper.Step label={intl.get('import.stepper.results')}>
        <ImportFilePreview />
      </Stepper.Step>
    </Stepper>
  );
}
