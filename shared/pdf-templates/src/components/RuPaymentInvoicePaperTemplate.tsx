import {
  ruBold,
  ruCell,
  ruCellNoBorder,
  ruPage,
  ruSmall,
  ruTable,
} from './_ruFormStyles';

/**
 * Российская печатная форма «Счёт на оплату».
 *
 * Тексты формы намеренно фиксированные русские (не i18n): это нормативная
 * печатная форма РФ, её язык не зависит от языка интерфейса организации.
 * Вёрстка — обычные <table> с инлайн-стилями: форма не поддерживает
 * пользовательский брендинг (цвета/лого), в отличие от Invoice-шаблона.
 */

export interface RuPaymentInvoiceLine {
  index: number;
  /** Наименование товара (работы, услуги) */
  title: string;
  quantity: string;
  /** Единица измерения (шт, усл. и т.п.) */
  unit?: string;
  /** Цена за единицу, формат «1 500,00» */
  price: string;
  /** Сумма по строке */
  amount: string;
}

export interface RuPaymentInvoicePaperTemplateProps {
  // Подписанты: пустые значения оставляют линии подписи пустыми.
  signerDirectorName?: string;
  signerDirectorPosition?: string;
  signerAccountantName?: string;
  // Шапка с банковскими реквизитами получателя (поставщика).
  bankName?: string;
  bankBik?: string;
  bankCorrespondentAccount?: string;
  bankAccount?: string;
  sellerInn?: string;
  sellerKpp?: string;
  /** Получатель платежа (название организации) */
  sellerName?: string;

  // Документ.
  documentNumber?: string;
  /** Дата в формате «26 июля 2026 г.» либо любом читаемом */
  documentDate?: string;

  // Стороны.
  /** «ООО Ромашка, ИНН 7707083893, КПП 770701001, адрес…» — собирается сервером */
  sellerLine?: string;
  buyerLine?: string;

  lines?: RuPaymentInvoiceLine[];

  /** Итого, формат «1 500,00» */
  subtotal?: string;
  /** Строка НДС: сумма при наличии налога, иначе не задана */
  vatAmount?: string;
  /** Подпись строки НДС: «В том числе НДС» | «Без налога (НДС)» */
  vatLabel?: string;
  /** Всего к оплате */
  total?: string;

  /** Кол-во наименований */
  itemsCount?: number;
  /** «Одна тысяча пятьсот рублей 00 копеек» */
  totalInWords?: string;
}

export function RuPaymentInvoicePaperTemplate({
  signerDirectorName = '',
  signerDirectorPosition = '',
  signerAccountantName = '',
  bankName = '',
  bankBik = '',
  bankCorrespondentAccount = '',
  bankAccount = '',
  sellerInn = '',
  sellerKpp = '',
  sellerName = '',
  documentNumber = '',
  documentDate = '',
  sellerLine = '',
  buyerLine = '',
  lines = [],
  subtotal = '',
  vatAmount,
  vatLabel = 'Без налога (НДС)',
  total = '',
  itemsCount = 0,
  totalInWords = '',
}: RuPaymentInvoicePaperTemplateProps) {
  return (
    <div style={ruPage}>
      {/* Банковские реквизиты получателя */}
      <table style={ruTable}>
        <tbody>
          <tr>
            <td colSpan={2} rowSpan={2} style={{ ...ruCell, width: '55%' }}>
              {bankName}
              <div style={ruSmall}>Банк получателя</div>
            </td>
            <td style={{ ...ruCell, width: '10%' }}>БИК</td>
            <td style={{ ...ruCell, width: '35%' }}>{bankBik}</td>
          </tr>
          <tr>
            <td style={ruCell}>Сч. №</td>
            <td style={ruCell}>{bankCorrespondentAccount}</td>
          </tr>
          <tr>
            <td style={{ ...ruCell, width: '27%' }}>ИНН {sellerInn}</td>
            <td style={{ ...ruCell, width: '28%' }}>КПП {sellerKpp}</td>
            <td rowSpan={2} style={ruCell}>
              Сч. №
            </td>
            <td rowSpan={2} style={ruCell}>
              {bankAccount}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={ruCell}>
              {sellerName}
              <div style={ruSmall}>Получатель</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Заголовок */}
      <h1
        style={{
          margin: '24px 0 6px',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        Счёт на оплату № {documentNumber} от {documentDate}
      </h1>
      <div style={{ borderBottom: '2px solid #000', marginBottom: 16 }} />

      {/* Стороны */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 160, ...ruBold }}>
              Поставщик (Исполнитель):
            </td>
            <td style={ruCellNoBorder}>{sellerLine}</td>
          </tr>
          <tr>
            <td style={{ ...ruCellNoBorder, ...ruBold }}>
              Покупатель (Заказчик):
            </td>
            <td style={ruCellNoBorder}>{buyerLine}</td>
          </tr>
        </tbody>
      </table>

      {/* Позиции */}
      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...ruCell, ...ruBold, width: '5%' }}>№</th>
            <th style={{ ...ruCell, ...ruBold }}>Товары (работы, услуги)</th>
            <th style={{ ...ruCell, ...ruBold, width: '10%' }}>Кол-во</th>
            <th style={{ ...ruCell, ...ruBold, width: '8%' }}>Ед.</th>
            <th style={{ ...ruCell, ...ruBold, width: '14%' }}>Цена</th>
            <th style={{ ...ruCell, ...ruBold, width: '15%' }}>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.index}>
              <td style={{ ...ruCell, textAlign: 'center' }}>{line.index}</td>
              <td style={ruCell}>{line.title}</td>
              <td style={{ ...ruCell, textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ ...ruCell, textAlign: 'center' }}>{line.unit}</td>
              <td style={{ ...ruCell, textAlign: 'right' }}>{line.price}</td>
              <td style={{ ...ruCell, textAlign: 'right' }}>{line.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Итоги */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', ...ruBold }}>
              Итого:
            </td>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', width: 120 }}>
              {subtotal}
            </td>
          </tr>
          <tr>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', ...ruBold }}>
              {vatLabel}:
            </td>
            <td style={{ ...ruCellNoBorder, textAlign: 'right' }}>
              {vatAmount ?? '—'}
            </td>
          </tr>
          <tr>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', ...ruBold }}>
              Всего к оплате:
            </td>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', ...ruBold }}>
              {total}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Сумма прописью */}
      <div style={{ marginTop: 12 }}>
        Всего наименований {itemsCount}, на сумму {total} руб.
      </div>
      <div style={{ ...ruBold, marginBottom: 24 }}>{totalInWords}</div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: 28 }} />

      {/* Подписи */}
      <table style={{ ...ruTable, tableLayout: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 120, ...ruBold }}>
              {signerDirectorPosition || 'Руководитель'}
            </td>
            <td
              style={{
                ...ruCellNoBorder,
                width: 200,
                borderBottom: '1px solid #000',
                textAlign: 'center',
              }}
            >
              {signerDirectorName}
            </td>
            <td style={{ ...ruCellNoBorder, width: 40 }} />
            <td style={{ ...ruCellNoBorder, width: 120, ...ruBold }}>
              Бухгалтер
            </td>
            <td
              style={{
                ...ruCellNoBorder,
                borderBottom: '1px solid #000',
                textAlign: 'center',
              }}
            >
              {signerAccountantName}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
