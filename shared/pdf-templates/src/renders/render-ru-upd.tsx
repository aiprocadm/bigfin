import { renderSSR } from './render-ssr';
import {
  RuUpdPaperTemplate,
  RuUpdPaperTemplateProps,
} from '../components/RuUpdPaperTemplate';

export const renderRuUpdPaperTemplateHtml = (props: RuUpdPaperTemplateProps) =>
  renderSSR(<RuUpdPaperTemplate {...props} />, {
    lang: 'ru',
    title: 'УПД',
  });
