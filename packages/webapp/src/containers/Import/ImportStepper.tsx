import { Fragment } from 'react';
import intl from 'react-intl-universal';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { ImportFileUploadStep } from './ImportFileUploadStep';
import { ImportFileMapping } from './ImportFileMapping';
import { ImportFilePreview } from './ImportFilePreview';
import { useImportFileContext } from './ImportFileProvider';
import { ImportStepperStep } from './_types';

/**
 * Степпер мастера импорта: простые шаги-точки сверху, контент шага ниже.
 * Порядок и номера шагов прежние (Upload → Mapping → Preview).
 */
export function ImportStepper() {
  const { step } = useImportFileContext();

  const steps = [
    intl.get('import.stepper.file_upload'),
    intl.get('import.stepper.mapping'),
    intl.get('import.stepper.results'),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <ol className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3">
          {steps.map((label, index) => {
            const isActive = index === step;
            const isCompleted = index < step;
            return (
              <Fragment key={label}>
                {index > 0 && (
                  <span
                    className={cn(
                      'h-px w-8 sm:w-12',
                      isCompleted || isActive ? 'bg-action' : 'bg-border',
                    )}
                    aria-hidden
                  />
                )}
                <li
                  aria-current={isActive ? 'step' : undefined}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                      isActive || isCompleted
                        ? 'bg-action text-action-fg'
                        : 'border border-border bg-surface text-text-muted',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'hidden text-sm sm:block',
                      isActive
                        ? 'font-medium text-text-primary'
                        : 'text-text-secondary',
                    )}
                  >
                    {label}
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-1 flex-col">
        {step === ImportStepperStep.Upload && <ImportFileUploadStep />}
        {step === ImportStepperStep.Mapping && <ImportFileMapping />}
        {step === ImportStepperStep.Preview && <ImportFilePreview />}
      </div>
    </div>
  );
}
