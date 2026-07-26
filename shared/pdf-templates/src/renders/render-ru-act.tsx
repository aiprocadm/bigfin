import { renderSSR } from './render-ssr';
import {
  RuActPaperTemplate,
  RuActPaperTemplateProps,
} from '../components/RuActPaperTemplate';

export const renderRuActPaperTemplateHtml = (props: RuActPaperTemplateProps) =>
  renderSSR(<RuActPaperTemplate {...props} />, {
    lang: 'ru',
    title: 'Акт',
  });
