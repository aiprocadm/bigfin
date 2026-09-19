import { BaseModel } from '@/models/Model';

export enum ISortOrder {
  DESC = 'DESC',
  ASC = 'ASC'
}

export interface IDynamicFilter {
  setModel(model: typeof BaseModel): void;
  onInitialize(): void;
  buildQuery(): void;
  getResponseMeta();

  /**
   * Поля связей, которые надо подцепить к запросу.
   *
   * ДОБАВЛЕНО: `DynamicFilterAbstractor.buildFilterRolesJoins` читает это поле
   * у каждого фильтра, а в перечне его не было. Не у всех фильтров оно есть,
   * поэтому необязательное.
   */
  relationFields?: string[];
}
export interface IFilterRole {
  fieldKey: string;
  value: string;
  condition?: string;
  index?: number;
  comparator?: string;
}
export interface IDynamicListFilter {
  customViewId?: number;
  filterRoles?: IFilterRole[];
  columnSortBy: string;
  sortOrder: ISortOrder;
  stringifiedFilterRoles?: string;
  searchKeyword?: string;
  viewSlug?: string;
}

export interface IDynamicListService {
  dynamicList(
    model: any,
    filter: IDynamicListFilter,
  ): Promise<any>;
  handlerErrorsToResponse(error, req, res, next): void;
}

// Search role.
export interface ISearchRole {
  fieldKey: string;
  comparator: string;
  /**
   * Как поле связывается с предыдущим: `or` — «или по этому полю».
   *
   * С1 карты v39: поля документов ищутся именно так (номер ИЛИ ссылка ИЛИ
   * сумма) — это видно у счёта поставщика, чека, сметы и оплат. В типе
   * поля не было, поэтому у счёта покупателю, где тип указан явно, те же
   * строки лежали закомментированными: включить их «в лоб» не давала
   * проверка типов, а дописать тип никто не стал.
   */
  condition?: string;
}
