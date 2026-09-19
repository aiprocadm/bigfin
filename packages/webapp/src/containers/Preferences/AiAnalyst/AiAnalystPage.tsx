// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import {
  useAiAnalystSettings,
  useAiAvailability,
  useSaveAiAnalystSettings,
} from '@/hooks/query/ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Настройки ИИ-аналитика (этап 13 ТЗ, остаток И2).
 *
 * Раздел выключен по умолчанию и работает только тогда, когда владелец сам
 * подключил провайдера. Это не осторожность ради осторожности: в модель
 * уходят агрегаты по деньгам организации, и решение отправлять их наружу —
 * решение владельца, а не умолчание продукта.
 */
export default function AiAnalystPreferences() {
  const { data: settings, isLoading } = useAiAnalystSettings();
  const { data: availability } = useAiAvailability();
  const { mutateAsync: save, isLoading: isSaving } = useSaveAiAnalystSettings();

  const [form, setForm] = React.useState({
    provider: '',
    endpoint: '',
    folderId: '',
    model: '',
    apiKey: '',
  });

  React.useEffect(() => {
    if (!settings) return;

    setForm({
      provider: settings.provider ?? '',
      endpoint: settings.endpoint ?? '',
      folderId: settings.folderId ?? '',
      model: settings.model ?? '',
      // Ключ НЕ подставляется: сервер его не отдаёт, и показать здесь
      // звёздочки значило бы притвориться, что он у нас есть.
      apiKey: '',
    });
  }, [settings]);

  if (isLoading) {
    return <Skeleton className="m-6 h-80 w-full" />;
  }

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [name]: event.target.value })),
  });

  const onSave = async () => {
    // Пустой ключ НЕ отправляем вовсе: сервер трактует отсутствие поля как
    // «не менять», а пустую строку мог бы понять как «стереть».
    const payload: Record<string, unknown> = {
      provider: form.provider || null,
      endpoint: form.endpoint || null,
      folderId: form.folderId || null,
      model: form.model || null,
    };
    if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();

    await save(payload);
    setForm((prev) => ({ ...prev, apiKey: '' }));
  };

  return (
    <div className="bigfin-ui flex flex-col gap-4 p-6">
      <section className="rounded-default border border-border p-4">
        <h2 className="text-sm font-medium">{intl.get('ai_settings.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {intl.get('ai_settings.hint')}
        </p>

        {/* Состояние раздела словами, а не значком: «недоступно» без причины
            заставляет гадать, что именно не так. */}
        {availability && !availability.available && availability.reason && (
          <p className="mt-3 rounded-control border border-warning bg-warning/10 p-3 text-sm">
            {intl.get(`ai_settings.unavailable.${availability.reason}`)}
          </p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {intl.get('ai_settings.provider')}
            <Input {...field('provider')} placeholder="yandexgpt" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {intl.get('ai_settings.model')}
            <Input {...field('model')} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {intl.get('ai_settings.endpoint')}
            <Input {...field('endpoint')} placeholder="https://..." />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {intl.get('ai_settings.folder')}
            <Input {...field('folderId')} />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            {intl.get('ai_settings.api_key')}
            <Input
              type="password"
              autoComplete="off"
              {...field('apiKey')}
              placeholder={intl.get(
                settings?.apiKeySet
                  ? 'ai_settings.api_key.set'
                  : 'ai_settings.api_key.empty',
              )}
            />
            <span className="text-xs text-text-muted">
              {intl.get('ai_settings.api_key.hint')}
            </span>
          </label>
        </div>

        <Button type="button" className="mt-4" onClick={onSave} disabled={isSaving}>
          {intl.get('save')}
        </Button>
      </section>

      {settings?.forbidExternalData && (
        <section className="rounded-default border border-border p-4 text-sm text-text-muted">
          {intl.get('ai_settings.external_forbidden')}
        </section>
      )}
    </div>
  );
}
