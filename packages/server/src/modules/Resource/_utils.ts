import { camelCase, upperFirst } from 'lodash';
import * as pluralize from 'pluralize';

// Классы моделей, чьё имя не совпадает с именем ресурса (С3 карты v14):
// ресурс `tax_rate` указывает на класс TaxRateModel — без алиаса экспорт
// ставок отвечал 500 «модель не найдена».
const RESOURCE_MODEL_ALIASES: Record<string, string> = {
  TaxRate: 'TaxRateModel',
};

export const resourceToModelName = (resourceName: string): string => {
  const modelName = upperFirst(camelCase(pluralize.singular(resourceName)));
  return RESOURCE_MODEL_ALIASES[modelName] ?? modelName;
};
