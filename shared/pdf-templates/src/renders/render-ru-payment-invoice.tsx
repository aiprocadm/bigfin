import { renderSSR } from './render-ssr';
import {
  RuPaymentInvoicePaperTemplate,
  RuPaymentInvoicePaperTemplateProps,
} from '../components/RuPaymentInvoicePaperTemplate';

export const renderRuPaymentInvoicePaperTemplateHtml = (
  props: RuPaymentInvoicePaperTemplateProps
) =>
  renderSSR(<RuPaymentInvoicePaperTemplate {...props} />, {
    lang: 'ru',
    title: 'Счёт на оплату',
  });
