import { renderSSR } from './render-ssr';
import {
  RuTorg12PaperTemplate,
  RuTorg12PaperTemplateProps,
} from '../components/RuTorg12PaperTemplate';

export const renderRuTorg12PaperTemplateHtml = (
  props: RuTorg12PaperTemplateProps
) =>
  renderSSR(<RuTorg12PaperTemplate {...props} />, {
    lang: 'ru',
    title: 'ТОРГ-12',
  });
