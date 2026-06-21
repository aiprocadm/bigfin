// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import {
  MarketingMetrics,
  MarketingChannel,
  useMarketingChannels,
  useCreateMarketingChannel,
  useDeleteMarketingChannel,
  useUpsertMarketingMonthly,
  useSetCustomerLifetime,
} from '@/hooks/query/financialModel';

const fmtMoney = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;

const btn = 'rounded border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50';
const input = 'rounded border px-2 py-1 text-sm';

interface Draft {
  spend: string;
  newCustomers: string;
}

export function MarketingPanel({
  marketing,
  toDate,
}: {
  marketing?: MarketingMetrics;
  fromDate: string;
  toDate: string;
}) {
  const { data: channels } = useMarketingChannels();
  const createChannel = useCreateMarketingChannel();
  const deleteChannel = useDeleteMarketingChannel();
  const upsertMonthly = useUpsertMarketingMonthly();
  const setLifetime = useSetCustomerLifetime();

  const [month, setMonth] = React.useState(toDate.slice(0, 7));
  const [newChannel, setNewChannel] = React.useState('');
  const [lifetime, setLifetime$] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<number, Draft>>({});

  React.useEffect(() => {
    setLifetime$(String(marketing?.customerLifetimeMonths ?? ''));
  }, [marketing?.customerLifetimeMonths]);

  const na = intl.get('financial_model.na');
  const list: MarketingChannel[] = channels ?? [];

  const setDraft = (id: number, field: keyof Draft, value: string) =>
    setDrafts((d) => {
      const cur: Draft = d[id] ?? { spend: '', newCustomers: '' };
      return { ...d, [id]: { ...cur, [field]: value } };
    });

  const saveMonthly = (channelId: number) => {
    const d = drafts[channelId] ?? { spend: '', newCustomers: '' };
    upsertMonthly.mutate({
      channelId,
      month,
      spend: Number(d.spend) || 0,
      newCustomers: Number(d.newCustomers) || 0,
    });
  };

  const addChannel = () => {
    const name = newChannel.trim();
    if (!name) return;
    createChannel.mutate({ name });
    setNewChannel('');
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mt-2 text-lg font-semibold">
        {intl.get('financial_model.marketing.title')}
      </h2>

      {/* Средний срок жизни клиента (для LTV) */}
      <div className="flex flex-wrap items-end gap-2 rounded-md border p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {intl.get('financial_model.marketing.lifetime_label')}
          </span>
          <input
            type="number"
            min={0}
            className={`${input} w-40`}
            value={lifetime}
            onChange={(e) => setLifetime$(e.target.value)}
          />
        </label>
        <button className={btn} onClick={() => setLifetime.mutate(Number(lifetime) || 0)}>
          {intl.get('financial_model.marketing.save')}
        </button>
      </div>

      {/* Каналы + помесячный ввод за выбранный месяц */}
      <div className="rounded-md border p-4">
        <label className="mb-3 flex w-44 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {intl.get('financial_model.marketing.month_label')}
          </span>
          <input
            type="month"
            className={input}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>

        {list.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">
            {intl.get('financial_model.marketing.empty_channels')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-1 font-normal">
                  {intl.get('financial_model.marketing.channel_name')}
                </th>
                <th className="px-2 py-1 text-right font-normal">
                  {intl.get('financial_model.marketing.spend')}
                </th>
                <th className="px-2 py-1 text-right font-normal">
                  {intl.get('financial_model.marketing.new_customers')}
                </th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-2 py-1">{c.name}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      className={`${input} w-28 text-right`}
                      value={drafts[c.id]?.spend ?? ''}
                      onChange={(e) => setDraft(c.id, 'spend', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      className={`${input} w-24 text-right`}
                      value={drafts[c.id]?.newCustomers ?? ''}
                      onChange={(e) =>
                        setDraft(c.id, 'newCustomers', e.target.value)
                      }
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-right">
                    <button className={`${btn} mr-2`} onClick={() => saveMonthly(c.id)}>
                      {intl.get('financial_model.marketing.save')}
                    </button>
                    <button
                      className={`${btn} text-red-600`}
                      onClick={() => deleteChannel.mutate(c.id)}
                    >
                      {intl.get('financial_model.marketing.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-3 flex gap-2">
          <input
            className={`${input} flex-1`}
            placeholder={intl.get(
              'financial_model.marketing.new_channel_placeholder',
            )}
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
          />
          <button className={btn} disabled={!newChannel.trim()} onClick={addChannel}>
            {intl.get('financial_model.marketing.add_channel')}
          </button>
        </div>
      </div>

      {/* CAC по каналам за период */}
      <div className="rounded-md border p-4">
        <div className="mb-2 text-sm font-medium">
          {intl.get('financial_model.marketing.cac_by_channel')}
        </div>
        {!marketing?.channels?.length ? (
          <div className="py-2 text-sm text-muted-foreground">
            {intl.get('financial_model.marketing.no_data')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-2 py-1 font-normal">
                  {intl.get('financial_model.marketing.channel_name')}
                </th>
                <th className="px-2 py-1 text-right font-normal">
                  {intl.get('financial_model.marketing.spend')}
                </th>
                <th className="px-2 py-1 text-right font-normal">
                  {intl.get('financial_model.marketing.new_customers')}
                </th>
                <th className="px-2 py-1 text-right font-normal">
                  {intl.get('financial_model.metric.cac')}
                </th>
              </tr>
            </thead>
            <tbody>
              {marketing.channels.map((c) => (
                <tr key={c.channelId} className="border-b last:border-0">
                  <td className="px-2 py-1">{c.name}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {fmtMoney(c.spend)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {c.newCustomers}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {c.cac.applicable ? fmtMoney(c.cac.value) : na}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
