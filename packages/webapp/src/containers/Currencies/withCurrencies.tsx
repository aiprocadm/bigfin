import { connect } from 'react-redux';
import { getCurrenciesList } from '@/store/currencies/currencies.selector';

export const withCurrencies = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      currencies: state.currencies.data,
      currenciesList: getCurrenciesList(state),
      currenciesLoading: state.currencies.loading,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
