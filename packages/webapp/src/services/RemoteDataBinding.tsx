import ApiService from '@/services/ApiService';

/** Состояние таблицы, которое класс ждёт на вход. */
interface RemoteDataState {
  skip: number;
  take: number;
  sorted?: Array<{ name: string; direction: string }>;
}

/**
 * ЭТОТ КЛАСС НЕ ИСПОЛЬЗУЕТСЯ НИГДЕ и в таком виде не заработал бы: ни `ajax`,
 * ни `baseUrl` он себе не заводит — их должен был подставить кто-то снаружи.
 * Формат запроса чужой (OData: `$skip`, `$top`, `d.results`), к ручкам Bigfin
 * отношения не имеет. Остаток чужого шаблона; удаление предложено владельцу
 * (карта v88). Свойства объявлены, чтобы файл не держал под собой пометку
 * «не проверять типы».
 */
export default class RemoteDataBinding {
  /** Подставляется снаружи — внутри класса не заводится. */
  ajax!: { url: string };
  /** Подставляется снаружи — внутри класса не заводится. */
  baseUrl!: string;

  execute(state: RemoteDataState) {
    return this.getData(state);
  }

  getData(state: RemoteDataState) {
    const pageQuery = `$skip=${state.skip}&$top=${state.take}`;
    let sortQuery = '';

    if ((state.sorted || []).length) {
      sortQuery =
        `&$orderby=` +
        (state.sorted || [])
          .map((obj) => {
            return obj.direction === 'descending'
              ? `${obj.name} desc`
              : obj.name;
          })
          .reverse()
          .join(',');
    }

    this.ajax.url = `${this.baseUrl}?${pageQuery}${sortQuery}&$inlinecount=allpages&$format=json`;

    return ApiService.get(this.ajax.url).then((response: any) => {
      let data = JSON.parse(response);
      return {
        result: data['d']['results'],
        count: parseInt(data['d']['__count'], 10),
      };
    });
  }
}