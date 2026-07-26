import { CSSProperties } from 'react';
import { ruBold, ruCellNoBorder, ruPage, ruSmall, ruTable } from './_ruFormStyles';

/**
 * Российская печатная форма «Счёт-фактура» (приложение № 1 к постановлению
 * Правительства РФ от 26.12.2011 № 1137) — строки 1…8 и графы 1…14,
 * включая графы прослеживаемости.
 *
 * Состав бланка зависит от даты документа: постановление Правительства РФ
 * от 23.01.2026 № 26 (применяется с 01.04.2026) добавило строку (5б),
 * изменило подпись графы 14 и текст блока подписи ИП. Переключает
 * проп `isRedaction2026` — он считается от даты документа, а не от
 * текущей даты, иначе задним числом сломается печать старых счетов.
 *
 * Печатается в альбомной ориентации. Тексты формы фиксированные русские.
 *
 * Графы, которые сознательно не заполняются (нет данных в системе):
 * код вида товара, единица измерения, акциз, страна происхождения,
 * номер декларации и все графы прослеживаемости.
 */

/**
 * Формулировки бланка, сверенные по вторичным источникам.
 * Собраны в один словарь, чтобы правка по первоисточнику была точечной.
 * TODO: сверить дословно с текстом постановлений на pravo.gov.ru.
 */
const LABELS = {
  row5: 'К платёжно-расчётному документу №',
  row5a: 'Документ об отгрузке: наименование, №',
  row5b:
    'К счёту-фактуре (счетам-фактурам), выставленному (выставленным) при ' +
    'получении оплаты, частичной оплаты или иных платежей в счёт предстоящих ' +
    'поставок товаров (выполнения работ, оказания услуг), передачи ' +
    'имущественных прав',
  column5: 'Стоимость товаров (работ, услуг), имущественных прав без налога - всего',
  column9: 'Стоимость товаров (работ, услуг), имущественных прав с налогом - всего',
  column14Legacy:
    'Стоимость товара, подлежащего прослеживаемости, без налога на ' +
    'добавленную стоимость, в рублях',
  column14From2026:
    'Стоимость товара, подлежащего прослеживаемости, без налога на ' +
    'добавленную стоимость, в рублях и копейках',
  soleProprietorLegacy:
    '(реквизиты свидетельства о государственной регистрации ' +
    'индивидуального предпринимателя)',
  soleProprietorFrom2026:
    '(основной государственный регистрационный номер индивидуального ' +
    'предпринимателя и дата присвоения такого номера)',
};

export interface RuInvoiceFacturaLine {
  index: number;
  /** Гр. 1а — наименование товара (работ, услуг) */
  title: string;
  /** Гр. 3 — количество (объём) */
  quantity: string;
  /** Гр. 4 — цена за единицу без налога */
  price: string;
  /** Гр. 5 — стоимость без налога */
  amountExclVat: string;
  /** Гр. 7 — «20%» либо «Без НДС» */
  vatRate: string;
  /** Гр. 8 — сумма налога либо «Без НДС» */
  vatAmount: string;
  /** Гр. 9 — стоимость с налогом */
  amountInclVat: string;
}

export interface RuInvoiceFacturaPaperTemplateProps {
  documentNumber?: string;
  /** «26.07.2026» */
  documentDate?: string;
  correctionNumber?: string;
  correctionDate?: string;

  sellerName?: string;
  sellerAddress?: string;
  sellerInnKpp?: string;

  /** Строка (3): «он же» для товаров, прочерк для услуг */
  shipperLine?: string;
  /** Строка (4) */
  consigneeLine?: string;
  /** Строка (5) */
  paymentDocument?: string;
  /** Строка (5а) */
  shipmentDocument?: string;
  /** Строка (5б) — только для документов от 01.04.2026 */
  advanceInvoice?: string;

  /**
   * Бланк в редакции постановления № 26, применяемой с 01.04.2026:
   * появляется строка (5б), меняются подпись графы 14 и блок подписи ИП.
   */
  isRedaction2026?: boolean;

  buyerName?: string;
  buyerAddress?: string;
  buyerInnKpp?: string;

  /** Строка (7) */
  currencyLine?: string;
  /** Строка (8) */
  govContractId?: string;

  lines?: RuInvoiceFacturaLine[];

  totalAmountExclVat?: string;
  totalVatAmount?: string;
  totalAmountInclVat?: string;

  /** У ИП вместо двух подписей печатается один блок с ОГРНИП. */
  isSoleProprietor?: boolean;
  soleProprietorOgrn?: string;
}

const DASH = '—';
const CROSS = 'Х';
const NO_EXCISE = 'без акциза';

/** Номера граф в порядке следования — служебная строка под шапкой. */
const COLUMN_NUMBERS = [
  '1', '1а', '1б', '2', '2а', '3', '4', '5', '6', '7',
  '8', '9', '10', '10а', '11', '12', '12а', '13', '14',
];

const cell: CSSProperties = {
  border: '1px solid #000',
  padding: '1px 2px',
  fontSize: 7,
  verticalAlign: 'top',
  wordBreak: 'break-word',
};

const headCell: CSSProperties = {
  ...cell,
  ...ruBold,
  fontSize: 6,
  textAlign: 'center',
  verticalAlign: 'middle',
  // Перенос по словам; посреди слова — только если слово не влезает.
  wordBreak: 'normal',
  overflowWrap: 'break-word',
};

const numCell: CSSProperties = { ...cell, fontSize: 6, textAlign: 'center' };

const rowLabel: CSSProperties = {
  ...ruCellNoBorder,
  fontSize: 8,
  paddingRight: 6,
  whiteSpace: 'nowrap',
};

const rowValue: CSSProperties = {
  ...ruCellNoBorder,
  fontSize: 8,
  borderBottom: '1px solid #000',
  minHeight: 12,
};

/** Строка шапки счёта-фактуры: обозначение, подпись и значение на линии. */
function HeaderRow({
  code,
  label,
  value,
}: {
  code: string;
  label: string;
  value?: string;
}) {
  return (
    <tr>
      <td style={{ ...rowLabel, width: 26, textAlign: 'right' }}>({code})</td>
      <td style={rowLabel}>{label}</td>
      <td style={rowValue}>{value}</td>
    </tr>
  );
}

function SignatureBlock({ title, extraLabel, extraValue }: {
  title: string;
  extraLabel?: string;
  extraValue?: string;
}) {
  return (
    <div style={{ fontSize: 8 }}>
      <div style={{ ...ruBold, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'inline-block', width: 150, marginRight: 12 }}>
        <div style={{ borderBottom: '1px solid #000', minHeight: 12 }} />
        <div style={{ ...ruSmall, textAlign: 'center' }}>(подпись)</div>
      </div>
      <div style={{ display: 'inline-block', width: 180 }}>
        <div style={{ borderBottom: '1px solid #000', minHeight: 12 }} />
        <div style={{ ...ruSmall, textAlign: 'center' }}>(ф. и. о.)</div>
      </div>
      {extraLabel ? (
        <div style={{ marginTop: 8, width: 342 }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: 12 }}>
            {extraValue}
          </div>
          <div style={{ ...ruSmall, textAlign: 'center' }}>{extraLabel}</div>
        </div>
      ) : null}
    </div>
  );
}

export function RuInvoiceFacturaPaperTemplate({
  documentNumber = '',
  documentDate = '',
  correctionNumber = DASH,
  correctionDate = DASH,
  sellerName = '',
  sellerAddress = '',
  sellerInnKpp = '',
  shipperLine = DASH,
  consigneeLine = DASH,
  paymentDocument = DASH,
  shipmentDocument = DASH,
  advanceInvoice = DASH,
  isRedaction2026 = true,
  buyerName = '',
  buyerAddress = '',
  buyerInnKpp = '',
  currencyLine = 'Российский рубль, 643',
  govContractId = DASH,
  lines = [],
  totalAmountExclVat = '',
  totalVatAmount = '',
  totalAmountInclVat = '',
  isSoleProprietor = false,
  soleProprietorOgrn = '',
}: RuInvoiceFacturaPaperTemplateProps) {
  return (
    <div style={{ ...ruPage, padding: '16px 18px', fontSize: 8 }}>
      <div style={{ ...ruSmall, textAlign: 'right', marginBottom: 4 }}>
        Приложение № 1 к постановлению Правительства Российской Федерации
        <br />
        от 26 декабря 2011 г. № 1137
      </div>

      {/* Строки (1)…(8) */}
      <table
        style={{ ...ruTable, tableLayout: 'auto', width: 'auto', marginBottom: 8 }}
      >
        <tbody>
          <tr>
            <td style={{ ...rowLabel, width: 26, textAlign: 'right' }}>(1)</td>
            <td style={rowLabel}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                СЧЁТ-ФАКТУРА
              </span>{' '}
              №
            </td>
            <td style={{ ...rowValue, width: 120 }}>{documentNumber}</td>
            <td style={{ ...rowLabel, width: 20 }}>от</td>
            <td style={{ ...rowValue, width: 100 }}>{documentDate}</td>
          </tr>
          <tr>
            <td style={{ ...rowLabel, width: 26, textAlign: 'right' }}>(1а)</td>
            <td style={rowLabel}>ИСПРАВЛЕНИЕ №</td>
            <td style={rowValue}>{correctionNumber}</td>
            <td style={rowLabel}>от</td>
            <td style={rowValue}>{correctionDate}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 8 }}>
        <tbody>
          <HeaderRow code="2" label="Продавец" value={sellerName} />
          <HeaderRow code="2а" label="Адрес" value={sellerAddress} />
          <HeaderRow code="2б" label="ИНН/КПП продавца" value={sellerInnKpp} />
          <HeaderRow
            code="3"
            label="Грузоотправитель и его адрес"
            value={shipperLine}
          />
          <HeaderRow
            code="4"
            label="Грузополучатель и его адрес"
            value={consigneeLine}
          />
          <HeaderRow code="5" label={LABELS.row5} value={paymentDocument} />
          <HeaderRow code="5а" label={LABELS.row5a} value={shipmentDocument} />
          {isRedaction2026 ? (
            <HeaderRow code="5б" label={LABELS.row5b} value={advanceInvoice} />
          ) : null}
          <HeaderRow code="6" label="Покупатель" value={buyerName} />
          <HeaderRow code="6а" label="Адрес" value={buyerAddress} />
          <HeaderRow code="6б" label="ИНН/КПП покупателя" value={buyerInnKpp} />
          <HeaderRow
            code="7"
            label="Валюта: наименование, код"
            value={currencyLine}
          />
          <HeaderRow
            code="8"
            label="Идентификатор государственного контракта, договора (соглашения) (при наличии)"
            value={govContractId}
          />
        </tbody>
      </table>

      {/* Табличная часть: 19 граф */}
      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...headCell, width: '2%' }} rowSpan={2}>
              № п/п
            </th>
            <th style={{ ...headCell, width: '15%' }} rowSpan={2}>
              Наименование товара (описание выполненных работ, оказанных услуг),
              имущественного права
            </th>
            <th style={{ ...headCell, width: '4%' }} rowSpan={2}>
              Код вида товара
            </th>
            <th style={{ ...headCell, width: '7%' }} colSpan={2}>
              Единица измерения
            </th>
            <th style={{ ...headCell, width: '5%' }} rowSpan={2}>
              Количество (объём)
            </th>
            <th style={{ ...headCell, width: '6%' }} rowSpan={2}>
              Цена (тариф) за единицу измерения
            </th>
            <th style={{ ...headCell, width: '7%' }} rowSpan={2}>
              {LABELS.column5}
            </th>
            <th style={{ ...headCell, width: '5%' }} rowSpan={2}>
              В том числе сумма акциза
            </th>
            <th style={{ ...headCell, width: '4%' }} rowSpan={2}>
              Налоговая ставка
            </th>
            <th style={{ ...headCell, width: '7%' }} rowSpan={2}>
              Сумма налога, предъявляемая покупателю
            </th>
            <th style={{ ...headCell, width: '7%' }} rowSpan={2}>
              {LABELS.column9}
            </th>
            <th style={{ ...headCell, width: '9%' }} colSpan={2}>
              Страна происхождения товара
            </th>
            <th style={{ ...headCell, width: '6%' }} rowSpan={2}>
              Регистрационный номер декларации на товары или регистрационный
              номер партии товара, подлежащего прослеживаемости
            </th>
            <th style={{ ...headCell, width: '7%' }} colSpan={2}>
              Количественная единица измерения товара, используемая в целях
              осуществления прослеживаемости
            </th>
            <th style={{ ...headCell, width: '4%' }} rowSpan={2}>
              Количество товара, подлежащего прослеживаемости, в количественной
              единице измерения товара
            </th>
            <th style={{ ...headCell, width: '5%' }} rowSpan={2}>
              {isRedaction2026
                ? LABELS.column14From2026
                : LABELS.column14Legacy}
            </th>
          </tr>
          <tr>
            <th style={headCell}>код</th>
            <th style={headCell}>условное обозначение (национальное)</th>
            <th style={headCell}>цифровой код</th>
            <th style={headCell}>краткое наименование</th>
            <th style={headCell}>код</th>
            <th style={headCell}>условное обозначение</th>
          </tr>
          <tr>
            {COLUMN_NUMBERS.map((number) => (
              <th key={number} style={numCell}>
                {number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.index}>
              <td style={{ ...cell, textAlign: 'center' }}>{line.index}</td>
              <td style={cell}>{line.title}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.price}</td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {line.amountExclVat}
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>{NO_EXCISE}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{line.vatRate}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.vatAmount}</td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {line.amountInclVat}
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
            </tr>
          ))}

          <tr>
            <td colSpan={7} style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              Всего к оплате
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountExclVat}
            </td>
            {/* Графы 6 и 7 в итоговой строке объединены и содержат «Х». */}
            <td colSpan={2} style={{ ...cell, textAlign: 'center' }}>
              {CROSS}
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalVatAmount}
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountInclVat}
            </td>
            <td colSpan={7} style={cell} />
          </tr>
        </tbody>
      </table>

      {/* Подписи */}
      <div style={{ marginTop: 16 }}>
        {isSoleProprietor ? (
          <SignatureBlock
            title="Индивидуальный предприниматель или иное уполномоченное лицо"
            extraLabel={
              isRedaction2026
                ? LABELS.soleProprietorFrom2026
                : LABELS.soleProprietorLegacy
            }
            extraValue={soleProprietorOgrn}
          />
        ) : (
          <table style={{ ...ruTable, tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td
                  style={{ ...ruCellNoBorder, width: '50%', paddingRight: 20 }}
                >
                  <SignatureBlock title="Руководитель организации или иное уполномоченное лицо" />
                </td>
                <td style={{ ...ruCellNoBorder, width: '50%', paddingLeft: 20 }}>
                  <SignatureBlock title="Главный бухгалтер или иное уполномоченное лицо" />
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
