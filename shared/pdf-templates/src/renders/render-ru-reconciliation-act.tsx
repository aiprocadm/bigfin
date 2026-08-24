import { renderSSR } from './render-ssr';
import {
  RuReconciliationActTemplate,
  RuReconciliationActTemplateProps,
} from '../components/RuReconciliationActTemplate';

export const renderRuReconciliationActTemplateHtml = (
  props: RuReconciliationActTemplateProps,
) =>
  renderSSR(<RuReconciliationActTemplate {...props} />, {
    lang: 'ru',
    title: 'Акт сверки взаимных расчётов',
  });
