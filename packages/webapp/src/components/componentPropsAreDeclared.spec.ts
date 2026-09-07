import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д3 карты v62. Компонент, который требует все свойства сразу.
 *
 * Компонент, написанный как `function TotalLine({ title, value, className })`
 * без объявления свойств, для проверки типов требует **все** перечисленные
 * свойства. Поэтому `<TotalLine title={…} />` — ошибка «не хватает
 * обязательных свойств», хотя во время работы всё прекрасно рисуется.
 *
 * Карты v59 и v62 разобрали самых частых: сетку, опись, строку итога,
 * подсказку, заглушку отчёта, подбор ширины столбца. Это сняло около 700
 * замечаний. Осталось 67 компонентов — они реже используются, и каждый стоит
 * своего разбора: где-то свойство и правда обязательно, где-то нет.
 *
 * Поэтому здесь **барьер на новое**, как у сторожа `check-no-new-ts-nocheck`:
 * известные 67 записаны ниже, а появление шестьдесят восьмого — ошибка.
 * Список должен только укорачиваться.
 *
 * Как убрать себя из списка: объявить свойства (интерфейс `XProps` рядом с
 * компонентом), пометив необязательные знаком `?`, и вычеркнуть строку.
 *
 * Барьер стоит на `src/components` — на общих компонентах, где одно неверное
 * объявление превращается в сотни замечаний по всему продукту. Экранные
 * компоненты в `containers` он не смотрит: там такой же беды на порядок
 * больше, и это работа отдельных карт.
 */
const SRC = __dirname;   // только общие компоненты: там ошибка размножается на весь продукт

/** Компоненты, у которых свойства ещё не объявлены. Список только укорачивается. */
const KNOWN = [
  'AdvancedFilter/AdvancedFilterDropdown.tsx → AdvancedFilterDropdown',
  'AdvancedFilter/AdvancedFilterDropdown.tsx → AdvancedFilterDropdownCondition',
  'AdvancedFilter/AdvancedFilterDropdown.tsx → AdvancedFilterDropdownConditions',
  'AdvancedFilter/AdvancedFilterDropdownContext.tsx → AdvancedFilterDropdownProvider',
  'AdvancedFilter/AdvancedFilterDropdownContext.tsx → FilterConditionProvider',
  'AdvancedFilter/AdvancedFilterValueField.tsx → AdvancedFilterEnumerationField',
  'AdvancedFilter/AdvancedFilterValueField.tsx → AdvancedFilterValueField2',
  'Alert/index.tsx → Alert',
  'BankAccounts/index.tsx → BankAccount',
  'BankAccounts/index.tsx → BankAccountBalance',
  'BankAccounts/index.tsx → BankAccountMetaLine',
  'Branches/BranchMultiSelect.tsx → BranchMultiSelect',
  'Contacts/ContactsMultiSelect.tsx → ContactsMultiSelect',
  'Contacts/ContactsMultiSelect.tsx → CustomersMultiSelectRoot',
  'Contacts/ContactsMultiSelect.tsx → VendorsMultiSelectRoot',
  'Dashboard/DashboardLoadingIndicator.tsx → DashboardLoadingIndicator',
  'Dashboard/DashboardPage.tsx → DashboardPage',
  'Dashboard/DashboardSplitePane.tsx → DashboardSplitPane',
  'Dashboard/DashboardTopbar/DashboardTopbar.tsx → DashboardTopbar',
  'Dashboard/DashboardViewsTabs.tsx → DashboardViewsTabs',
  'DataTableCells/AccountsListFieldCell.tsx → AccountCellRenderer',
  'DataTableCells/BranchesListFieldCell.tsx → BranchesListFieldCell',
  'DataTableCells/CheckBoxFieldCell.tsx → CheckboxEditableCell',
  'DataTableCells/ContactsListFieldCell.tsx → ContactsListCellRenderer',
  'DataTableCells/InputGroupCell.tsx → InputEditableCell',
  'DataTableCells/MoneyFieldCell.tsx → MoneyFieldCellRenderer',
  'DataTableCells/PaymentReceiveListFieldCell.tsx → PaymentReceiveListFieldCell',
  'DataTableCells/PercentFieldCell.tsx → PercentFieldCell',
  'DataTableCells/ProjectsListFieldCell.tsx → ProjectsListFieldCell',
  'DataTableCells/SwitchFieldCell.tsx → SwitchEditableCell',
  'DataTableCells/TextAreaCell.tsx → TextAreaEditableCell',
  'Datatable/Pagination.tsx → Pagination',
  'Datatable/TableCell.tsx → TableCell',
  'Datatable/TableHeader.tsx → TableHeaderCell',
  'Datatable/TableRow.tsx → TableRow',
  'Datatable/TableRow.tsx → TableRowContextMenu',
  'Datatable/TableVirtualizedRows.tsx → TableVirtualizedListRow',
  'Dialog/DialogFooterActions.tsx → DialogFooterActions',
  'Dialog/DialogProvider.tsx → DialogProvider',
  'Dragzone/index.tsx → Dragzone',
  'ErrorBoundary/index.tsx → ErrorBoundary',
  'FinancialSheet/FinancialSheet.tsx → FinancialSheet',
  'Forms/FMoneyInputGroup.tsx → FMoneyInputGroup',
  'Forms/InputPrependButton.tsx → InputPrependButton',
  'Forms/MoneyInputGroup/OrganizationMoneyInput.tsx → OrganizationMoneyInput',
  'Guards/EnsureOrganizationIsNotReady.tsx → EnsureOrganizationIsNotReady',
  'Guards/EnsureOrganizationIsReady.tsx → EnsureOrganizationIsReady',
  'Indicator/CloudLoadingIndicator.tsx → CloudLoadingIndicator',
  'Indicator/LoadingIndicator.tsx → LoadingIndicator',
  'Items/ItemsListField.tsx → ItemsListField',
  'Items/ItemsSuggestField.tsx → ItemsSuggestFieldRoot',
  'MultiSelectTaggable/index.tsx → MultiSelect',
  'NumberFormatDropdown/index.tsx → NumberFormatDropdown',
  'PageForm/PageForm.tsx → PageFormBody',
  'PageForm/PageForm.tsx → PageFormFooterActions',
  'PageForm/PageForm.tsx → PageFormHeader',
  'PaymentReceive/PaymentReceiveListField.tsx → PaymentReceiveListField',
  'SMSPreview/index.tsx → SMSMessagePreview',
  'Select/ListSelect.tsx → ListSelect',
  'Skeleton/Skeleton.tsx → Skeleton',
  'Skeleton/SkeletonText.tsx → SkeletonText',
  'TextStatus/index.tsx → TextStatus',
  'TotalLines/index.tsx → TotalLines',
  'Utils/For.tsx → For',
  'Utils/FormatDate.tsx → FormatDate',
  'Utils/FormatDate.tsx → FormatDateCell',
  'Warehouses/WarehouseMultiSelect.tsx → WarehouseMultiSelect',];

const componentFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const undeclared = (file: string): string[] => {
  const sf = ts.createSourceFile(
    file,
    fs
      .readFileSync(file, 'utf8')
      .replace(/^[ \t]*\/\/[ \t]*@ts-nocheck.*\r?\n/m, ''),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];

  const visit = (n: ts.Node): void => {
    let name: string | null = null;
    let fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null =
      null;

    if (ts.isFunctionDeclaration(n) && n.name) {
      name = n.name.text;
      fn = n;
    } else if (
      ts.isVariableDeclaration(n) &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    ) {
      name = n.name.getText(sf);
      fn = n.initializer;
    }

    // Компонент — имя с большой буквы и ровно один довод: свойства.
    if (name && /^[A-Z]/.test(name) && fn && fn.parameters.length === 1) {
      const p = fn.parameters[0];
      if (
        !p.type &&
        ts.isObjectBindingPattern(p.name) &&
        p.name.elements.length >= 2
      ) {
        found.push(`${path.relative(SRC, file)} → ${name}`);
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
};

describe('компонент объявляет свои свойства', () => {
  it('новых компонентов без объявленных свойств не появилось', () => {
    const offenders: string[] = [];
    for (const file of componentFiles()) offenders.push(...undeclared(file));

    expect(offenders.filter((o) => !KNOWN.includes(o))).toEqual([]);
  });

  it('список не разросся', () => {
    const offenders: string[] = [];
    for (const file of componentFiles()) offenders.push(...undeclared(file));

    expect(offenders.length).toBeLessThanOrEqual(KNOWN.length);
  });
});
