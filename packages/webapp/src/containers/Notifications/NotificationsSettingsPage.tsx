// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useFeatureCan } from '@/hooks/state/feature';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useConnectTelegram,
  useDisconnectTelegram,
} from '@/hooks/query/notifications';
import type { NotificationPreferenceItem } from '@/hooks/query/notifications';
import {
  notificationsSettingsSchema,
  NotificationsSettingsFormValues,
} from './schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const safeNum = (raw: string) => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

/** Find preference row by eventType; return null if absent. */
const findPref = (
  preferences: NotificationPreferenceItem[] | undefined,
  eventType: string,
): NotificationPreferenceItem | null =>
  preferences?.find((p) => p.eventType === eventType) ?? null;

const buildDefaults = (
  data: { preferences: NotificationPreferenceItem[]; recipientEmail: string | null; cooldownHours: number } | null,
): NotificationsSettingsFormValues => {
  const cashGapPref = findPref(data?.preferences, 'cash_gap');
  const lowBalancePref = findPref(data?.preferences, 'low_balance');
  const overduePref = findPref(data?.preferences, 'overdue');
  return {
    cashGap: {
      eventType: 'cash_gap',
      enabled: cashGapPref?.enabled ?? false,
      channels: cashGapPref?.channels ?? ['email'],
      horizonDays: (cashGapPref?.threshold as any)?.horizonDays ?? 7,
    },
    lowBalance: {
      eventType: 'low_balance',
      enabled: lowBalancePref?.enabled ?? false,
      channels: lowBalancePref?.channels ?? ['email'],
      minBalance: (lowBalancePref?.threshold as any)?.minAmount ?? 0,
    },
    overdue: {
      eventType: 'overdue',
      enabled: overduePref?.enabled ?? false,
      channels: overduePref?.channels ?? ['email'],
    },
    recipientEmail: data?.recipientEmail ?? '',
    cooldownHours: data?.cooldownHours ?? 24,
  };
};

// ---------------------------------------------------------------------------
// ChannelToggles helper
// ---------------------------------------------------------------------------

function ChannelToggles({
  control,
  name,
  telegramConnected,
}: {
  control: any;
  name: 'cashGap.channels' | 'lowBalance.channels' | 'overdue.channels';
  telegramConnected: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? ['email'];
        const toggle = (key: string, on: boolean) => {
          const next = on
            ? Array.from(new Set([...value, key]))
            : value.filter((c) => c !== key);
          field.onChange(next.length ? next : ['email']);
        };
        return (
          <FormItem className="pl-6">
            <FormLabel>{intl.get('notifications.settings.channels')}</FormLabel>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={value.includes('email')}
                  onCheckedChange={(c) => toggle('email', Boolean(c))}
                />
                {intl.get('notifications.channel.email')}
              </label>
              {telegramConnected && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.includes('telegram')}
                    onCheckedChange={(c) => toggle('telegram', Boolean(c))}
                  />
                  {intl.get('notifications.channel.telegram')}
                </label>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsSettingsPage() {
  const { featureCan } = useFeatureCan();

  const { data, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const connectTelegram = useConnectTelegram();
  const disconnectTelegram = useDisconnectTelegram();
  const [tokenInput, setTokenInput] = React.useState('');
  const telegramConnected = Boolean((data as any)?.telegram?.connected);

  const onConnectTelegram = async () => {
    try {
      await connectTelegram.mutateAsync({ botToken: tokenInput.trim() });
      setTokenInput('');
      toast.success(intl.get('notifications.telegram.toast.connected'));
    } catch (e: any) {
      const code = e?.response?.data?.errors?.[0]?.type;
      const msg =
        code === 'TELEGRAM_NO_CHAT'
          ? intl.get('notifications.telegram.error.no_chat')
          : code === 'TELEGRAM_INVALID_TOKEN'
          ? intl.get('notifications.telegram.error.invalid_token')
          : intl.get('notifications.telegram.error.generic');
      toast.error(msg);
    }
  };

  const onDisconnectTelegram = async () => {
    try {
      await disconnectTelegram.mutateAsync();
      toast.success(intl.get('notifications.telegram.toast.disconnected'));
    } catch {
      toast.error(intl.get('notifications.telegram.error.generic'));
    }
  };

  const form = useForm<NotificationsSettingsFormValues>({
    resolver: zodResolver(notificationsSettingsSchema),
    defaultValues: buildDefaults(null),
  });

  const isSubmitting = form.formState.isSubmitting;

  // Re-sync when preferences load
  React.useEffect(() => {
    if (data) {
      form.reset(buildDefaults(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!featureCan('notifications')) return null;

  const onSubmit = async (values: NotificationsSettingsFormValues) => {
    const preferences: NotificationPreferenceItem[] = [
      {
        eventType: 'cash_gap',
        enabled: values.cashGap.enabled,
        channels: values.cashGap.channels,
        threshold: values.cashGap.horizonDays != null
          ? { horizonDays: values.cashGap.horizonDays }
          : null,
      },
      {
        eventType: 'low_balance',
        enabled: values.lowBalance.enabled,
        channels: values.lowBalance.channels,
        threshold: values.lowBalance.minBalance != null
          ? { minAmount: values.lowBalance.minBalance }
          : null,
      },
      {
        eventType: 'overdue',
        enabled: values.overdue.enabled,
        channels: values.overdue.channels,
        threshold: null,
      },
    ];

    try {
      await updatePreferences.mutateAsync({
        preferences,
        recipientEmail: values.recipientEmail || undefined,
        cooldownHours: values.cooldownHours,
      });
      toast.success(intl.get('notifications.toast.saved'));
    } catch {
      toast.error(intl.get('notifications.toast.error'));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">
        {intl.get('notifications.settings.title')}
      </h1>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">
          {intl.get('notifications.loading')}
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* ---- Events section ---- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {intl.get('notifications.settings.section.events')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* Cash gap */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <FormField
                      control={form.control}
                      name="cashGap.enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormLabel className="font-medium cursor-pointer">
                            {intl.get('notifications.event.cash_gap.label')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {intl.get('notifications.event.cash_gap.description')}
                  </p>
                  <ChannelToggles
                    control={form.control}
                    name="cashGap.channels"
                    telegramConnected={telegramConnected}
                  />
                  <FormField
                    control={form.control}
                    name="cashGap.horizonDays"
                    render={({ field }) => (
                      <FormItem className="pl-6 max-w-xs">
                        <FormLabel>
                          {intl.get('notifications.settings.horizon_days')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(safeNum(e.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <hr className="border-border" />

                {/* Low balance */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <FormField
                      control={form.control}
                      name="lowBalance.enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormLabel className="font-medium cursor-pointer">
                            {intl.get('notifications.event.low_balance.label')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {intl.get('notifications.event.low_balance.description')}
                  </p>
                  <ChannelToggles
                    control={form.control}
                    name="lowBalance.channels"
                    telegramConnected={telegramConnected}
                  />
                  <FormField
                    control={form.control}
                    name="lowBalance.minBalance"
                    render={({ field }) => (
                      <FormItem className="pl-6 max-w-xs">
                        <FormLabel>
                          {intl.get('notifications.settings.min_balance')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(safeNum(e.target.value))}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <hr className="border-border" />

                {/* Overdue */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <FormField
                      control={form.control}
                      name="overdue.enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormLabel className="font-medium cursor-pointer">
                            {intl.get('notifications.event.overdue.label')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {intl.get('notifications.event.overdue.description')}
                  </p>
                  <ChannelToggles
                    control={form.control}
                    name="overdue.channels"
                    telegramConnected={telegramConnected}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ---- Delivery section ---- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {intl.get('notifications.settings.section.delivery')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem className="max-w-sm">
                      <FormLabel>
                        {intl.get('notifications.settings.recipient')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cooldownHours"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>
                        {intl.get('notifications.settings.cooldown')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(safeNum(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* ---- Telegram section ---- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {intl.get('notifications.telegram.section')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {telegramConnected ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-600">
                      {intl.get('notifications.telegram.connected')} ✅
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onDisconnectTelegram}
                      disabled={disconnectTelegram.isLoading}
                    >
                      {intl.get('notifications.telegram.disconnect')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {intl.get('notifications.telegram.help')}
                    </p>
                    <div className="flex items-end gap-3 max-w-lg">
                      <div className="flex flex-col gap-1 flex-1">
                        <label className="text-sm">
                          {intl.get('notifications.telegram.token_label')}
                        </label>
                        <Input
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={onConnectTelegram}
                        disabled={!tokenInput.trim() || connectTelegram.isLoading}
                      >
                        {intl.get('notifications.telegram.connect')}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('notifications.settings.save')}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
