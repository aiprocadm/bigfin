import { connect } from 'react-redux';
import { getCurrencyByCode } from '@/store/currencies/currencies.selector';

const mapStateToProps = (state: any, props: any) => ({
  currency: getCurrencyByCode(state, props),
});

export const withCurrencyDetail = connect(mapStateToProps);
