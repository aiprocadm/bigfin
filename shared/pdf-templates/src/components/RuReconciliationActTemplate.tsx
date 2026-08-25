import {
  ruBold,
  ruCell,
  ruCellNoBorder,
  ruPage,
  ruSmall,
  ruTable,
} from './_ruFormStyles';

/**
 * Российская печатная форма «Акт сверки взаиморасчётов» (К2 карты v19).
 *
 * Тексты формы намеренно фиксированные русские (не i18n): это нормативная
 * печатная форма РФ, её язык не зависит от языка интерфейса организации —
 * тот же принцип, что у акта, УПД и ТОРГ-12.
 *
 * Форма двусторонняя: слева обороты по данным организации, справа —
 * пустые графы «по данным контрагента». Так её и заполняют: одна сторона
 * печатает, вторая сверяет и вписывает своё.
 */

export interface RuReconciliationLine {
  /** «12.08.2026» */
  date: string;
  /** «Счёт INV-00007» */
  title: string;
  /** Дебет по данным организации, «18 000,00» */
  debit: string;
  /** Кредит по данным организации */
  credit: string;
}

export interface RuReconciliationActTemplateProps {
  signerDirectorName?: string;
  signerDirectorPosition?: string;
  signerAccountantName?: string;

  /** «01.07.2026 — 30.09.2026» */
  periodLabel?: string;
  /** «26 июля 2026 г.» */
  documentDate?: string;

  /** «ООО «Ромашка», ИНН …» — наша организация */
  organizationLine?: string;
  /** «ООО «Северный ветер», ИНН …» — контрагент */
  counterpartyLine?: string;

  lines?: RuReconciliationLine[];

  /** Сальдо на начало периода, «0,00» */
  openingBalance?: string;
  /** Обороты за период */
  totalDebit?: string;
  totalCredit?: string;
  /** Сальдо на конец периода */
  closingBalance?: string;
  /** Пояснение к конечному сальдо: кто кому должен */
  closingBalanceText?: string;
  /** «Пятьдесят три тысячи рублей 00 копеек» */
  closingBalanceInWords?: string;
}

export function RuReconciliationActTemplate({
  signerDirectorName = '',
  signerDirectorPosition = 'Руководитель',
  signerAccountantName = '',
  periodLabel = '',
  documentDate = '',
  organizationLine = '',
  counterpartyLine = '',
  lines = [],
  openingBalance = '0,00',
  totalDebit = '0,00',
  totalCredit = '0,00',
  closingBalance = '0,00',
  closingBalanceText = '',
  closingBalanceInWords = '',
}: RuReconciliationActTemplateProps) {
  return (
    <div style={ruPage}>
      <h1 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>
        Акт сверки взаимных расчётов
      </h1>
      <div style={{ marginBottom: 4 }}>за период {periodLabel}</div>
      <div style={{ borderBottom: '2px solid #000', marginBottom: 16 }} />

      <table style={{ ...ruTable, tableLayout: 'auto', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: 130, ...ruBold }}>
              Организация:
            </td>
            <td style={ruCellNoBorder}>{organizationLine}</td>
          </tr>
          <tr>
            <td style={{ ...ruCellNoBorder, ...ruBold }}>Контрагент:</td>
            <td style={ruCellNoBorder}>{counterpartyLine}</td>
          </tr>
        </tbody>
      </table>

      <table style={ruTable}>
        <thead>
          <tr>
            <th style={{ ...ruCell, ...ruBold, width: '12%' }}>Дата</th>
            <th style={{ ...ruCell, ...ruBold }}>Документ</th>
            <th style={{ ...ruCell, ...ruBold, width: '17%' }}>
              Дебет
              <div style={ruSmall}>по данным организации</div>
            </th>
            <th style={{ ...ruCell, ...ruBold, width: '17%' }}>
              Кредит
              <div style={ruSmall}>по данным организации</div>
            </th>
            <th style={{ ...ruCell, ...ruBold, width: '17%' }}>
              Дебет
              <div style={ruSmall}>по данным контрагента</div>
            </th>
            <th style={{ ...ruCell, ...ruBold, width: '17%' }}>
              Кредит
              <div style={ruSmall}>по данным контрагента</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...ruCell, textAlign: 'center' }} colSpan={2}>
              Сальдо на начало периода
            </td>
            <td style={{ ...ruCell, textAlign: 'right' }} colSpan={2}>
              {openingBalance}
            </td>
            {/* Пустые графы: вторая сторона вписывает свои цифры от руки. */}
            <td style={ruCell} colSpan={2} />
          </tr>

          {lines.map((line, index) => (
            <tr key={index}>
              <td style={{ ...ruCell, textAlign: 'center' }}>{line.date}</td>
              <td style={ruCell}>{line.title}</td>
              <td style={{ ...ruCell, textAlign: 'right' }}>{line.debit}</td>
              <td style={{ ...ruCell, textAlign: 'right' }}>{line.credit}</td>
              <td style={ruCell} />
              <td style={ruCell} />
            </tr>
          ))}

          <tr>
            <td style={{ ...ruCell, ...ruBold, textAlign: 'right' }} colSpan={2}>
              Обороты за период
            </td>
            <td style={{ ...ruCell, ...ruBold, textAlign: 'right' }}>
              {totalDebit}
            </td>
            <td style={{ ...ruCell, ...ruBold, textAlign: 'right' }}>
              {totalCredit}
            </td>
            <td style={ruCell} />
            <td style={ruCell} />
          </tr>
          <tr>
            <td style={{ ...ruCell, ...ruBold, textAlign: 'right' }} colSpan={2}>
              Сальдо на конец периода
            </td>
            <td style={{ ...ruCell, ...ruBold, textAlign: 'right' }} colSpan={2}>
              {closingBalance}
            </td>
            <td style={ruCell} colSpan={2} />
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        {closingBalanceText}
        {closingBalanceInWords ? ` (${closingBalanceInWords})` : ''}
      </div>

      <table style={{ ...ruTable, tableLayout: 'auto', marginTop: 36 }}>
        <tbody>
          <tr>
            <td style={{ ...ruCellNoBorder, width: '50%', verticalAlign: 'top' }}>
              <div style={ruBold}>От организации</div>
              <div style={{ marginTop: 28 }}>
                {signerDirectorPosition} ______________ {signerDirectorName}
              </div>
              {signerAccountantName && (
                <div style={{ marginTop: 16 }}>
                  Главный бухгалтер ______________ {signerAccountantName}
                </div>
              )}
              <div style={{ ...ruSmall, marginTop: 20 }}>М.П.</div>
            </td>
            <td style={{ ...ruCellNoBorder, verticalAlign: 'top' }}>
              <div style={ruBold}>От контрагента</div>
              <div style={{ marginTop: 28 }}>
                Руководитель ______________ /_______________/
              </div>
              <div style={{ marginTop: 16 }}>
                Главный бухгалтер ______________ /_______________/
              </div>
              <div style={{ ...ruSmall, marginTop: 20 }}>М.П.</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ ...ruSmall, marginTop: 24 }}>
        {/* Дата уже приходит как «25 августа 2026 г.» — своя точка в конце
            дала бы «г. .» (видно на живой пробе). */}
        Акт составлен {documentDate} Расхождения просим сообщить в течение
        пяти рабочих дней с даты получения.
      </div>
    </div>
  );
}
