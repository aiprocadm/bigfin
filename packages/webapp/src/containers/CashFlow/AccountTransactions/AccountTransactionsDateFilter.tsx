// @ts-nocheck
import intl from 'react-intl-universal';
import { formatOrganizationDate } from '@/utils/organizationDate';
import { Button, FormGroup, Intent, Position } from '@blueprintjs/core';
import * as Yup from 'yup';
import moment from 'moment';
import { Form, Formik, FormikConfig, useFormikContext } from 'formik';
import {
  FDateInput,
  FFormGroup,
  FSelect,
  Group,
  Icon,
  Stack,
} from '@/components';

const defaultValues = {
  period: 'all_dates',
  fromDate: '',
  toDate: '',
};

// Схема строится при вызове: словарь к моменту импорта модуля ещё не загружен.
const getValidationSchema = () =>
  Yup.object().shape({
    fromDate: Yup.date()
      .nullable()
      .required(intl.get('banking.date_filter.from_required'))
      .max(Yup.ref('toDate'), intl.get('banking.date_filter.from_after_to')),
    toDate: Yup.date()
      .nullable()
      .required(intl.get('banking.date_filter.to_required'))
      .min(Yup.ref('fromDate'), intl.get('banking.date_filter.to_before_from')),
  });

interface AccountTransactionsDateFilterFormValues {
  period: string;
  fromDate: string;
  toDate: string;
}

interface UncategorizedTransactionsDateFilterProps {
  initialValues?: AccountTransactionsDateFilterFormValues;
  onSubmit?: FormikConfig<AccountTransactionsDateFilterFormValues>['onSubmit'];
}

export function AccountTransactionsDateFilterForm({
  initialValues = {},
  onSubmit,
}: UncategorizedTransactionsDateFilterProps) {
  const handleSubmit = (values, bag) => {
    return onSubmit && onSubmit(values, bag);
  };

  const formInitialValues = {
    ...defaultValues,
    ...initialValues,
  };

  return (
    <Formik
      initialValues={formInitialValues}
      onSubmit={handleSubmit}
      validationSchema={getValidationSchema()}
    >
      <Form>
        <Stack spacing={15}>
          <Group spacing={10}>
            <AccountTransactionDatePeriodField />

            <FFormGroup
              name={'fromDate'}
              label={intl.get('from_date')}
              style={{ marginBottom: 0, flex: '1' }}
            >
              <FDateInput
                name={'fromDate'}
                popoverProps={{ position: Position.BOTTOM, minimal: true }}
                formatDate={formatOrganizationDate}
                parseDate={(str) => new Date(str)}
                inputProps={{
                  fill: true,
                  placeholder: intl.get('date_period.placeholder'),
                  leftElement: <Icon icon={'date-range'} />,
                }}
              />
            </FFormGroup>

            <FormGroup
              label={intl.get('to_date')}
              name={'toDate'}
              style={{ marginBottom: 0, flex: '1' }}
            >
              <FDateInput
                name={'toDate'}
                popoverProps={{ position: Position.BOTTOM, minimal: true }}
                formatDate={formatOrganizationDate}
                parseDate={(str) => new Date(str)}
                inputProps={{
                  fill: true,
                  placeholder: intl.get('date_period.placeholder'),
                  leftElement: <Icon icon={'date-range'} />,
                }}
              />
            </FormGroup>
          </Group>

          <AccountTransactionsDateFilterFooter />
        </Stack>
      </Form>
    </Formik>
  );
}

function AccountTransactionsDateFilterFooter() {
  const { submitForm, setValues } = useFormikContext();

  const handleFilterBtnClick = () => {
    submitForm();
  };
  const handleClearBtnClick = () => {
    setValues({
      ...defaultValues,
    });
    submitForm();
  };

  return (
    <Group spacing={10}>
      <Button
        small
        intent={Intent.PRIMARY}
        onClick={handleFilterBtnClick}
        style={{ minWidth: 75 }}
      >
        {intl.get('filter')}
      </Button>

      <Button
        intent={Intent.DANGER}
        small
        onClick={handleClearBtnClick}
        minimal
      >
        {intl.get('clear')}
      </Button>
    </Group>
  );
}

function AccountTransactionDatePeriodField() {
  const { setFieldValue } = useFormikContext();

  const handleItemChange = (item) => {
    const { fromDate, toDate } = getDateRangePeriod(item.value);

    setFieldValue('fromDate', fromDate);
    setFieldValue('toDate', toDate);
    setFieldValue('period', item.value);
  };

  return (
    <FFormGroup
      name={'period'}
      label={intl.get('date')}
      style={{ marginBottom: 0, flex: '0 28%' }}
    >
      <FSelect
        name={'period'}
        items={getPeriodOptions()}
        onItemSelect={handleItemChange}
        popoverProps={{ captureDismiss: true }}
      />
    </FFormGroup>
  );
}

// Список строится при вызове (словарь при импорте ещё пуст). Здесь же убран
// дублировавшийся пункт «Last month» — он стоял в списке дважды.
const getPeriodOptions = () => [
  { text: intl.get('date_period.all_dates'), value: 'all_dates' },
  { text: intl.get('date_period.custom'), value: 'custom' },
  { text: intl.get('today'), value: 'today' },
  { text: intl.get('date_period.yesterday'), value: 'yesterday' },
  { text: intl.get('this_week'), value: 'this_week' },
  { text: intl.get('this_year'), value: 'this_year' },
  { text: intl.get('this_month'), value: 'this_month' },
  { text: intl.get('date_period.last_week'), value: 'last_week' },
  { text: intl.get('date_period.last_year'), value: 'last_year' },
  { text: intl.get('date_period.last_month'), value: 'last_month' },
];

const getDateRangePeriod = (period: string) => {
  switch (period) {
    case 'today':
      return {
        fromDate: moment().startOf('day').toDate(),
        toDate: moment().endOf('day').toDate(),
      };
    case 'yesterday':
      return {
        fromDate: moment().subtract(1, 'days').startOf('day').toDate(),
        toDate: moment().subtract(1, 'days').endOf('day').toDate(),
      };
    case 'this_week':
      return {
        fromDate: moment().startOf('week').toDate(),
        toDate: moment().endOf('week').toDate(),
      };
    case 'this_month':
      return {
        fromDate: moment().startOf('month').toDate(),
        toDate: moment().endOf('month').toDate(),
      };
    case 'this_year':
      return {
        fromDate: moment().startOf('year').toDate(),
        toDate: moment().endOf('year').toDate(),
      };
    case 'last_week':
      return {
        fromDate: moment().subtract(1, 'weeks').startOf('week').toDate(),
        toDate: moment().subtract(1, 'weeks').endOf('week').toDate(),
      };
    case 'last_month':
      return {
        fromDate: moment().subtract(1, 'months').startOf('month').toDate(),
        toDate: moment().subtract(1, 'months').endOf('month').toDate(),
      };
    case 'last_year':
      return {
        fromDate: moment().subtract(1, 'years').startOf('year').toDate(),
        toDate: moment().subtract(1, 'years').endOf('year').toDate(),
      };
    case 'all_dates':
    case 'custom':
    default:
      return { fromDate: null, toDate: null };
  }
};
