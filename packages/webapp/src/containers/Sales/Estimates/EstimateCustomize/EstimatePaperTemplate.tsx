import intl from 'react-intl-universal';
import { Classes, Text } from '@blueprintjs/core';
import { Box, Group, Stack } from '@/components';
import {
  PaperTemplate,
  PaperTemplateProps,
} from '../../Invoices/InvoiceCustomize/PaperTemplate';
import {
  DefaultPdfTemplateTerms,
  DefaultPdfTemplateItemDescription,
  DefaultPdfTemplateStatement,
  DefaultPdfTemplateItemName,
  DefaultPdfTemplateAddressBilledTo,
  DefaultPdfTemplateAddressBilledFrom,
} from '@/constants/PdfTemplates';

export interface EstimatePaperTemplateProps extends PaperTemplateProps {
  // # Company
  showCompanyLogo?: boolean;
  companyLogoUri?: string;

  // # Estimate number
  estimateNumebr?: string;
  estimateNumberLabel?: string;
  showEstimateNumber?: boolean;

  // # Expiration date
  expirationDate?: string;
  showExpirationDate?: boolean;
  expirationDateLabel?: string;

  // # Estimate date
  estimateDateLabel?: string;
  showEstimateDate?: boolean;
  estimateDate?: string;

  // # Customer name
  companyName?: string;

  // Address
  showCustomerAddress?: boolean;
  customerAddress?: string;

  showCompanyAddress?: boolean;
  companyAddress?: string;
  billedToLabel?: string;

  // Totals
  total?: string;
  showTotal?: boolean;
  totalLabel?: string;

  subtotal?: string;
  showSubtotal?: boolean;
  subtotalLabel?: string;

  // # Statements
  showCustomerNote?: boolean;
  customerNote?: string;
  customerNoteLabel?: string;

  // # Terms & conditions
  showTermsConditions?: boolean;
  termsConditions?: string;
  termsConditionsLabel?: string;

  lines?: Array<{
    item: string;
    description: string;
    rate: string;
    quantity: string;
    total: string;
  }>;

  // Lines
  lineItemLabel?: string,
  lineQuantityLabel?: string,
  lineRateLabel?: string,
  lineTotalLabel?: string,

}

export function EstimatePaperTemplate({
  primaryColor,
  secondaryColor,

  // # Company logo
  showCompanyLogo = true,
  companyLogoUri = '',

  companyName,

  // # Company address
  companyAddress = DefaultPdfTemplateAddressBilledFrom,
  showCompanyAddress = true,

  // # Customer address
  customerAddress = DefaultPdfTemplateAddressBilledTo,
  showCustomerAddress = true,
  billedToLabel = 'Плательщик',

  // # Total
  total = '1000,00 ₽',
  totalLabel = 'Итого',
  showTotal = true,

  // # Subtotal
  subtotal = '1000,00',
  subtotalLabel = 'Подытог',
  showSubtotal = true,

  // # Customer Note
  showCustomerNote = true,
  customerNote = DefaultPdfTemplateStatement,
  customerNoteLabel = 'Примечание для клиента',

  // # Terms & Conditions
  showTermsConditions = true,
  termsConditions = DefaultPdfTemplateTerms,
  termsConditionsLabel = 'Условия',

  lines = [
    {
      item: DefaultPdfTemplateItemName,
      description: DefaultPdfTemplateItemDescription,
      rate: '1',
      quantity: '1000',
      total: '1000,00 ₽',
    },
  ],

  // Estimate number
  showEstimateNumber = true,
  estimateNumberLabel = 'Смета №',
  estimateNumebr = '2026-0001',

  // Estimate date
  estimateDate = '03.09.2026',
  showEstimateDate = true,
  estimateDateLabel = 'Дата выставления',

  // Expiration date
  expirationDateLabel = 'Действует до',
  showExpirationDate = true,
  expirationDate = '03.09.2026',

  // Entries
  lineItemLabel = 'Позиция',
  lineQuantityLabel = 'Кол-во',
  lineRateLabel = 'Цена',
  lineTotalLabel = 'Сумма',

}: EstimatePaperTemplateProps) {
  return (
    <PaperTemplate primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <Stack spacing={24}>
        <Group align={'start'} spacing={10}>
          <Stack flex={1}>
            <PaperTemplate.BigTitle title={intl.get('resource_estimate_singular')} />

            <PaperTemplate.TermsList>
              {showEstimateNumber && (
                <PaperTemplate.TermsItem label={estimateNumberLabel}>
                  {estimateNumebr}
                </PaperTemplate.TermsItem>
              )}
              {showEstimateDate && (
                <PaperTemplate.TermsItem label={estimateDateLabel}>
                  {estimateDate}
                </PaperTemplate.TermsItem>
              )}
              {showExpirationDate && (
                <PaperTemplate.TermsItem label={expirationDateLabel}>
                  {expirationDate}
                </PaperTemplate.TermsItem>
              )}
            </PaperTemplate.TermsList>
          </Stack>

          {companyLogoUri && showCompanyLogo && (
            <PaperTemplate.Logo logoUri={companyLogoUri} />
          )}
        </Group>

        <PaperTemplate.AddressesGroup>
          {showCompanyAddress && (
            <PaperTemplate.Address>
              <Box dangerouslySetInnerHTML={{ __html: companyAddress }} />
            </PaperTemplate.Address>
          )}
          {showCustomerAddress && (
            <PaperTemplate.Address>
              <strong>{billedToLabel}</strong>
              <Box dangerouslySetInnerHTML={{ __html: customerAddress }} />
            </PaperTemplate.Address>
          )}
        </PaperTemplate.AddressesGroup>

        <Stack spacing={0}>
          <PaperTemplate.Table
            columns={[
              {
                label: lineItemLabel,
                accessor: (data) => (
                  <Stack spacing={2}>
                    <Text>{data.item}</Text>
                    <Text
                      className={Classes.TEXT_MUTED}
                      style={{ fontSize: 12 }}
                    >
                      {data.description}
                    </Text>
                  </Stack>
                ),
              },
              { label: lineQuantityLabel, accessor: 'quantity' },
              { label: lineRateLabel, accessor: 'rate', align: 'right' },
              { label: lineTotalLabel, accessor: 'total', align: 'right' },
            ]}
            data={lines}
          />
          <PaperTemplate.Totals>
            {showSubtotal && (
              <PaperTemplate.TotalLine
                label={subtotalLabel}
                amount={subtotal}
              />
            )}
            {showTotal && (
              <PaperTemplate.TotalLine label={totalLabel} amount={total} />
            )}
          </PaperTemplate.Totals>
        </Stack>

        <Stack spacing={0}>
          {showCustomerNote && (
            <PaperTemplate.Statement label={customerNoteLabel}>
              {customerNote}
            </PaperTemplate.Statement>
          )}
          {showTermsConditions && (
            <PaperTemplate.Statement label={termsConditionsLabel}>
              {termsConditions}
            </PaperTemplate.Statement>
          )}
        </Stack>
      </Stack>
    </PaperTemplate>
  );
}
