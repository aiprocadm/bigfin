// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AbilitySubject, PreferencesAbility } from '@/constants/abilityOption';
import { useAbilityContext } from '@/hooks/utils';
import {
  useAiCfoContext,
  useSaveAiCfoContext,
  type AiCfoBusinessContext,
} from '@/hooks/query/aiCfo';
import { showApiError } from '@/utils/showApiError';
import { CONTEXT_CHOICES, contextOptionKey, type ContextChoiceField } from './businessContext';

/** Значение «как в данных»: у Radix-списка пустой строки быть не может. */
const AUTO = 'auto';

type FormValues = {
  industry: string;
  stage: string;
  size: string;
  salesModel: string;
  note: string;
};

const fromSaved = (saved: Partial<AiCfoBusinessContext> | null | undefined): FormValues => ({
  industry: saved?.industry ?? '',
  stage: saved?.stage ?? AUTO,
  size: saved?.size ?? AUTO,
  salesModel: saved?.salesModel ?? AUTO,
  note: saved?.note ?? '',
});

/**
 * «Контекст бизнеса» (FT-101 ТЗ-3): отрасль, стадия, размер, модель продаж.
 *
 * Значения по умолчанию сервер ВЫВОДИТ из данных (стадия — по первой
 * операции, размер — по выручке и людям). Поэтому поле не пустое, а
 * «по данным: …»: человек видит, что продукт уже знает, и правит только то,
 * в чём вывод ошибся. Своё значение важнее вывода.
 */
export function BusinessContextForm() {
  const ability = useAbilityContext();
  // Контекст — настройка организации: менять его может тот, у кого есть
  // право на настройки. Остальные видят, но не сохраняют.
  const canSave = ability.can(PreferencesAbility.Mutate, AbilitySubject.Preferences);

  const { data } = useAiCfoContext();
  const save = useSaveAiCfoContext();

  const [values, setValues] = React.useState<FormValues>(() => fromSaved(null));
  const [touched, setTouched] = React.useState(false);

  // Форма заполняется сохранённым, как только оно приехало, — но не
  // затирает то, что человек уже начал править.
  React.useEffect(() => {
    if (data && !touched) setValues(fromSaved(data.saved));
  }, [data, touched]);

  const inferred = data?.inferred;

  const set = (field: keyof FormValues) => (value: string) => {
    setTouched(true);
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const inferredText = (field: ContextChoiceField): string | null => {
    const value = inferred?.[field];
    return value ? intl.get(contextOptionKey(field, value)) : null;
  };

  const onSave = async () => {
    try {
      // «По данным» уходит пустым значением: сервер тогда подставит вывод,
      // и тот будет обновляться вместе с данными.
      await save.mutateAsync({
        industry: values.industry.trim(),
        stage: values.stage === AUTO ? '' : values.stage,
        size: values.size === AUTO ? '' : values.size,
        salesModel: values.salesModel === AUTO ? '' : values.salesModel,
        note: values.note.trim(),
      } as any);
      setTouched(false);
      AppToaster.show({ message: intl.get('ai_cfo.context.saved'), intent: Intent.SUCCESS });
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-default border border-border bg-surface p-4 text-sm">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium text-text-primary">
          {intl.get('ai_cfo.context.title')}
        </h3>
        <p className="text-xs text-text-muted">{intl.get('ai_cfo.context.hint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">{intl.get('ai_cfo.context.industry')}</span>
          <Input
            value={values.industry}
            maxLength={120}
            disabled={!canSave}
            onChange={(event) => set('industry')(event.target.value)}
            placeholder={
              inferred?.industry
                ? intl.get('ai_cfo.context.by_data', { value: inferred.industry })
                : intl.get('ai_cfo.context.industry_placeholder')
            }
          />
        </label>

        {(Object.keys(CONTEXT_CHOICES) as ContextChoiceField[]).map((field) => {
          const auto = inferredText(field);
          return (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-xs text-text-secondary">
                {intl.get(`ai_cfo.context.${field === 'salesModel' ? 'sales_model' : field}`)}
              </span>
              <Select value={values[field]} onValueChange={set(field)} disabled={!canSave}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>
                    {auto
                      ? intl.get('ai_cfo.context.by_data', { value: auto })
                      : intl.get('ai_cfo.context.by_data_unknown')}
                  </SelectItem>
                  {CONTEXT_CHOICES[field].map((option) => (
                    <SelectItem key={option} value={option}>
                      {intl.get(contextOptionKey(field, option))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          );
        })}

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-text-secondary">{intl.get('ai_cfo.context.note')}</span>
          <Textarea
            value={values.note}
            maxLength={500}
            rows={2}
            disabled={!canSave}
            onChange={(event) => set('note')(event.target.value)}
            placeholder={intl.get('ai_cfo.context.note_placeholder')}
          />
        </label>
      </div>

      {canSave ? (
        <Button
          type="button"
          className="self-start"
          disabled={save.isLoading || !touched}
          onClick={onSave}
        >
          {intl.get('ai_cfo.context.save')}
        </Button>
      ) : (
        <p className="text-xs text-text-muted">{intl.get('ai_cfo.context.no_right')}</p>
      )}
    </section>
  );
}

export default BusinessContextForm;
