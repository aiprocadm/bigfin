// © 2026 Bigfin
/**
 * Поиск записывающих ручек, которые не спрашивают прав, — сторож шага П1
 * карты v8.
 *
 * Разметка прав делалась группами (деньги, структура, справочники, прочее), и
 * без машинной проверки список неизбежно разъедется обратно: новая ручка
 * пишется без пометки, а по коду это не видно — она просто работает у всех.
 * Ровно так уже случалось с флагами модулей и с «мнимой защитой».
 *
 * Сторож смотрит на каждую ручку записи (POST/PUT/PATCH/DELETE) и требует
 * либо пометку права, либо запись в явном списке открытых ручек с причиной.
 */

/** Ручка записи в контроллере. */
export interface WriteEndpoint {
  /** Путь файла относительно каталога модулей, через «/». */
  file: string;
  /** Имя обработчика — по нему ручку находят в файле. */
  handler: string;
  /** POST / PUT / PATCH / DELETE. */
  verb: string;
  line: number;
  /** Стоит ли на ручке (или на контроллере) пометка права. */
  guarded: boolean;
}

const WRITE_DECORATOR = /@(Post|Put|Patch|Delete)\s*\(/;
const HANDLER_NAME =
  /^\s{2}(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z0-9_]+)\s*\(/;
const CLASS_LINE = /export\s+class\s+/;

const PERMISSION_MARKS = [
  '@RequirePermission(',
  '@RequireAnyPermission(',
  '@RequireOwner(',
];

const hasMark = (text: string) =>
  PERMISSION_MARKS.some((mark) => text.includes(mark));

/**
 * Разбирает исходник контроллера на ручки записи.
 *
 * Декораторы обработчика — это всё, что лежит между концом предыдущего
 * обработчика и строкой с именем текущего: порядок пометок внутри блока
 * значения не имеет, поэтому блок берётся целиком.
 */
export const parseWriteEndpoints = (
  source: string,
  file: string,
): WriteEndpoint[] => {
  const lines = source.split('\n');
  const classIndex = lines.findIndex((line) => CLASS_LINE.test(line));

  if (classIndex < 0) return [];

  // Пометка на самом контроллере распространяется на все его ручки.
  const classGuarded = hasMark(lines.slice(0, classIndex + 1).join('\n'));

  const endpoints: WriteEndpoint[] = [];
  let blockStart = classIndex + 1;

  lines.forEach((line, index) => {
    if (index <= classIndex) return;

    const handler = line.match(HANDLER_NAME);
    if (!handler) return;

    const block = lines.slice(blockStart, index + 1).join('\n');
    const write = block.match(WRITE_DECORATOR);

    if (write) {
      endpoints.push({
        file,
        handler: handler[1],
        verb: write[1].toUpperCase(),
        line: index + 1,
        guarded: classGuarded || hasMark(block),
      });
    }

    blockStart = index + 1;
  });

  return endpoints;
};

/** Ключ записи в списке исключений: «файл#обработчик». */
export const endpointKey = (endpoint: WriteEndpoint) =>
  `${endpoint.file}#${endpoint.handler}`;
