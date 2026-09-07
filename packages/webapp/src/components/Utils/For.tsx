import PropTypes from 'prop-types';

export const For = ({ render, of }: any) =>
  of.map((item: any, index: any) => render(item, index));

For.propTypes = {
  of: PropTypes.array.isRequired,
  render: PropTypes.func.isRequired,
};
