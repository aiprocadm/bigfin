import { Box } from '@/components';
import {
  FormattedMessage as T,
  FFormGroup,
  FInputGroup,
  FTextArea,
} from '@/components';
import { VendorFormSectionTitle } from './VendorFormSectionTitle';

export function VendorShippingAddress() {
  return (
    <Box data-section-id="shippingAddress">
      <VendorFormSectionTitle>
        <T id={'shipping_address'} />
      </VendorFormSectionTitle>
      <FFormGroup
        name={'shipping_address_country'}
        label={<T id={'country'} />}
        inline
      >
        <FInputGroup name={'shipping_address_country'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address1'}
        label={<T id={'address_line_1'} />}
        inline
      >
        <FTextArea name={'shipping_address1'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address2'}
        label={<T id={'address_line_2'} />}
        inline
      >
        <FTextArea name={'shipping_address2'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address_city'}
        label={<T id={'city_town'} />}
        inline
      >
        <FInputGroup name={'shipping_address_city'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address_state'}
        label={<T id={'state'} />}
        inline
      >
        <FInputGroup name={'shipping_address_state'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address_postcode'}
        label={<T id={'zip_code'} />}
        inline
      >
        <FInputGroup name={'shipping_address_postcode'} fill fastField />
      </FFormGroup>

      <FFormGroup
        name={'shipping_address_phone'}
        label={<T id={'phone'} />}
        inline
      >
        <FInputGroup name={'shipping_address_phone'} fill fastField />
      </FFormGroup>
    </Box>
  );
}
