import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Д3 карты v56. Объявления, которые требуют лишнего.
 *
 * Есть несколько помощников, которыми пользуется весь продукт: общий
 * отправитель запросов и четыре надстройки над хранилищем. Сотни мест зовут
 * их без необязательных доводов — `apiRequest.get('accounts')`,
 * `withDrawers()` — и это законно: внутри и axios, и сами надстройки
 * проверяют, передали им что-то или нет.
 *
 * Но объявлены эти доводы были как обязательные. Проверка типов считала
 * каждый такой вызов ошибкой — 398 замечаний на пустом месте, из-за которых
 * 86 файлов не могли выйти из-под пометки «не проверять типы».
 *
 * Почему нужен сторож: если довод снова сделают обязательным, `tsc`
 * промолчит. Вызывающие файлы стоят под пометкой, а она отключает проверку
 * целиком — ошибка вернётся молча и снова затянет файлы в слепую зону.
 *
 * Правило: перечисленные доводы объявлены необязательными (со знаком `?`).
 */
const SRC = path.resolve(__dirname, '..');

const read = (relative: string): string =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

/**
 * Помощник, файл, сколько раз объявление встречается в файле и доводы,
 * которые обязаны остаться необязательными.
 *
 * Считать вхождения обязательно: в `useRequest.tsx` два отдельных отправителя
 * (`useApiRequest` и `useAuthApiRequest`) с одинаковым набором методов. Если
 * проверять только «есть хоть одно», порча одного из двух пройдёт незамеченной.
 */
const CONTRACTS: Array<{
  what: string;
  file: string;
  times: number;
  signatures: RegExp[];
}> = [
  {
    what: 'общий отправитель запросов',
    file: 'hooks/useRequest.tsx',
    times: 2,
    signatures: [
      /\bget\(resource: any, params\?: any\)/,
      /\bpost\(resource: any, params\?: any, config\?: any\)/,
      /\bput\(resource: any, params\?: any\)/,
      /\bpatch\(resource: any, params\?: any, config\?: any\)/,
      /\bdelete\(resource: any, params\?: any\)/,
      /\bupdate\(resource: any, slug: any, params\?: any\)/,
    ],
  },
  {
    what: 'надстройка ящиков',
    times: 1,
    file: 'containers/Drawer/withDrawers.tsx',
    signatures: [/withDrawers = \(mapState\?/],
  },
  {
    what: 'надстройка предупреждений',
    times: 1,
    file: 'containers/Alert/withAlertStoreConnect.tsx',
    signatures: [/withAlertStoreConnect = \(mapState\?/],
  },
  {
    what: 'надстройка текущей организации',
    times: 1,
    file: 'containers/Organization/withCurrentOrganization.tsx',
    signatures: [/withCurrentOrganization = \(mapState\?/],
  },
  {
    what: 'надстройка диалогов',
    times: 1,
    file: 'components/DialogReduxConnect.tsx',
    signatures: [/export default \(mapState\?/],
  },
  {
    what: 'разбор строки запроса',
    times: 1,
    file: 'hooks/useQueryString.ts',
    signatures: [/useAppQueryString = \(\s*navigate\?/],
  },
];

describe('общие помощники не требуют лишнего', () => {
  for (const { what, file, times, signatures } of CONTRACTS) {
    it(`${what} (${file})`, () => {
      const code = read(file);
      const tightened = signatures
        .filter(
          (re) => (code.match(new RegExp(re.source, 'g')) ?? []).length !== times,
        )
        .map((re) => re.source);

      expect(tightened).toEqual([]);
    });
  }
});
