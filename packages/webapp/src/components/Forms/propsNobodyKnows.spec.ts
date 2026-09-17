import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д3 карты v64. Свойства, которых никто не читает.
 *
 * Компоненту можно передать любое свойство. Если он его не знает, ничего не
 * произойдёт: ни ошибки, ни предупреждения — просто ничего. Проверка типов
 * такое ловит, но вызывающие файлы стоят под пометкой «не проверять типы», и
 * там она молчит.
 *
 * Ниже — пары «тег и свойство», про каждую из которых проверено по исходникам
 * библиотек, что свойство не читается **никем**: ни обёрткой над Formik, ни
 * самим blueprint-компонентом, ни через «всё остальное» на элемент (blueprint
 * отбрасывает незнакомые свойства через `removeNonHTMLProps`).
 *
 * Сторож начинался в карте v59 с одной пары и назывался по ней. Карта v64
 * показала, что случай шире, и заодно **поправила вывод карты v59**: там
 * сказано, что `fastField` у поля-ребёнка работает всегда. Это верно для
 * полей из `@blueprintjs-formik/core`, но **не** для поля даты: оно живёт в
 * отдельном пакете `@blueprintjs-formik/datetime`, и слова `fastField` в нём
 * нет вовсе.
 *
 * Правило: перечисленные свойства этим тегам не передаются.
 */
const SRC = path.resolve(__dirname, '..', '..');

/**
 * Обёртки над `FSelect` пересылают в него всё как есть, а он собран на обычном
 * `Field`: ни `fastField`, ни `shouldUpdate*` до библиотеки не доходят
 * (Д18 карты v85).
 */
const OVER_FSELECT = ['fastField', 'shouldUpdate', 'shouldUpdateDeps'];

/** Тег → свойства, которые он не читает, и почему это проверено. */
const UNKNOWN_PROPS: Record<string, string[]> = {
  // Группа полей — единственный компонент пакета, собранный НЕ через `Field`:
  // она не читает ни `fastField`, ни `shouldUpdate*`. А `fill` и `items` не
  // знает и blueprint-овый FormGroup, в который она всё пересылает.
  FFormGroup: [
    'fill',
    'fastField',
    'items',
    'shouldUpdate',
    'shouldUpdateDeps',
    // признаки товара группа полей тоже не знает (Д2 карты v70)
    'sellable',
    'purchasable',
  ],
  // стилевые обёртки над группой полей: они пересылают всё в неё, а она
  // `fastField` не читает
  BrandingThemeFormGroup: ['fastField'],
  CompoundFormGroup: ['fastField'],
  // окна предпросмотра PDF имя окна не читают — его задаёт сам диалог
  PdfPreviewDialogContent: ['dialogName'],
  InventoryValuationPdfDialogContent: ['dialogName'],
  // blueprint-овый FormGroup разбирает только свои свойства; `fill`, `name` и
  // `minimal` в его исходнике не упоминаются вовсе. Ни `fastField`, ни
  // `shouldUpdate*` — тоже: это слова из обёрток над Formik, а сюда они
  // попадали копированием из соседней FFormGroup (Д13 карты v88).
  FormGroup: [
    'fill',
    'name',
    'minimal',
    'fastField',
    'shouldUpdate',
    'shouldUpdateDeps',
  ],
  // InputGroup знает large / small / fill / round; этих — нет
  // `inputProps` поле ввода тоже не читает: в его исходнике этого слова нет,
  // и blueprint-овый InputGroup отбрасывает незнакомое (Д39 карты v75)
  FInputGroup: ['minimal', 'medium', 'inputProps'],
  // `fastField` — слово из обёрток над Formik. У blueprint-ового поля ввода
  // его нет ни в объявлениях, ни в собранном коде: там, где его написали,
  // поле вообще не было связано с формой, и введённое пропадало
  // (Д18 карты v88).
  InputGroup: ['minimal', 'fastField'],
  // @blueprintjs-formik/datetime не упоминает fastField ни в объявлениях, ни
  // в собранном коде; `minimal` не упоминает и blueprint-овый DateInput
  FDateInput: ['fastField', 'minimal'],
  DateInput: ['minimal'],
  // Выборы живут в @blueprintjs-formik/select — там слова `fastField` нет
  // вовсе (в отличие от полей из /core, где он работает). Слова `searchable`
  // там нет тоже. Пояснение это стояло здесь с карты v64, а самого правила
  // для `FSelect` не было: у списка сотня с лишним мест вызова, и все они
  // передавали `fastField` впустую (Д18 карты v85). Обёртки над списком
  // пересылают в него всё как есть — им те же запреты.
  // `selectedItem` — тоже: выбранное значение список берёт из формы.
  // `shouldUpdate*` — из /core, где поля собраны на FastField; список собран
  // на обычном Field и этих слов не содержит
  FSelect: [
    'fastField',
    'searchable',
    'selectedItem',
    'shouldUpdate',
    'shouldUpdateDeps',
  ],
  ProjectTaskSelect: OVER_FSELECT,
  ExpenseSelect: OVER_FSELECT,
  ProjectsSelect: OVER_FSELECT,
  ProjectTaskChargeTypeSelect: OVER_FSELECT,
  FinancialStatementsFilter: OVER_FSELECT,
  AdvancedFilterCompatatorField: OVER_FSELECT,
  DisplayNameList: OVER_FSELECT,
  SalutationList: OVER_FSELECT,
  CurrencySelect: OVER_FSELECT,
  CustomersSelect: OVER_FSELECT,
  CurrencySelectList: OVER_FSELECT,
  AccountsTypesSelect: OVER_FSELECT,
  VendorsSelect: OVER_FSELECT,
  AccountsSelect: OVER_FSELECT,
  TaxRatesSelect: OVER_FSELECT,
  WarehouseSelect: OVER_FSELECT,
  BranchSelect: OVER_FSELECT,
  // Переключатель не знает `small`: ни обёртка над Formik, ни blueprint-овый
  // Switch этого слова не содержат (Д9 карты v76)
  FSwitch: ['small'],
  // Поле цвета внутри собрано на обычном `Field`, а не на `FastField`: слова
  // `fastField` в нём нет, и десять мест в пяти экранах настройки макета
  // передавали его впустую (Д9 карты v76)
  FColorInput: ['fastField'],
  FMultiSelect: ['fastField'],
  FAccountsSuggestField: ['fastField'],
  // Размер значка — свойство самого значка, а не кнопки: слова `iconSize` нет
  // ни в объявлениях кнопки, ни в её собранном коде (Д3 карты v68). А `inline`
  // не упоминается в исходниках кнопки ни разу.
  Button: ['iconSize', 'inline'],
};

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/**
 * Стилевые обёртки: `const TermsConditsFormGroup = styled(FFormGroup)\`…\``.
 *
 * Обёртка пересылает в исходный компонент **всё**, что ей дали, — значит,
 * незнакомые свойства теряются в ней ровно так же. Раньше сторож их не видел:
 * он сравнивал имя тега со списком буквально, а в списке лежали только два
 * имени обёрток, вписанных руками. Через остальные восемь `fastField`
 * проходил молча — и в двух подвалах он действительно стоял (Д23 карты v75).
 *
 * Теперь обёртки находятся в самом файле и наследуют запреты исходника.
 */
const wrappersIn = (code: string): Record<string, string> => {
  const map: Record<string, string> = {};
  const re = /(?:const|let)\s+(\w+)\s*=\s*styled\((\w+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) map[m[1]] = m[2];
  return map;
};

const offendersIn = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  const wrappers = wrappersIn(code);
  // Свойства обёртки — это свойства того, во что она завёрнута (по цепочке).
  const unknownFor = (tag: string): string[] => {
    const seen = new Set<string>();
    let cur: string | undefined = tag;
    while (cur && !seen.has(cur)) {
      if (UNKNOWN_PROPS[cur]) return UNKNOWN_PROPS[cur];
      seen.add(cur);
      cur = wrappers[cur];
    }
    return [];
  };

  const watched = [...Object.keys(UNKNOWN_PROPS), ...Object.keys(wrappers)];
  if (!watched.some((tag) => code.includes(`<${tag}`))) return [];

  // Пометку не снимаем: на разбор она не влияет, а номера строк уезжают.
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];

  const visit = (n: ts.Node): void => {
    const open = ts.isJsxElement(n)
      ? n.openingElement
      : ts.isJsxSelfClosingElement(n)
        ? n
        : null;

    if (open) {
      const tag = open.tagName.getText(sf);
      for (const prop of unknownFor(tag)) {
        const has = open.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === prop,
        );
        if (has) {
          const line = sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1;
          found.push(`${path.relative(SRC, file)}:${line} → <${tag} ${prop}>`);
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
};

describe('свойства, которых никто не читает', () => {
  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('ни одно из них никуда не передаётся', { timeout: 30_000 }, () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) offenders.push(...offendersIn(file));

    expect(offenders).toEqual([]);
  });

  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('проверка действительно доходит до форм', { timeout: 30_000 }, () => {
    const withForms = sourceFiles().filter((f) =>
      /<(FFormGroup|FInputGroup|FDateInput)\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(withForms.length).toBeGreaterThan(50);
  });
});
