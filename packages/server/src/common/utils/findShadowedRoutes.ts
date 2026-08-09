// © 2026 Bigfin
/**
 * Поиск ручек, перекрытых параметрическим маршрутом, — вторая половина
 * шага Д8 карты v6.
 *
 * Nest сопоставляет маршруты в порядке объявления. Если `@Get(':id')` стоит
 * выше `@Get('due')`, то запрос `/bills/due` попадёт в первый обработчик,
 * слово «due» уедет в разбор числа и ответом будет ошибка. Ручка при этом
 * существует и выглядит рабочей — ровно тот же класс дефектов, что «страница
 * есть, а входа в неё нет». Такой случай уже находился вживую (Д4).
 */

/** Объявление маршрута в контроллере, в порядке появления в файле. */
export interface RouteDeclaration {
  method: string;
  path: string;
  /** Номер строки — чтобы в отчёте было куда смотреть. */
  line: number;
}

export interface ShadowedRoute {
  file: string;
  method: string;
  /** Маршрут, до которого запрос не доходит. */
  path: string;
  line: number;
  /** Маршрут, который его перехватывает. */
  shadowedBy: string;
  shadowedByLine: number;
}

const ROUTE_DECORATOR =
  /@(Get|Post|Put|Patch|Delete|Options|Head|All)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?\s*\)/;

/** Достаёт объявления маршрутов из исходника контроллера, в порядке файла. */
export const parseRouteDeclarations = (source: string): RouteDeclaration[] => {
  const declarations: RouteDeclaration[] = [];

  source.split('\n').forEach((text, index) => {
    const match = text.match(ROUTE_DECORATOR);
    if (!match) return;

    declarations.push({
      method: match[1].toUpperCase(),
      path: match[2] ?? match[3] ?? match[4] ?? '',
      line: index + 1,
    });
  });
  return declarations;
};

/** Сегменты пути без пустых частей: '' → [], '/:id/payments' → [':id','payments']. */
const segmentsOf = (path: string): string[] =>
  path.split('/').filter((segment) => segment.length > 0);

/**
 * Перехватывает ли маршрут `earlier` запросы, адресованные `later`.
 *
 * Совпадение по длине пути, и каждый сегмент раннего маршрута либо параметр
 * (подходит под что угодно), либо буква в букву совпадает с поздним.
 */
export const shadows = (earlier: string, later: string): boolean => {
  const earlierSegments = segmentsOf(earlier);
  const laterSegments = segmentsOf(later);

  if (earlierSegments.length !== laterSegments.length) return false;
  if (earlierSegments.length === 0) return false;

  const identical = earlier === later;
  if (identical) return true;

  return earlierSegments.every(
    (segment, index) =>
      segment.startsWith(':') || segment === laterSegments[index],
  );
};

/** Находит перекрытые маршруты в одном контроллере. */
export const findShadowedRoutes = (
  file: string,
  source: string,
): ShadowedRoute[] => {
  const declarations = parseRouteDeclarations(source);
  const shadowed: ShadowedRoute[] = [];

  declarations.forEach((later, laterIndex) => {
    const blocker = declarations
      .slice(0, laterIndex)
      .find(
        (earlier) =>
          earlier.method === later.method && shadows(earlier.path, later.path),
      );

    if (blocker) {
      shadowed.push({
        file,
        method: later.method,
        path: later.path,
        line: later.line,
        shadowedBy: blocker.path,
        shadowedByLine: blocker.line,
      });
    }
  });
  return shadowed;
};
