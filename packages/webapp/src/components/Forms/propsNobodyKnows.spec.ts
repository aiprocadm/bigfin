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

/** Тег → свойства, которые он не читает, и почему это проверено. */
const UNKNOWN_PROPS: Record<string, string[]> = {
  // Группа полей — единственный компонент пакета, собранный НЕ через `Field`:
  // она не читает ни `fastField`, ни `shouldUpdate*`. А `fill` и `items` не
  // знает и blueprint-овый FormGroup, в который она всё пересылает.
  FFormGroup: ['fill', 'fastField', 'items', 'shouldUpdate', 'shouldUpdateDeps'],
  // blueprint-овый FormGroup разбирает только свои свойства; `fill`, `name` и
  // `minimal` в его исходнике не упоминаются вовсе
  FormGroup: ['fill', 'name', 'minimal'],
  // InputGroup знает large / small / fill / round; этих — нет
  FInputGroup: ['minimal', 'medium'],
  InputGroup: ['minimal'],
  // @blueprintjs-formik/datetime не упоминает fastField ни в объявлениях, ни
  // в собранном коде; `minimal` не упоминает и blueprint-овый DateInput
  FDateInput: ['fastField', 'minimal'],
  DateInput: ['minimal'],
  // Выборы живут в @blueprintjs-formik/select — там слова `fastField` нет
  // вовсе (в отличие от полей из /core, где он работает)
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

const offendersIn = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!Object.keys(UNKNOWN_PROPS).some((tag) => code.includes(`<${tag}`))) return [];

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
      for (const prop of UNKNOWN_PROPS[tag] ?? []) {
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
  it('ни одно из них никуда не передаётся', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) offenders.push(...offendersIn(file));

    expect(offenders).toEqual([]);
  });

  it('проверка действительно доходит до форм', () => {
    const withForms = sourceFiles().filter((f) =>
      /<(FFormGroup|FInputGroup|FDateInput)\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(withForms.length).toBeGreaterThan(50);
  });
});
