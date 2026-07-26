import {
  ruBold,
  ruCell,
  ruCellNoBorder,
  ruPage,
  ruTable,
} from './_ruFormStyles';

/**
 * Российская печатная форма «Акт выполненных работ (оказанных услуг)».
 *
 * Тексты формы намеренно фиксированные русские (не i18n): это нормативная
 * печатная форма РФ, её язык не зависит от языка интерфейса организации.
 */

export interface RuActLine {
  index: number;
  /** Наименование работы (услуги) */
  title: string;
  quantity: string;
  /** Единица измерения */
  unit?: string;
  /** Цена за единицу, формат «1 500,00» */
  price: string;
  /** Сумма по строке */
  amount: string;
}

export interface RuActPaperTemplateProps {
  documentNumber?: string;
  /** «26 июля 2026 г.» */
  documentDate?: string;

  /** «ООО Ромашка, ИНН …, КПП …, адрес…» */
  sellerLine?: string;
  buyerLine?: string;

  lines?: RuActLine[];

  /** Итого, формат «1 500,00» */
  subtotal?: string;
  /** «В том числе НДС» | «Без налога (НДС)» */
  vatLabel?: string;
  vatAmount?: string;
  /** Всего к оплате */
  total?: string;

  itemsCount?: number;
  /** «Одна тысяча пятьсот рублей 00 копеек» */
  totalInWords?: string;

  /** Текст о приёмке; дефолт — типовая формулировка */
  acceptanceText?: string;
}

const DEFAULT_ACCEPTANCE_TEXT =
  'Вышеперечисленные работы (услуги) выполнены полностью и в срок. ' +
  'Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.';

export function RuActPaperTemplate({
  documentNumber = '',
  documentDate = '',
  sellerLine = '',
  buyerLine = '',
  lines = [],
  subtotal = '',
  vatLabel = 'Без налога (НДС)',
  vatAmount,
  total = '',
  itemsCount = 0,
  totalInWords = '',
  acceptanceText = DEFAULT_ACCEPTANCE_TEXT,
}: RuActPaperTemplateProps) {
  return (
    <div style={ruPage}>
      {/* Заголовок */}
      <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
        Акт № {documentNumber} от {documentDate}
      </h1>
      <div style={{ borderBottom: '2px solid #000', marginBottom: 16 }} />

      {/* Стороны */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 120, ...ruBold }}>
              Исполнитель:
            </td>
            <td style={ruCellNoBorder}>{sellerLine}</td>
          </tr>
          <tr>
            <td style={{ ...ruCellNoBorder, ...ruBold }}>Заказчик:</td>
            <td style={ruCellNoBorder}>{buyerLine}</td>
          </tr>
        </tbody>
      </table>

      {/* Позиции */}
      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...ruCell, ...ruBold, width: '5%' }}>№</th>
            <th style={{ ...ruCell, ...ruBold }}>
              Наименование работ (услуг)
            </th>
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
              Всего:
            </td>
            <td style={{ ...ruCellNoBorder, textAlign: 'right', ...ruBold }}>
              {total}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Сумма прописью */}
      <div style={{ marginTop: 12 }}>
        Всего оказано услуг (выполнено работ) {itemsCount}, на сумму {total} руб.
      </div>
      <div style={{ ...ruBold, marginBottom: 16 }}>{totalInWords}</div>

      {/* Приёмка */}
      <div style={{ marginBottom: 24 }}>{acceptanceText}</div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: 28 }} />

      {/* Подписи */}
      <table style={{ ...ruTable, tableLayout: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 120, ...ruBold }}>
              Исполнитель
            </td>
            <td
              style={{
                ...ruCellNoBorder,
                width: 200,
                borderBottom: '1px solid #000',
              }}
            />
            <td style={{ ...ruCellNoBorder, width: 40 }} />
            <td style={{ ...ruCellNoBorder, width: 120, ...ruBold }}>
              Заказчик
            </td>
            <td style={{ ...ruCellNoBorder, borderBottom: '1px solid #000' }} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
