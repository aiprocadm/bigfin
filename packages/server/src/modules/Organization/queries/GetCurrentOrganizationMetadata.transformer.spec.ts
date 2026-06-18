import { GetCurrentOrganizationMetadataTransformer } from './GetCurrentOrganizationMetadata.transformer';

function transform(metadata: Record<string, any>) {
  const t = new GetCurrentOrganizationMetadataTransformer();
  t.setOptions({});
  t.setContext({} as any);
  return t.work(metadata);
}

describe('GetCurrentOrganizationMetadataTransformer — interfaceMode', () => {
  it('пустой режим нормализуется в business', () => {
    expect(transform({ name: 'Acme' }).interfaceMode).toBe('business');
  });

  it('null нормализуется в business', () => {
    expect(transform({ interfaceMode: null }).interfaceMode).toBe('business');
  });

  it('accountant сохраняется', () => {
    expect(transform({ interfaceMode: 'accountant' }).interfaceMode).toBe(
      'accountant',
    );
  });

  it('любое чужое значение → business', () => {
    expect(transform({ interfaceMode: 'whatever' }).interfaceMode).toBe(
      'business',
    );
  });
});
