import { CSSProperties } from 'react';
import { ruBold, ruCellNoBorder, ruPage, ruSmall, ruTable } from './_ruFormStyles';

/**
 * Российская печатная форма «Товарная накладная» (унифицированная форма
 * ТОРГ-12, постановление Госкомстата России от 25.12.1998 № 132).
 *
 * Печатается в альбомной ориентации. Тексты формы фиксированные русские.
 *
 * Графы, которые сознательно не заполняются (нет данных в системе):
 * единица измерения и код по ОКЕИ, вид упаковки, количество мест,
 * масса брутто, коды ОКПО/ОКДП, транспортная накладная, вид операции.
 */

export interface RuTorg12Line {
  index: number;
  /** Гр. 2 — наименование товара */
  title: string;
  /** Гр. 3 — код товара из справочника */
  code: string;
  /** Гр. 10 — количество (масса нетто) */
  quantity: string;
  /** Гр. 11 — цена без НДС */
  price: string;
  /** Гр. 12 — сумма без НДС */
  amountExclVat: string;
  /** Гр. 13 — ставка НДС «20%» либо «Без НДС» */
  vatRate: string;
  /** Гр. 14 — сумма НДС либо «Без НДС» */
  vatAmount: string;
  /** Гр. 15 — сумма с НДС */
  amountInclVat: string;
}

export interface RuTorg12PaperTemplateProps {
  documentNumber?: string;
  /** «26.07.2026» */
  documentDate?: string;

  /** Организация-грузоотправитель: название, адрес, банковские реквизиты */
  shipperLine?: string;
  structuralUnit?: string;
  consigneeLine?: string;
  supplierLine?: string;
  payerLine?: string;

  /** «Счёт» либо «Договор» */
  basisName?: string;
  basisNumber?: string;
  basisDate?: string;

  lines?: RuTorg12Line[];

  totalQuantity?: string;
  totalAmountExclVat?: string;
  totalVatAmount?: string;
  totalAmountInclVat?: string;

  /**
   * Подпись денежных граф. Для рублёвого счёта — «руб. коп.», иначе код
   * валюты: подписывать валютные суммы рублями нельзя.
   */
  currencyLabel?: string;

  /** Число записей прописью: «две» */
  entriesCountInWords?: string;
  /** «Три тысячи шестьсот рублей 00 копеек» */
  totalInWords?: string;
}

const OKUD_CODE = '0330212';
const DASH = '—';
const CROSS = 'Х';

const cell: CSSProperties = {
  border: '1px solid #000',
  padding: '1px 3px',
  fontSize: 8,
  verticalAlign: 'top',
  wordBreak: 'break-word',
};

const headCell: CSSProperties = {
  ...cell,
  ...ruBold,
  fontSize: 7,
  textAlign: 'center',
  verticalAlign: 'middle',
};

const numCell: CSSProperties = { ...cell, fontSize: 7, textAlign: 'center' };

const codeCell: CSSProperties = {
  border: '1px solid #000',
  padding: '1px 4px',
  fontSize: 8,
  height: 14,
  minWidth: 70,
};

const codeLabel: CSSProperties = {
  ...ruCellNoBorder,
  fontSize: 8,
  textAlign: 'right',
  paddingRight: 4,
};

/** Подписываемая линия: значение над чертой, пояснение под ней. */
function FieldLine({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ borderBottom: '1px solid #000', minHeight: 13 }}>
        {value}
      </div>
      <div style={{ ...ruSmall, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

/** Пустая линия для подписи с пояснением под ней. */
function SignatureLine({ label, width }: { label: string; width?: number }) {
  return (
    <div style={{ display: 'inline-block', width: width ?? 150, marginRight: 8 }}>
      <div style={{ borderBottom: '1px solid #000', minHeight: 13 }} />
      <div style={{ ...ruSmall, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

export function RuTorg12PaperTemplate({
  documentNumber = '',
  documentDate = '',
  shipperLine = '',
  structuralUnit = '',
  consigneeLine = '',
  supplierLine = '',
  payerLine = '',
  basisName = 'Счёт',
  basisNumber = '',
  basisDate = '',
  lines = [],
  totalQuantity = '',
  totalAmountExclVat = '',
  totalVatAmount = '',
  totalAmountInclVat = '',
  currencyLabel = 'руб. коп.',
  entriesCountInWords = '',
  totalInWords = '',
}: RuTorg12PaperTemplateProps) {
  return (
    <div style={{ ...ruPage, padding: '18px 20px', fontSize: 9 }}>
      {/* Отсылка к унифицированной форме */}
      <div style={{ ...ruSmall, textAlign: 'right', marginBottom: 4 }}>
        Унифицированная форма № ТОРГ-12
        <br />
        Утверждена постановлением Госкомстата России от 25.12.98 № 132
      </div>

      {/* Шапка: слева реквизиты сторон, справа коды */}
      <table style={{ ...ruTable, tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: '72%', paddingRight: 12 }}>
              <FieldLine
                label="организация-грузоотправитель, адрес, телефон, факс, банковские реквизиты"
                value={shipperLine}
              />
              <FieldLine label="структурное подразделение" value={structuralUnit} />
              <FieldLine
                label="организация-грузополучатель, адрес, телефон, факс, банковские реквизиты"
                value={consigneeLine}
              />
              <FieldLine
                label="поставщик, адрес, телефон, факс, банковские реквизиты"
                value={supplierLine}
              />
              <FieldLine
                label="плательщик, адрес, телефон, факс, банковские реквизиты"
                value={payerLine}
              />
              <table style={{ ...ruTable, tableLayout: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ ...ruCellNoBorder, width: 70, fontSize: 8 }}>
                      Основание
                    </td>
                    <td style={ruCellNoBorder}>
                      <FieldLine label="договор, заказ-наряд" value={basisName} />
                    </td>
                    <td style={{ ...ruCellNoBorder, width: 50, fontSize: 8 }}>
                      номер
                    </td>
                    <td style={{ ...ruCellNoBorder, width: 90 }}>
                      <FieldLine label="" value={basisNumber} />
                    </td>
                    <td style={{ ...ruCellNoBorder, width: 40, fontSize: 8 }}>
                      дата
                    </td>
                    <td style={{ ...ruCellNoBorder, width: 90 }}>
                      <FieldLine label="" value={basisDate} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            <td style={{ ...ruCellNoBorder, width: '28%', verticalAlign: 'top' }}>
              <table style={{ ...ruTable, tableLayout: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={codeLabel} />
                    <td style={{ ...codeCell, ...ruBold, textAlign: 'center' }}>
                      Коды
                    </td>
                  </tr>
                  <tr>
                    <td style={codeLabel}>Форма по ОКУД</td>
                    <td style={{ ...codeCell, textAlign: 'center' }}>
                      {OKUD_CODE}
                    </td>
                  </tr>
                  <tr>
                    <td style={codeLabel}>по ОКПО</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>Вид деятельности по ОКДП</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>по ОКПО (грузополучатель)</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>по ОКПО (поставщик)</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>по ОКПО (плательщик)</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>Транспортная накладная, номер</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>дата</td>
                    <td style={codeCell} />
                  </tr>
                  <tr>
                    <td style={codeLabel}>Вид операции</td>
                    <td style={codeCell} />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Заголовок и номер документа */}
      <table style={{ ...ruTable, tableLayout: 'auto', margin: '10px 0 8px' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                ТОВАРНАЯ НАКЛАДНАЯ
              </div>
            </td>
            <td style={{ ...ruCellNoBorder, width: 220 }}>
              <table style={{ ...ruTable, tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ ...headCell, fontSize: 7 }}>Номер документа</td>
                    <td style={{ ...headCell, fontSize: 7 }}>Дата составления</td>
                  </tr>
                  <tr>
                    <td style={{ ...cell, textAlign: 'center' }}>
                      {documentNumber}
                    </td>
                    <td style={{ ...cell, textAlign: 'center' }}>
                      {documentDate}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Табличная часть: 15 граф */}
      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...headCell, width: '3%' }} rowSpan={2}>
              Номер по порядку
            </th>
            <th style={{ ...headCell, width: '26%' }} colSpan={2}>
              Товар
            </th>
            <th style={{ ...headCell, width: '9%' }} colSpan={2}>
              Единица измерения
            </th>
            <th style={{ ...headCell, width: '5%' }} rowSpan={2}>
              Вид упаковки
            </th>
            <th style={{ ...headCell, width: '10%' }} colSpan={2}>
              Количество
            </th>
            <th style={{ ...headCell, width: '5%' }} rowSpan={2}>
              Масса брутто
            </th>
            <th style={{ ...headCell, width: '6%' }} rowSpan={2}>
              Количество (масса нетто)
            </th>
            <th style={{ ...headCell, width: '7%' }} rowSpan={2}>
              Цена, {currencyLabel}
            </th>
            <th style={{ ...headCell, width: '8%' }} rowSpan={2}>
              Сумма без учёта НДС, {currencyLabel}
            </th>
            <th style={{ ...headCell, width: '11%' }} colSpan={2}>
              НДС
            </th>
            <th style={{ ...headCell, width: '10%' }} rowSpan={2}>
              Сумма с учётом НДС, {currencyLabel}
            </th>
          </tr>
          <tr>
            <th style={headCell}>
              наименование, характеристика, сорт, артикул товара
            </th>
            <th style={headCell}>код</th>
            <th style={headCell}>наименование</th>
            <th style={headCell}>код по ОКЕИ</th>
            <th style={headCell}>в одном месте</th>
            <th style={headCell}>мест, штук</th>
            <th style={headCell}>ставка, %</th>
            <th style={headCell}>сумма, {currencyLabel}</th>
          </tr>
          <tr>
            {Array.from({ length: 15 }, (_, i) => (
              <th key={i + 1} style={numCell}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.index}>
              <td style={{ ...cell, textAlign: 'center' }}>{line.index}</td>
              <td style={cell}>{line.title}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{line.code}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{DASH}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.price}</td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {line.amountExclVat}
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>{line.vatRate}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{line.vatAmount}</td>
              <td style={{ ...cell, textAlign: 'right' }}>
                {line.amountInclVat}
              </td>
            </tr>
          ))}

          <tr>
            <td colSpan={9} style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              Итого
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalQuantity}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>{CROSS}</td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountExclVat}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>{CROSS}</td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalVatAmount}
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountInclVat}
            </td>
          </tr>
          <tr>
            <td colSpan={9} style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              Всего по накладной
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalQuantity}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>{CROSS}</td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountExclVat}
            </td>
            <td style={{ ...cell, textAlign: 'center' }}>{CROSS}</td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalVatAmount}
            </td>
            <td style={{ ...cell, ...ruBold, textAlign: 'right' }}>
              {totalAmountInclVat}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Итоговые сведения под таблицей */}
      <div style={{ marginTop: 8, fontSize: 9 }}>
        <div style={{ marginBottom: 2 }}>
          Товарная накладная имеет приложение на ______________ листах
          <span style={ruSmall}> (прописью)</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          и содержит {lines.length} ({entriesCountInWords}) порядковых номеров
          записей
        </div>
        <div style={{ marginBottom: 2 }}>
          Масса груза (нетто) ______________
          <span style={ruSmall}> (прописью)</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          Масса груза (брутто) ______________
          <span style={ruSmall}> (прописью)</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          Всего мест ______________
          <span style={ruSmall}> (прописью)</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          Приложение (паспорта, сертификаты и т. п.) на ______________ листах
          <span style={ruSmall}> (прописью)</span>
        </div>
        <div style={{ ...ruBold, marginTop: 4 }}>
          Всего отпущено на сумму {totalInWords}
        </div>
      </div>

      {/* Подписи */}
      <table
        style={{ ...ruTable, tableLayout: 'fixed', marginTop: 14, fontSize: 9 }}
      >
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: '50%', paddingRight: 16 }}>
              <div style={{ marginBottom: 6 }}>
                Отпуск груза разрешил{' '}
                <SignatureLine label="должность" width={110} />
                <SignatureLine label="подпись" width={90} />
                <SignatureLine label="расшифровка подписи" width={110} />
              </div>
              <div style={{ marginBottom: 6 }}>
                Главный (старший) бухгалтер{' '}
                <SignatureLine label="подпись" width={90} />
                <SignatureLine label="расшифровка подписи" width={110} />
              </div>
              <div style={{ marginBottom: 6 }}>
                Отпуск груза произвёл{' '}
                <SignatureLine label="должность" width={110} />
                <SignatureLine label="подпись" width={90} />
                <SignatureLine label="расшифровка подписи" width={110} />
              </div>
              <div style={{ marginTop: 10 }}>
                М. П. «____» ________________ 20___ г.
              </div>
            </td>

            <td style={{ ...ruCellNoBorder, width: '50%', paddingLeft: 16 }}>
              <div style={{ marginBottom: 6 }}>
                По доверенности № ____________ от «____» ____________ 20___ г.
              </div>
              <div style={{ marginBottom: 6 }}>
                выданной{' '}
                <SignatureLine
                  label="кем, кому (организация, должность, фамилия, и. о.)"
                  width={260}
                />
              </div>
              <div style={{ marginBottom: 6 }}>
                Груз принял <SignatureLine label="должность" width={110} />
                <SignatureLine label="подпись" width={90} />
                <SignatureLine label="расшифровка подписи" width={110} />
              </div>
              <div style={{ marginBottom: 6 }}>
                Груз получил грузополучатель{' '}
                <SignatureLine label="должность" width={110} />
                <SignatureLine label="подпись" width={90} />
                <SignatureLine label="расшифровка подписи" width={110} />
              </div>
              <div style={{ marginTop: 10 }}>
                М. П. «____» ________________ 20___ г.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
