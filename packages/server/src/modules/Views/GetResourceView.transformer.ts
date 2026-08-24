import { Transformer } from '../Transformer/Transformer';
import { View } from './models/View.model';

export class GetResourceViewTransformer extends Transformer {
  public includeAttributes = (): string[] => {
    return ['name'];
  };

  name(view: View) {
    // Имя стандартного списка — часть облика организации, а не выбор
    // читателя: переводим на языке организации, как план счетов и письма
    // (Р4 карты v18). Без `lang` перевод брал язык запроса, и у русской
    // организации список мог называться «Draft».
    return this.context.i18n.t(view.name, {
      lang: this.context.organization?.language ?? 'en',
    });
  }
}
