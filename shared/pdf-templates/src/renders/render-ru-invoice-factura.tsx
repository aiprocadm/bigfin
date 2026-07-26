import { renderSSR } from './render-ssr';
import {
  RuInvoiceFacturaPaperTemplate,
  RuInvoiceFacturaPaperTemplateProps,
} from '../components/RuInvoiceFacturaPaperTemplate';

export const renderRuInvoiceFacturaPaperTemplateHtml = (
  props: RuInvoiceFacturaPaperTemplateProps
) =>
  renderSSR(<RuInvoiceFacturaPaperTemplate {...props} />, {
    lang: 'ru',
    title: 'Счёт-фактура',
  });
