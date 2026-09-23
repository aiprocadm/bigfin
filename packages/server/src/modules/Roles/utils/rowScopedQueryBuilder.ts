// © 2026 Bigfin
import { BaseQueryBuilder } from '@/models/Model';
import { currentRowScope, RowScope } from './rowScope';

/**
 * Построитель запросов, который сам накладывает ограничение роли (FT-080).
 *
 * Почему в модели, а не в каждом сервисе. Отчётов, сводок и расшифровок,
 * читающих проводки, — десятки, и каждый новый обязан был бы помнить про
 * ограничение. Забытое ограничение — это показанные чужие деньги, и узнать
 * о нём можно только по жалобе. Здесь забыть нельзя.
 *
 * Только ЧТЕНИЕ. Запись, изменение и удаление не трогаются: удаление проводок
 * операции с подзапросом к той же таблице MySQL не выполнит, а права на
 * запись проверяют стражи ручек.
 *
 * Обход — `query().context({ skipRowScope: true })`: для внутренних сверок,
 * которые обязаны видеть всё (например, поиск дублей при импорте).
 */
export function rowScopedQueryBuilder(
  apply: (builder: any, scope: RowScope) => void,
): typeof BaseQueryBuilder {
  class RowScopedQueryBuilder<M extends any, R = M[]> extends (BaseQueryBuilder as any)<M, R> {
    constructor(modelClass: any) {
      super(modelClass);
      (this as any).onBuild((builder: any) => {
        if (!builder.isFind() || builder.context()?.skipRowScope) return;
        // Подзапрос к ДРУГОЙ таблице (`b.select('id').from('accounts')`
        // внутри запроса проводок) Objection строит тем же построителем.
        // Фильтр проводок в нём — несуществующая колонка и 500 (реестр на
        // стенде, этап 39). Фильтруем только запрос к таблице своей модели.
        const model = builder.modelClass();
        if (builder.tableNameFor(model) !== model.getTableName()) return;
        const scope = currentRowScope();
        if (scope) apply(builder, scope);
      });
    }
  }
  return RowScopedQueryBuilder as any;
}

/** Имя таблицы модели в запросе — с учётом псевдонима. */
export const tableRefOf = (builder: any): string =>
  builder.tableRefFor(builder.modelClass());
