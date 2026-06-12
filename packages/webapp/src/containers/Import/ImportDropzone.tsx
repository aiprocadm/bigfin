// @ts-nocheck
import { Field } from 'formik';
import intl from 'react-intl-universal';
import { Box, Group, Stack } from '@/components';
import styles from './ImportDropzone.module.css';
import { ImportDropzoneField } from './ImportDropzoneFile';
import { useAlertsManager } from './AlertsManager';

export function ImportDropzone() {
  const { hideAlerts } = useAlertsManager();

  return (
    <Stack spacing={0} className={styles.root}>
      <Field id={'file'} name={'file'} type="file">
        {({ form }) => (
          <ImportDropzoneField
            title={intl.get('import.dropzone.title')}
            subtitle={''}
            value={form.file}
            onChange={(file) => {
              hideAlerts();
              form.setFieldValue('file', file);
            }}
          />
        )}
      </Field>

      <Group className={styles.dropzoneHint}>
        <Box>{intl.get('import.dropzone.supported_formats')}</Box>
        <Box>{intl.get('import.dropzone.maximum_size')}</Box>
      </Group>
    </Stack>
  );
}
