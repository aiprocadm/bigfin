import { useCallback, useMemo } from 'react';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import intl from 'react-intl-universal';
import { get } from 'lodash';
import { Button, Classes, Intent, Radio, Tag } from '@blueprintjs/core';
import * as R from 'ramda';
import { getCreateRuleFormSchema } from './RuleFormContentForm.schema';
import {
  AccountsSelect,
  AppToaster,
  Box,
  FFormGroup,
  FInputGroup,
  FRadioGroup,
  FSelect,
  Group,
  Stack,
} from '@/components';
import { useCreateBankRule, useEditBankRule } from '@/hooks/query/bank-rules';
import {
  getFields,
  RuleFormValues,
  getTransactionTypeOptions,
  getAccountRootFromMoneyCategory,
  getDefaultFieldConditionByFieldKey,
  getFieldConditionsByFieldKey,
  getRuleTypeOptions,
  initialValues,
  MAX_RULE_CONDITIONS,
  newSplitLine,
  splitSharesTotal,
  toBankRulePayload,
} from './_utils';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useAutoCompleteContacts } from '@/hooks/query/contacts';
import { useProjects } from '@/containers/Projects/hooks/projects';
import { ProjectsSelect } from '@/containers/Projects/components';
import { Features } from '@/constants/features';
import { useFeatureCan } from '@/hooks/state/feature';

/**
 * Направления берутся из модуля «Сделки»: выключен модуль — список не
 * запрашивается (иначе 403) и поле направления не показывается.
 */
function useRuleProjects() {
  const { featureCan } = useFeatureCan();
  const enabled = !!featureCan(Features.Projects);
  const { data } = useProjects({}, { enabled });
  return { enabled, projects: (data as any)?.projects ?? data ?? [] };
}
import { useRuleFormDialogBoot } from './RuleFormBoot';
import {
  transformToCamelCase,
  transformToForm,
  transfromToSnakeCase,
} from '@/utils';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import { getAddMoneyInOptions, getAddMoneyOutOptions } from '@/constants';
import { showApiError } from '@/utils/showApiError';

// Retrieves the add money in button options.
const MoneyInOptions = getAddMoneyInOptions();
const MoneyOutOptions = getAddMoneyOutOptions();

function RuleFormContentFormRoot({
  // #withDialogActions
  closeDialog,
  openDialog,
}: WithDialogActionsProps) {
  const { accounts, bankRule, isEditMode, bankRuleId } =
    useRuleFormDialogBoot();
  const { mutateAsync: createBankRule } = useCreateBankRule();
  const { mutateAsync: editBankRule } = useEditBankRule();

  const validationSchema = getCreateRuleFormSchema();

  const fromServer: any = transformToForm(transformToCamelCase(bankRule), initialValues);
  const _initialValues = {
    ...initialValues,
    ...fromServer,
    // Пусто на сервере — «поступления и списания», в форме — пустая строка.
    applyIfTransactionType: bankRule
      ? (bankRule as any).apply_if_transaction_type ?? ''
      : initialValues.applyIfTransactionType,
    // У правила другого типа строк разбиения нет — две пустые на случай,
    // если человек сменит тип на «Разбить».
    splits: fromServer?.splits?.length ? fromServer.splits : initialValues.splits,
  };
  // Handles the form submitting.
  const handleSubmit = (
    values: RuleFormValues,
    { setSubmitting }: FormikHelpers<RuleFormValues>,
  ) => {
    const _values = transfromToSnakeCase(toBankRulePayload(values));
    setSubmitting(true);

    const handleSuccess = (created?: any) => {
      setSubmitting(false);
      closeDialog(DialogsName.BankRuleForm);
      AppToaster.show({
        intent: Intent.SUCCESS,
        message: intl.get('banking.rules.created_successfully'),
      });
      // Новое правило — сразу вопрос «применить к прошлым операциям?»
      // (FT-034 ТЗ-3). Молча правило старые строки не трогает.
      const ruleId = created?.id ?? created?.data?.id;
      if (!isEditMode && ruleId) {
        openDialog(DialogsName.BankRuleApplyToPast, { ruleId });
      }
    };
    const handleError = (error: unknown) => {
      setSubmitting(false);
      showApiError(error);
    };
    if (isEditMode && bankRuleId != null) {
      editBankRule({ id: bankRuleId, value: _values })
        .then(handleSuccess)
        .catch(handleError);
    } else {
      createBankRule(_values).then(handleSuccess).catch(handleError);
    }
  };

  return (
    <Formik<RuleFormValues>
      initialValues={_initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Form>
        <FFormGroup
          name={'name'}
          label={intl.get('banking.rules.field.rule_name')}
          labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
          style={{ maxWidth: 300 }}
        >
          <FInputGroup name={'name'} fastField />
        </FFormGroup>

        <RuleTypeField />

        <FFormGroup
          name={'applyIfAccountId'}
          label={intl.get('banking.rules.field.apply_to_account')}
          helperText={intl.get('banking.rules.field.apply_to_account_hint')}
          style={{ maxWidth: 350 }}
        >
          <AccountsSelect
            name={'applyIfAccountId'}
            items={accounts}
            filterByTypes={['cash', 'bank']}
          />
        </FFormGroup>

        <RuleApplyIfTransactionTypeField />

        <FFormGroup
          name={'conditionsType'}
          label={intl.get('banking.rules.field.categorize_when')}
        >
          <FRadioGroup name={'conditionsType'}>
            <Radio
              value={'and'}
              label={intl.get('banking.rules.condition.all_criteria')}
            />
            <Radio
              value={'or'}
              label={intl.get('banking.rules.condition.any_criteria')}
            />
          </FRadioGroup>
        </FFormGroup>

        <RuleFormConditions />
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.8rem' }}>
          {intl.get('banking.rules.then_assign')}
        </h3>

        <RuleActionsByType />

        <RuleFormActions />
      </Form>
    </Formik>
  );
}

export const RuleFormContentForm = R.compose(withDialogActions)(
  RuleFormContentFormRoot,
);

/**
 * Rule form conditions stack.
 * @returns {React.ReactNode}
 */
function RuleFormConditions() {
  const { values, setFieldValue } = useFormikContext<RuleFormValues>();

  const handleAddConditionBtnClick = () => {
    const _conditions = [
      ...values.conditions,
      { field: 'description', comparator: 'contains', value: '' },
    ];
    setFieldValue('conditions', _conditions);
  };
  // Раньше условие можно было только добавить — лишнее не убиралось.
  const handleRemoveCondition = (index: number) => {
    setFieldValue(
      'conditions',
      values.conditions.filter((_, i) => i !== index),
    );
  };

  const handleConditionFieldChange = R.curry((index, item) => {
    const defaultComparator = getDefaultFieldConditionByFieldKey(item.value);

    setFieldValue(`conditions[${index}].field`, item.value);
    setFieldValue(`conditions[${index}].comparator`, defaultComparator);
  });

  return (
    <Box style={{ marginBottom: 15 }}>
      <Stack spacing={15}>
        {values?.conditions?.map((condition, index) => (
          <Group key={index} style={{ width: 500 }}>
            <FFormGroup
              name={`conditions[${index}].field`}
              label={intl.get('banking.rules.condition.field')}
              style={{ marginBottom: 0, flex: '1 0' }}
            >
              <FSelect
                name={`conditions[${index}].field`}
                items={getFields()}
                popoverProps={{ minimal: true }}
                onItemChange={handleConditionFieldChange(index)}
              />
            </FFormGroup>

            <FFormGroup
              name={`conditions[${index}].comparator`}
              label={intl.get('banking.rules.condition.condition')}
              style={{ marginBottom: 0, flex: '1 0' }}
            >
              <FSelect
                name={`conditions[${index}].comparator`}
                items={getFieldConditionsByFieldKey(
                  get(values, `conditions[${index}].field`),
                )}
                popoverProps={{ minimal: true }}
              />
            </FFormGroup>

            <FFormGroup
              name={`conditions[${index}].value`}
              label={intl.get('value')}
              style={{ marginBottom: 0, flex: '1 0 ', width: '40%' }}
            >
              <FInputGroup
                name={`conditions[${index}].value`}
                placeholder={
                  get(values, `conditions[${index}].comparator`) === 'in_list'
                    ? intl.get('banking.rules.comparator.in_list_hint')
                    : undefined
                }
              />
            </FFormGroup>
            {values.conditions.length > 1 && (
              <Button
                minimal
                small
                icon={'cross'}
                type={'button'}
                aria-label={intl.get('banking.rules.remove_condition')}
                title={intl.get('banking.rules.remove_condition')}
                onClick={() => handleRemoveCondition(index)}
                style={{ alignSelf: 'flex-end' }}
              />
            )}
          </Group>
        ))}
      </Stack>

      <Button
        minimal
        small
        intent={Intent.PRIMARY}
        type={'button'}
        onClick={handleAddConditionBtnClick}
        disabled={values.conditions.length >= MAX_RULE_CONDITIONS}
        style={{ marginTop: 8 }}
      >
        {intl.get('banking.rules.add_condition')}
      </Button>
    </Box>
  );
}

/**
 * Rule form actions buttons.
 * @returns {React.ReactNode}
 */
function RuleFormActionsRoot({
  // #withDialogActions
  closeDialog,
}: WithDialogActionsProps) {
  const { isSubmitting, submitForm } = useFormikContext<RuleFormValues>();

  const handleSaveBtnClick = () => {
    submitForm();
  };
  const handleCancelBtnClick = () => {
    closeDialog(DialogsName.BankRuleForm);
  };

  return (
    <Box className={Classes.DIALOG_FOOTER}>
      <Box className={Classes.DIALOG_FOOTER_ACTIONS}>
        <Button onClick={handleCancelBtnClick}>{intl.get('cancel')}</Button>
        <Button
          type="submit"
          intent={Intent.PRIMARY}
          loading={isSubmitting}
          onClick={handleSaveBtnClick}
          style={{ minWidth: 100 }}
        >
          {intl.get('save')}
        </Button>
      </Box>
    </Box>
  );
}

const RuleFormActions = R.compose(withDialogActions)(RuleFormActionsRoot);

function RuleApplyIfTransactionTypeField() {
  const { setFieldValue } = useFormikContext<RuleFormValues>();

  const handleItemChange = useCallback(
    (item: any) => {
      setFieldValue('applyIfTransactionType', item.value);
      setFieldValue('assignCategory', '');
      setFieldValue('assignAccountId', '');
    },
    [setFieldValue],
  );

  return (
    <FFormGroup
      name={'applyIfTransactionType'}
      label={intl.get('banking.rules.field.apply_to_transactions')}
      style={{ maxWidth: 350 }}
    >
      <FSelect
        name={'applyIfTransactionType'}
        items={getTransactionTypeOptions()}
        popoverProps={{ minimal: true }}
        onItemChange={handleItemChange}
      />
    </FFormGroup>
  );
}

function RuleAssignCategoryField() {
  const { values, setFieldValue } = useFormikContext<RuleFormValues>();

  // Retrieves the transaction types if it is deposit or withdrawal.
  const transactionTypes = useMemo(
    () =>
      values?.applyIfTransactionType === 'deposit'
        ? MoneyInOptions
        : MoneyOutOptions,
    [values?.applyIfTransactionType],
  );

  // Handles the select item change.
  const handleItemChange = useCallback(
    (item: any) => {
      setFieldValue('assignCategory', item.value);
      setFieldValue('assignAccountId', '');
    },
    [setFieldValue],
  );

  return (
    <FFormGroup
      name={'assignCategory'}
      label={intl.get('transaction_type')}
      // Не обязателен: без него вид выводится из направления денег
      // (поступление — прочий доход, списание — прочий расход).
      style={{ maxWidth: 300 }}
    >
      <FSelect
        name={'assignCategory'}
        items={transactionTypes}
        popoverProps={{ minimal: true }}
        valueAccessor={'value'}
        textAccessor={'name'}
        onItemChange={handleItemChange}
      />
    </FFormGroup>
  );
}

function RuleAssignCategoryAccountField() {
  const { values } = useFormikContext<RuleFormValues>();
  const { accounts } = useRuleFormDialogBoot();

  const accountRoot = useMemo(
    () => getAccountRootFromMoneyCategory(values.assignCategory),
    [values.assignCategory],
  );

  return (
    <FFormGroup
      name={'assignAccountId'}
      label={intl.get('banking.rules.field.account_category')}
      labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
      style={{ maxWidth: 300 }}
    >
      <AccountsSelect
        name={'assignAccountId'}
        items={accounts}
        filterByRootTypes={accountRoot}
      />
    </FFormGroup>
  );
}

/** Тип правила (FT-030…FT-032 ТЗ-3). */
function RuleTypeField() {
  return (
    <FFormGroup
      name={'ruleType'}
      label={intl.get('banking.rules.field.rule_type')}
      style={{ maxWidth: 350 }}
    >
      <FSelect
        name={'ruleType'}
        items={getRuleTypeOptions()}
        popoverProps={{ minimal: true }}
      />
    </FFormGroup>
  );
}

/** Что делает правило — у каждого типа свои поля. */
function RuleActionsByType() {
  const { values } = useFormikContext<RuleFormValues>();

  if (values.ruleType === 'split') return <RuleSplitLines />;
  if (values.ruleType === 'transfer') return <RuleTransferFields />;
  return (
    <>
      <RuleAssignCategoryField />
      <RuleAssignCategoryAccountField />
      <RuleAssignExtraFields />
    </>
  );
}

/** Контрагент и направление у «Заполнить поля» (FT-030). */
function RuleAssignExtraFields() {
  const { enabled: projectsOn, projects } = useRuleProjects();
  const { data: contacts } = useAutoCompleteContacts();

  return (
    <Group style={{ maxWidth: 600 }} align={'flex-start'}>
      <FFormGroup
        name={'assignContactId'}
        label={intl.get('banking.rules.field.assign_contact')}
        style={{ flex: '1 0' }}
      >
        <FSelect
          name={'assignContactId'}
          items={(contacts as any[]) ?? []}
          valueAccessor={'id'}
          textAccessor={'display_name'}
          labelAccessor={'code'}
          placeholder={intl.get('banking.rules.field.not_set')}
          popoverProps={{ minimal: true }}
        />
      </FFormGroup>
      {projectsOn && (
        <FFormGroup
          name={'assignProjectId'}
          label={intl.get('banking.rules.field.assign_project')}
          style={{ flex: '1 0' }}
        >
          <ProjectsSelect
            name={'assignProjectId'}
            projects={projects}
            placeholder={intl.get('banking.rules.field.not_set')}
          />
        </FFormGroup>
      )}
    </Group>
  );
}

/** Строки разбиения (FT-031): статья, направление, доля; в сумме 100 %. */
function RuleSplitLines() {
  const { values, setFieldValue } = useFormikContext<RuleFormValues>();
  const { data: articles } = useManagementArticles();
  const { enabled: projectsOn, projects } = useRuleProjects();
  const total = splitSharesTotal(values.splits);
  const left = Math.round((100 - total) * 10000) / 10000;

  return (
    <Box style={{ marginBottom: 15 }}>
      <p className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
        {intl.get('banking.rules.split.hint')}
      </p>
      <Stack spacing={10}>
        {values.splits.map((_line, index) => (
          <Group key={index} style={{ width: 560 }} align={'flex-end'}>
            <FFormGroup
              name={`splits[${index}].articleId`}
              label={intl.get('banking.rules.split.article')}
              style={{ marginBottom: 0, flex: '2 0' }}
            >
              <FSelect
                name={`splits[${index}].articleId`}
                items={(articles as any[]) ?? []}
                valueAccessor={'id'}
                textAccessor={'name'}
                popoverProps={{ minimal: true }}
              />
            </FFormGroup>
            {projectsOn && (
              <FFormGroup
                name={`splits[${index}].projectId`}
                label={intl.get('banking.rules.field.assign_project')}
                style={{ marginBottom: 0, flex: '2 0' }}
              >
                <ProjectsSelect
                  name={`splits[${index}].projectId`}
                  projects={projects}
                  placeholder={intl.get('banking.rules.field.not_set')}
                />
              </FFormGroup>
            )}
            <FFormGroup
              name={`splits[${index}].sharePercent`}
              label={intl.get('banking.rules.split.share')}
              style={{ marginBottom: 0, flex: '1 0' }}
            >
              <FInputGroup name={`splits[${index}].sharePercent`} inputMode={'decimal'} />
            </FFormGroup>
            {values.splits.length > 2 && (
              <Button
                minimal
                small
                icon={'cross'}
                type={'button'}
                aria-label={intl.get('banking.rules.split.remove')}
                title={intl.get('banking.rules.split.remove')}
                onClick={() =>
                  setFieldValue(
                    'splits',
                    values.splits.filter((__, i) => i !== index),
                  )
                }
              />
            )}
          </Group>
        ))}
      </Stack>
      <Group style={{ marginTop: 8 }} spacing={12}>
        <Button
          minimal
          small
          intent={Intent.PRIMARY}
          type={'button'}
          disabled={values.splits.length >= 20}
          onClick={() => setFieldValue('splits', [...values.splits, newSplitLine()])}
        >
          {intl.get('banking.rules.split.add')}
        </Button>
        <span
          style={{ fontSize: 12 }}
          className={left === 0 ? Classes.TEXT_MUTED : 'text-danger'}
        >
          {left === 0
            ? intl.get('banking.rules.split.total_ok')
            : intl.get('banking.rules.split.left', { left })}
        </span>
      </Group>
    </Box>
  );
}

/** «Преобразовать в перевод» (FT-032): куда уходят деньги. */
function RuleTransferFields() {
  const { accounts } = useRuleFormDialogBoot();
  return (
    <>
      <p className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
        {intl.get('banking.rules.transfer.hint')}
      </p>
      <FFormGroup
        name={'transferToAccountId'}
        label={intl.get('banking.rules.field.transfer_to_account')}
        labelInfo={<Tag minimal>{intl.get('required')}</Tag>}
        style={{ maxWidth: 350 }}
      >
        <AccountsSelect
          name={'transferToAccountId'}
          items={accounts}
          filterByTypes={['cash', 'bank', 'credit-card']}
        />
      </FFormGroup>
    </>
  );
}

