import { ComponentType, useMemo, useRef, useState } from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { Settings } from 'lucide-react';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { usePreprocessingAccounts } from '@/components/Accounts/_hooks';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxItem } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/textarea';
import { ACCOUNT_TYPE, Features, getAddMoneyOutOptions } from '@/constants';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import TransactionNumberDialogLegacy from '@/containers/Dialogs/TransactionNumberDialog';
import { useUpdateEffect } from '@/hooks';
import {
  useAccount,
  useAccounts,
  useBranches,
  useCashflowAccounts,
  useCreateCashflowTransaction,
  useSettingCashFlow,
} from '@/hooks/query';
import { useCurrentOrganization, useFeatureCan } from '@/hooks/state';
import { transactionNumber } from '@/utils';
import {
  getMoneyOutSchema,
  parseFormNumber,
  type MoneyOutFormValues,
} from './MoneyOut.zod';
import { showApiError } from '@/utils/showApiError';
import { IntercompanyField } from '@/components/legal-entities/IntercompanyField';
import { AccrualPeriodField } from '../../AccrualPeriodField';

// ---------------------------------------------------------------------------
// Типы данных и локальные касты легаси-хуков (сами хуки без типов).
// ---------------------------------------------------------------------------

interface AccountOption {
  id: number;
  name: string;
  code?: string;
  currency_code?: string | null;
}

interface BranchOption {
  id: number;
  name: string;
  primary?: boolean;
}

interface CashflowSetting {
  autoIncrement?: boolean;
  nextNumber?: string;
  numberPrefix?: string;
}

const useAccountsTyped = useAccounts as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: AccountOption[]; isLoading: boolean };

const useCashflowAccountsTyped = useCashflowAccounts as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: AccountOption[]; isLoading: boolean };

const useBranchesTyped = useBranches as unknown as (
  query: Record<string, unknown>,
  props: Record<string, unknown>,
) => { data: BranchOption[]; isLoading: boolean; isSuccess: boolean };

const useSettingCashFlowTyped = useSettingCashFlow as unknown as (
  props: Record<string, unknown>,
) => { isLoading: boolean };

const useAccountTyped = useAccount as unknown as (
  id: number | null,
  props: Record<string, unknown>,
) => { data?: { currency_code?: string | null } };

const useCreateCashflowTransactionTyped =
  useCreateCashflowTransaction as unknown as (
    props: Record<string, unknown>,
  ) => { mutateAsync: (values: Record<string, unknown>) => Promise<unknown> };

const useUpdateEffectTyped = useUpdateEffect as (
  effect: () => void,
  deps: ReadonlyArray<unknown>,
) => void;

const buildTransactionNo = transactionNumber as unknown as (
  prefix?: string,
  next?: string,
) => string;

const TransactionNumberDialog = TransactionNumberDialogLegacy as unknown as ComponentType<{
  dialogName: string;
  onConfirm: (settings: { transactionNumber: string }) => void;
}>;

// ---------------------------------------------------------------------------
// Подтипы операции «Деньги ушли»: подпись и фильтр счёта-назначения
// (паритет с легаси OwnerDrawings / OtherExpense / TransferToAccount).
// ---------------------------------------------------------------------------

const EMPTY_TYPES: string[] = [];

const MONEY_OUT_SUBTYPES: Record<
  string,
  { creditLabelKey: string; creditFilterTypes: string[] }
> = {
  owner_drawing: {
    creditLabelKey: 'cash_flow_transaction.label_equity_account',
    creditFilterTypes: [ACCOUNT_TYPE.EQUITY],
  },
  other_expense: {
    creditLabelKey: 'cash_flow_transaction.label_expense_account',
    creditFilterTypes: [ACCOUNT_TYPE.EXPENSE, ACCOUNT_TYPE.OTHER_EXPENSE],
  },
  transfer_to_account: {
    creditLabelKey: 'cash_flow_transaction.label_transfer_to_account',
    creditFilterTypes: [
      ACCOUNT_TYPE.CASH,
      ACCOUNT_TYPE.BANK,
      ACCOUNT_TYPE.CREDIT_CARD,
    ],
  },
};

interface MoneyOutFormV2Props {
  accountId?: number | null;
  accountType?: string | null;
  onClose: () => void;
}

/**
 * Корень формы: грузит справочники теми же хуками, что и легаси-провайдер
 * (accounts, cashflow-счета, филиалы, настройки нумерации), затем монтирует
 * форму с готовыми данными.
 */
function MoneyOutFormV2Root({
  accountId,
  accountType,
  onClose,
  openDialog,
}: MoneyOutFormV2Props & WithDialogActionsProps) {
  const { featureCan } = useFeatureCan();
  const isBranchFeature = featureCan(Features.Branches);

  const { data: accounts, isLoading: isAccountsLoading } = useAccountsTyped(
    {},
    {},
  );
  const { data: cashflowAccounts, isLoading: isCashflowAccountsLoading } =
    useCashflowAccountsTyped({}, { keepPreviousData: true });
  const {
    data: branches,
    isLoading: isBranchesLoading,
    isSuccess: isBranchesSuccess,
  } = useBranchesTyped({}, { enabled: isBranchFeature });
  const { isLoading: isSettingsLoading } = useSettingCashFlowTyped({});
  const { mutateAsync: createTransaction } =
    useCreateCashflowTransactionTyped({});

  const organization = useCurrentOrganization() as
    | { base_currency?: string }
    | undefined;
  const cashflowSetting = useSelector(
    (state: any) => state?.settings?.data?.cashflow,
  ) as CashflowSetting | undefined;

  const isLoading =
    isAccountsLoading ||
    isCashflowAccountsLoading ||
    isBranchesLoading ||
    isSettingsLoading;

  if (isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }
  return (
    <MoneyOutFormInner
      accounts={accounts ?? []}
      cashflowAccounts={cashflowAccounts ?? []}
      branches={branches ?? []}
      isBranchesSuccess={isBranchesSuccess}
      isBranchFeature={isBranchFeature}
      baseCurrency={organization?.base_currency ?? ''}
      cashflowSetting={cashflowSetting}
      defaultAccountId={accountId ?? null}
      defaultAccountType={accountType ?? null}
      onSubmitTransaction={createTransaction}
      onClose={onClose}
      openDialog={openDialog}
    />
  );
}

interface MoneyOutFormInnerProps {
  accounts: AccountOption[];
  cashflowAccounts: AccountOption[];
  branches: BranchOption[];
  isBranchesSuccess: boolean;
  isBranchFeature: boolean;
  baseCurrency: string;
  cashflowSetting?: CashflowSetting;
  defaultAccountId: number | null;
  defaultAccountType: string | null;
  onSubmitTransaction: (values: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  openDialog: WithDialogActionsProps['openDialog'];
}

/**
 * Форма «Деньги ушли» (RHF + Zod + shadcn), зеркало MoneyInFormV2:
 * сумма крупно сверху, курс при мультивалюте, дата + текущий счёт,
 * тип операции + счёт-назначение, детали (номер, документ, филиал), описание.
 * Логика легаси сохранена: три подтипа, автонумерация с настройкой,
 * филиал по умолчанию, publish=true при сохранении.
 */
function MoneyOutFormInner({
  accounts,
  cashflowAccounts,
  branches,
  isBranchesSuccess,
  isBranchFeature,
  baseCurrency,
  cashflowSetting,
  defaultAccountId,
  defaultAccountType,
  onSubmitTransaction,
  onClose,
  openDialog,
}: MoneyOutFormInnerProps) {
  const schema = useMemo(() => getMoneyOutSchema(), []);
  const transactionTypeOptions = useMemo(
    () => getAddMoneyOutOptions() as { name: string; value: string }[],
    [],
  );

  const autoIncrement = Boolean(cashflowSetting?.autoIncrement);
  const initialTransactionNo = autoIncrement
    ? buildTransactionNo(
        cashflowSetting?.numberPrefix,
        cashflowSetting?.nextNumber,
      )
    : '';

  // Филиал по умолчанию — основной либо первый (паритет useSetPrimaryBranchToForm).
  const primaryBranch = isBranchesSuccess
    ? branches.find((branch) => branch.primary) ?? branches[0]
    : undefined;

  const form = useForm<MoneyOutFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: moment().format('YYYY-MM-DD'),
      amount: '',
      transaction_number: initialTransactionNo,
      transaction_type: defaultAccountType ?? '',
      reference_no: '',
      cashflow_account_id: defaultAccountId,
      credit_account_id: null,
      branch_id: primaryBranch ? primaryBranch.id : null,
      exchange_rate: '1',
      description: '',
      is_intercompany: false,
      accrual_period: '',
    },
  });

  // Ручной номер операции (паритет transaction_number_manually из легаси).
  const [transactionNoManually, setTransactionNoManually] = useState('');
  // Последний «подтверждённый» номер — чтобы поймать ручную правку на blur.
  const lastTransactionNoRef = useRef(initialTransactionNo);

  const transactionType = form.watch('transaction_type');
  const cashflowAccountId = form.watch('cashflow_account_id');

  // Детали выбранного счёта — ради валюты (паритет MoneyOutFieldsProvider).
  const { data: selectedAccount } = useAccountTyped(cashflowAccountId, {
    enabled: !!cashflowAccountId,
  });
  const accountCurrency = selectedAccount?.currency_code ?? null;
  const isForeignAccount = Boolean(
    accountCurrency && baseCurrency && accountCurrency !== baseCurrency,
  );
  const amountCurrency = accountCurrency ?? baseCurrency;

  const subtype = transactionType
    ? MONEY_OUT_SUBTYPES[transactionType]
    : undefined;
  // Как в легаси: детали недоступны, пока не выбраны тип и текущий счёт.
  const detailsVisible = Boolean(subtype && cashflowAccountId);

  // Счета-назначения, отфильтрованные по подтипу (паритет FAccountsSuggestField).
  const creditAccounts = usePreprocessingAccounts(accounts, {
    filterByTypes: subtype ? subtype.creditFilterTypes : EMPTY_TYPES,
    filterByRootTypes: EMPTY_TYPES,
    filterByParentTypes: EMPTY_TYPES,
    filterByNormal: EMPTY_TYPES,
  }) as AccountOption[];

  const creditAccountItems: ComboboxItem[] = useMemo(
    () =>
      creditAccounts.map((account) => ({
        value: String(account.id),
        label: account.code ? `${account.name} · ${account.code}` : account.name,
      })),
    [creditAccounts],
  );
  const cashflowAccountItems: ComboboxItem[] = useMemo(
    () =>
      cashflowAccounts.map((account) => ({
        value: String(account.id),
        label: account.name,
      })),
    [cashflowAccounts],
  );

  // Смена подтипа меняет допустимые счета-назначения — сбрасываем выбор.
  useUpdateEffectTyped(() => {
    form.setValue('credit_account_id', null);
  }, [transactionType]);

  // Настройки нумерации изменились (после диалога настройки) — обновляем номер
  // (паритет MoneyInOutSyncIncrementSettingsToForm).
  useUpdateEffectTyped(() => {
    if (!autoIncrement) return;
    const nextNo = buildTransactionNo(
      cashflowSetting?.numberPrefix,
      cashflowSetting?.nextNumber,
    );
    form.setValue('transaction_number', nextNo);
    lastTransactionNoRef.current = nextNo;
  }, [cashflowSetting?.numberPrefix, cashflowSetting?.nextNumber]);

  // Ручная правка номера при автонумерации — предлагаем выбрать режим
  // в диалоге настройки (паритет MoneyInOutTransactionNoField).
  const handleTransactionNoBlur = (value: string) => {
    if (autoIncrement && value !== lastTransactionNoRef.current) {
      openDialog('transaction-number-form', {
        initialFormValues: {
          onceManualNumber: value,
          incrementMode: 'manual-transaction',
        },
      });
    }
    if (!autoIncrement) {
      setTransactionNoManually(value);
    }
  };

  // Подтверждение из диалога настройки нумерации (паритет MoneyOutFormDialog).
  const handleTransactionNumberConfirm = (settings: {
    transactionNumber: string;
  }) => {
    form.setValue('transaction_number', settings.transactionNumber);
    setTransactionNoManually(settings.transactionNumber);
    lastTransactionNoRef.current = settings.transactionNumber;
  };

  const onSubmit = async (values: MoneyOutFormValues) => {
    const payload: Record<string, unknown> = {
      date: values.date,
      amount: parseFormNumber(values.amount),
      transaction_number: values.transaction_number,
      transaction_type: values.transaction_type,
      reference_no: values.reference_no,
      cashflow_account_id: values.cashflow_account_id,
      credit_account_id: values.credit_account_id,
      description: values.description,
      branch_id: values.branch_id ?? '',
      exchange_rate:
        values.exchange_rate === '' ? 1 : parseFormNumber(values.exchange_rate),
      publish: true,
      // БЕЛЫЙ СПИСОК: поле, не перечисленное здесь, до сервера не доедет.
      // Без этой строки галочка «внутригрупповая» была бы пустой кнопкой —
      // нажимается, а ничего не меняет (остаток К2).
      is_intercompany: Boolean(values.is_intercompany),
      // Месяц начисления (FT-013 ТЗ-3) — в белом списке, иначе до сервера
      // не доедет. Пусто — не отправляем вовсе.
      ...(values.accrual_period ? { accrual_period: values.accrual_period } : {}),
      ...(transactionNoManually
        ? { transaction_number_manually: transactionNoManually }
        : {}),
    };
    try {
      await onSubmitTransaction(payload);
      AppToaster.show({
        // Уведомление повторяет имя действия с кнопки. Было
        // «банковская операция создана» — не то, что человек делал.
        message: intl.get('money_out.saved'),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Сумма — главное поле, крупно сверху */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('amount')}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3 rounded-control border border-border bg-surface-elevated px-4 focus-within:border-action focus-within:ring-2 focus-within:ring-action">
                    <input
                      {...field}
                      value={field.value ?? ''}
                      autoFocus
                      inputMode="decimal"
                      placeholder="0"
                      className="h-14 w-full flex-1 border-0 bg-transparent text-right text-2xl font-semibold tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    <span className="shrink-0 text-base font-medium text-text-muted">
                      {amountCurrency}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Курс — только при мультивалютном счёте */}
          {isForeignAccount && (
            <FormField
              control={form.control}
              name="exchange_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('exchange_rate')}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <span className="whitespace-nowrap">
                        1 {baseCurrency} =
                      </span>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        inputMode="decimal"
                        className="w-28 text-right tabular-nums"
                      />
                      <span className="whitespace-nowrap">
                        {accountCurrency}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Дата */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('date')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={
                        field.value
                          ? moment(field.value, 'YYYY-MM-DD').toDate()
                          : undefined
                      }
                      onChange={(date) =>
                        field.onChange(
                          date ? moment(date).format('YYYY-MM-DD') : '',
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Текущий счёт (откуда ушли деньги) */}
            <FormField
              control={form.control}
              name="cashflow_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('cash_flow_transaction.label_current_account')}
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      items={cashflowAccountItems}
                      value={
                        field.value != null ? String(field.value) : undefined
                      }
                      onChange={(value) => field.onChange(Number(value))}
                      placeholder={intl.get('select_account')}
                      searchPlaceholder={intl.get('search')}
                      emptyText={intl.get('no_results')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Тип операции (подтип расхода) */}
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('transaction_type')}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={intl.get('transaction_type')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Счёт-назначение — подпись и фильтр зависят от подтипа */}
            {subtype && (
              <FormField
                control={form.control}
                name="credit_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get(subtype.creditLabelKey)}</FormLabel>
                    <FormControl>
                      <Combobox
                        items={creditAccountItems}
                        value={
                          field.value != null ? String(field.value) : undefined
                        }
                        onChange={(value) => field.onChange(Number(value))}
                        placeholder={intl.get('select_account')}
                        searchPlaceholder={intl.get('search')}
                        emptyText={intl.get('no_results')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {detailsVisible && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Номер операции + настройка автонумерации */}
                <FormField
                  control={form.control}
                  name="transaction_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.get('transaction_number')}</FormLabel>
                      <FormControl>
                        <div className="flex gap-1">
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onBlur={(event) => {
                              field.onBlur();
                              handleTransactionNoBlur(event.target.value);
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label={intl.get(
                              'cash_flow.setting_your_auto_generated_transaction_number',
                            )}
                            title={intl.get(
                              'cash_flow.setting_your_auto_generated_transaction_number',
                            )}
                            onClick={() =>
                              openDialog('transaction-number-form')
                            }
                          >
                            <Settings className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Номер документа */}
                <FormField
                  control={form.control}
                  name="reference_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{intl.get('reference_no')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Филиал — только при включённой фиче */}
                {isBranchFeature && (
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{intl.get('branch')}</FormLabel>
                        <FormControl>
                          <Select
                            value={
                              field.value != null
                                ? String(field.value)
                                : undefined
                            }
                            onValueChange={(value) =>
                              field.onChange(Number(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={intl.get('branch')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem
                                  key={branch.id}
                                  value={String(branch.id)}
                                >
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Внутригрупповая операция (остаток К2). Поля нет вовсе,
                  пока юрлицо одно: внутригрупповых операций не бывает. */}
              <IntercompanyField name="is_intercompany" />

              {/* Месяц начисления (FT-013 ТЗ-3). */}
              <AccrualPeriodField />

              {/* Описание */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={form.formState.isSubmitting}
              onClick={onClose}
            >
              {/* «Отмена», а не «Закрыть»: в форме может быть
                  набранное, и человек должен понимать, что оно
                  пропадёт. */}
              {intl.get('cancel')}
            </Button>
            {/* Кнопка называет ДЕЙСТВИЕ. Было «Сохранить и
                опубликовать» — для владельца малого бизнеса это набор
                слов: «опубликовать» звучит как «выложить в интернет».
                Уведомление после говорит теми же словами. */}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner size="sm" />}
              {form.formState.isSubmitting
                ? intl.get('money_out.submitting')
                : intl.get('money_out.submit')}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      {/* Легаси-диалог настройки нумерации (открывается по шестерёнке) */}
      <TransactionNumberDialog
        dialogName="transaction-number-form"
        onConfirm={handleTransactionNumberConfirm}
      />
    </>
  );
}

export const MoneyOutFormV2 = withDialogActions(MoneyOutFormV2Root);
