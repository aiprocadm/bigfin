import { useRef } from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';
import { ImageIcon, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BrandingFormValues } from './PreferencesBranding.zod';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/svg+xml';
const HEX_RE = /^#[0-9a-f]{6}$/i;

/**
 * Поля формы оформления: логотип компании и основной цвет документов.
 */
export function PreferencesBrandingFormContent() {
  const form = useFormContext<BrandingFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoUri = form.watch('logoUri');

  // Подмена логотипа: освобождаем предыдущий blob-URL, чтобы не тёк
  // на каждый выбор файла (серверные URL не трогаем) — как в легаси.
  const applyLogoFile = (file: File | null) => {
    if (typeof logoUri === 'string' && logoUri.startsWith('blob:')) {
      URL.revokeObjectURL(logoUri);
    }
    form.setValue('_logoFile', file ?? undefined, { shouldDirty: true });
    form.setValue('logoUri', file ? URL.createObjectURL(file) : '', {
      shouldDirty: true,
    });
    form.setValue('logoKey', '', { shouldDirty: true });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* ----------- Логотип ----------- */}
      <div className="flex flex-col gap-2">
        <Label>{intl.get('preferences.branding.company_logo')}</Label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) applyLogoFile(file);
          }}
          className="flex items-center gap-4 rounded-default border border-dashed border-border bg-surface p-5"
        >
          {logoUri ? (
            <img
              src={logoUri}
              alt={intl.get('preferences.branding.company_logo')}
              className="h-16 w-16 rounded-default bg-surface-elevated object-contain"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-default bg-surface-elevated text-text-muted">
              <ImageIcon className="h-7 w-7" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-text-primary">
              {intl.get('preferences.branding.logo.drop_hint')}
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              {intl.get('preferences.branding.logo.dimensions')}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => applyLogoFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('preferences.branding.logo.choose_file')}
          </Button>
          {logoUri ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={intl.get('preferences.branding.logo.remove')}
              onClick={() => {
                applyLogoFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-text-secondary">
          {intl.get('preferences.branding.logo.description')}
        </p>
      </div>

      {/* ----------- Основной цвет ----------- */}
      <FormField
        control={form.control}
        name="primaryColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {intl.get('preferences.branding.primary_color')}
            </FormLabel>
            <FormControl>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={intl.get('preferences.branding.primary_color')}
                  value={HEX_RE.test(field.value ?? '') ? field.value : '#ffffff'}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-control border border-border bg-surface p-1"
                />
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="#2E73E8"
                  className="max-w-[140px]"
                />
              </div>
            </FormControl>
            <FormDescription>
              {intl.get('preferences.branding.primary_color.note')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
