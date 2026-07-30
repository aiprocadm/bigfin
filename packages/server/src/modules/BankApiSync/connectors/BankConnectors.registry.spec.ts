import { BankConnectorsRegistry } from './BankConnectors.registry';
import { BankConnector } from './BankProvider.types';

const fake = (id: any): BankConnector =>
  ({
    id,
    ping: jest.fn(),
    fetchOperations: jest.fn(),
  }) as unknown as BankConnector;

describe('BankConnectorsRegistry', () => {
  it('отдаёт коннектор по идентификатору банка', () => {
    const tinkoff = fake('tinkoff');
    const alfa = fake('alfa');
    const registry = new BankConnectorsRegistry(tinkoff as any, alfa as any);

    expect(registry.get('tinkoff')).toBe(tinkoff);
    expect(registry.get('alfa')).toBe(alfa);
  });

  it('на неизвестном банке бросает доменную ошибку', () => {
    const registry = new BankConnectorsRegistry(
      fake('tinkoff') as any,
      fake('alfa') as any,
    );

    expect(() => registry.get('sber' as any)).toThrow();
  });

  it('перечисляет поддерживаемые банки', () => {
    const registry = new BankConnectorsRegistry(
      fake('tinkoff') as any,
      fake('alfa') as any,
    );

    expect(registry.ids()).toEqual(['tinkoff', 'alfa']);
  });
});
