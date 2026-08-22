import { CSSProperties } from 'react';
import { ruBold, ruCellNoBorder, ruPage, ruSmall, ruTable } from './_ruFormStyles';

/**
 * Российская печатная форма «Универсальный передаточный документ» (УПД),
 * статус 1 (счёт-фактура + передаточный документ). По образцу письма ФНС
 * ММВ-20-3/96@ (на основе формы счёта-фактуры, постановление № 1137).
 *
 * Печатается в альбомной ориентации. Тексты фиксированные русские.
 * Упрощения фазы 3 (не заполняются): код вида товара, акциз, страна
 * происхождения, номер декларации, грузоотправитель/грузополучатель,
 * идентификатор госконтракта.
 */

export interface RuUpdLine {
  index: number;
  /** Наименование товара (работы, услуги) */
  title: string;
  unit?: string;
  quantity: string;
  /** Цена за единицу без НДС */
  priceExclVat: string;
  /** Стоимость без НДС */
  amountExclVat: string;
  /** «20%» | «Без НДС» */
  vatRate: string;
  /** Сумма НДС: «600,00» | «Без НДС» */
  vatAmount: string;
  /** Стоимость с НДС */
  amountInclVat: string;
}

export interface RuUpdPaperTemplateProps {
  // Подписанты: пустые значения оставляют линии подписи пустыми.
  signerDirectorName?: string;
  signerDirectorPosition?: string;
  signerAccountantName?: string;
  /** Статус УПД: «1» — СЧФ+передаточный документ, «2» — только передаточный */
  status?: string;

  documentNumber?: string;
  /** «26 июля 2026 г.» */
  documentDate?: string;

  sellerName?: string;
  sellerAddress?: string;
  /** «7707083893 / 770701001» */
  sellerInnKpp?: string;

  buyerName?: string;
  buyerAddress?: string;
  buyerInnKpp?: string;

  /** «Российский рубль, 643» */
  currencyLine?: string;

  /** Основание передачи (сдачи)/получения (приёмки) */
  baseDocument?: string;

  lines?: RuUpdLine[];

  totalExclVat?: string;
  /** «600,00» | «Без НДС» */
  totalVat?: string;
  totalInclVat?: string;
}

const updCell: CSSProperties = {
  border: '1px solid #000',
  padding: '2px 4px',
  fontSize: 10,
  verticalAlign: 'top',
};

const headerLabel: CSSProperties = { ...ruCellNoBorder, fontSize: 11, width: 130 };
const headerValue: CSSProperties = {
  ...ruCellNoBorder,
  fontSize: 11,
  borderBottom: '1px solid #000',
};

export function RuUpdPaperTemplate({
  signerDirectorName = '',
  signerAccountantName = '',
  status = '1',
  documentNumber = '',
  documentDate = '',
  sellerName = '',
  sellerAddress = '',
  sellerInnKpp = '',
  buyerName = '',
  buyerAddress = '',
  buyerInnKpp = '',
  currencyLine = 'Российский рубль, 643',
  baseDocument = '',
  lines = [],
  totalExclVat = '',
  totalVat = '',
  totalInclVat = '',
}: RuUpdPaperTemplateProps) {
  return (
    <div style={{ ...ruPage, padding: '28px 30px', fontSize: 11 }}>
      {/* Шапка: статус + счёт-фактура */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ ...updCell, width: 130, textAlign: 'center' }}>
              <div style={ruBold}>Статус: {status}</div>
              <div style={{ ...ruSmall, textAlign: 'left' }}>
                1 — счёт-фактура и передаточный документ (акт)
                <br />2 — передаточный документ (акт)
              </div>
            </td>
            <td style={{ ...ruCellNoBorder, paddingLeft: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                Универсальный передаточный документ
              </div>
              <div style={{ fontSize: 13 }}>
                Счёт-фактура № {documentNumber} от {documentDate}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Продавец / Покупатель */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={headerLabel}>Продавец:</td>
            <td style={headerValue}>{sellerName}</td>
            <td style={{ ...headerLabel, paddingLeft: 24 }}>Покупатель:</td>
            <td style={headerValue}>{buyerName}</td>
          </tr>
          <tr>
            <td style={headerLabel}>Адрес:</td>
            <td style={headerValue}>{sellerAddress}</td>
            <td style={{ ...headerLabel, paddingLeft: 24 }}>Адрес:</td>
            <td style={headerValue}>{buyerAddress}</td>
          </tr>
          <tr>
            <td style={headerLabel}>ИНН/КПП продавца:</td>
            <td style={headerValue}>{sellerInnKpp}</td>
            <td style={{ ...headerLabel, paddingLeft: 24 }}>
              ИНН/КПП покупателя:
            </td>
            <td style={headerValue}>{buyerInnKpp}</td>
          </tr>
          <tr>
            <td style={headerLabel}>Валюта:</td>
            <td style={headerValue}>{currencyLine}</td>
            <td style={{ ...ruCellNoBorder }} />
            <td style={{ ...ruCellNoBorder }} />
          </tr>
        </tbody>
      </table>

      {/* Таблица позиций */}
      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...updCell, ...ruBold, width: '4%' }}>№ п/п</th>
            <th style={{ ...updCell, ...ruBold }}>
              Наименование товара (описание выполненных работ, оказанных услуг)
            </th>
            <th style={{ ...updCell, ...ruBold, width: '6%' }}>Ед. изм.</th>
            <th style={{ ...updCell, ...ruBold, width: '8%' }}>Кол-во (объём)</th>
            <th style={{ ...updCell, ...ruBold, width: '10%' }}>
              Цена (тариф) без НДС
            </th>
            <th style={{ ...updCell, ...ruBold, width: '12%' }}>
              Стоимость без НДС
            </th>
            <th style={{ ...updCell, ...ruBold, width: '8%' }}>Ставка НДС</th>
            <th style={{ ...updCell, ...ruBold, width: '10%' }}>Сумма НДС</th>
            <th style={{ ...updCell, ...ruBold, width: '12%' }}>
              Стоимость с НДС
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.index}>
              <td style={{ ...updCell, textAlign: 'center' }}>{line.index}</td>
              <td style={updCell}>{line.title}</td>
              <td style={{ ...updCell, textAlign: 'center' }}>{line.unit}</td>
              <td style={{ ...updCell, textAlign: 'right' }}>{line.quantity}</td>
              <td style={{ ...updCell, textAlign: 'right' }}>
                {line.priceExclVat}
              </td>
              <td style={{ ...updCell, textAlign: 'right' }}>
                {line.amountExclVat}
              </td>
              <td style={{ ...updCell, textAlign: 'center' }}>{line.vatRate}</td>
              <td style={{ ...updCell, textAlign: 'right' }}>{line.vatAmount}</td>
              <td style={{ ...updCell, textAlign: 'right' }}>
                {line.amountInclVat}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ ...updCell, ...ruBold, textAlign: 'right' }}>
              Всего к оплате:
            </td>
            <td style={{ ...updCell, ...ruBold, textAlign: 'right' }}>
              {totalExclVat}
            </td>
            <td style={updCell} />
            <td style={{ ...updCell, ...ruBold, textAlign: 'right' }}>
              {totalVat}
            </td>
            <td style={{ ...updCell, ...ruBold, textAlign: 'right' }}>
              {totalInclVat}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Подписи счёт-фактурной части */}
      <table style={{ ...ruTable, tableLayout: 'auto', margin: '14px 0 10px' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 150 }}>Руководитель</td>
            <td
              style={{
                ...ruCellNoBorder,
                width: 180,
                borderBottom: '1px solid #000',
                textAlign: 'center',
              }}
            >
              {signerDirectorName}
            </td>
            <td style={{ ...ruCellNoBorder, width: 40 }} />
            <td style={{ ...ruCellNoBorder, width: 220 }}>
              Главный бухгалтер (или иное уполномоченное лицо)
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

      <div style={{ borderBottom: '2px solid #000', marginBottom: 10 }} />

      {/* Передаточная часть */}
      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 280 }}>
              Основание передачи (сдачи) / получения (приёмки):
            </td>
            <td style={{ ...ruCellNoBorder, borderBottom: '1px solid #000' }}>
              {baseDocument}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...ruTable, tableLayout: 'auto' }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: '50%', paddingRight: 20 }}>
              <div style={ruBold}>
                Товар (груз) передал / услуги, результаты работ сдал
              </div>
              <div style={{ margin: '14px 0 2px', borderBottom: '1px solid #000' }} />
              <div style={ruSmall}>(должность, подпись, Ф. И. О.)</div>
              <div style={{ marginTop: 8 }}>
                Дата отгрузки, передачи (сдачи): «____» ____________ 20___ г.
              </div>
            </td>
            <td style={{ ...ruCellNoBorder, width: '50%', paddingLeft: 20 }}>
              <div style={ruBold}>
                Товар (груз) получил / услуги, результаты работ принял
              </div>
              <div style={{ margin: '14px 0 2px', borderBottom: '1px solid #000' }} />
              <div style={ruSmall}>(должность, подпись, Ф. И. О.)</div>
              <div style={{ marginTop: 8 }}>
                Дата получения (приёмки): «____» ____________ 20___ г.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
