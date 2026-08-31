import { IFilterRole } from './DynamicFilter.types';
import { DynamicFilterFilterRoles } from './DynamicFilterFilterRoles';

export interface IDynamicFilterSearchResponseMeta {
  searchKeyword: string;
}

export class DynamicFilterSearch extends DynamicFilterFilterRoles {
  private searchKeyword: string;

  /**
   * Constructor method.
   * @param {string} searchKeyword - Search keyword.
   */
  constructor(searchKeyword: string) {
    super();
    this.searchKeyword = searchKeyword;
  }

  /**
   * On initialize the dynamic filter.
   *
   * К1 карты v41. Порядок здесь принципиален. Родитель по ролям поиска
   * считает, к каким таблицам нужно соединение (`setFilterRolesRelations`),
   * а роли задавались строкой НИЖЕ — родитель видел пустой список и
   * соединений не заказывал.
   *
   * Из-за этого поиск по полю связанной таблицы давал условие
   * `contacts.display_name like ...` без самого соединения — запрос,
   * который база отвергает. Отсюда и вывод прошлых карт, будто соединений
   * в DynamicListing нет вовсе: механизм есть, его лишал работы порядок.
   */
  public onInitialize() {
    this.filterRoles = this.getModelSearchFilterRoles(this.searchKeyword);
    super.onInitialize();
  }

  /**
   * Retrieve the filter roles from model search roles.
   * @param {string} searchKeyword
   * @returns {IFilterRole[]}
   */
  private getModelSearchFilterRoles(searchKeyword: string): IFilterRole[] {
    const model = this.getModel();

    return model.searchRoles.map((searchRole, index) => ({
      ...searchRole,
      value: searchKeyword,
      index: index + 1,
    }));
  }

  /**
   * Sets the response meta.
   */
  setResponseMeta() {
    this.responseMeta = {
      searchKeyword: this.searchKeyword,
    };
  }

  /**
   * Retrieves the response meta.
   * @returns {IDynamicFilterSearchResponseMeta}
   */
  public getResponseMeta(): IDynamicFilterSearchResponseMeta {
    return {
      searchKeyword: this.searchKeyword,
    };
  }
}
