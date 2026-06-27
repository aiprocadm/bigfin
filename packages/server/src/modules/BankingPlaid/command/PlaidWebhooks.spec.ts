import { PlaidWebooks } from './PlaidWebhooks';

/**
 * Covers the webhook dispatcher fix (correct argument order for unhandled
 * webhook types) and that previously-silent ITEM webhook codes (ERROR,
 * PENDING_EXPIRATION) are now observable instead of dropped.
 */
describe('PlaidWebooks', () => {
  const buildService = () => {
    const updateTransactionsService = {
      updateTransactions: jest.fn(),
    };
    const plaidItemModel = (() => ({})) as any;
    return new PlaidWebooks(updateTransactionsService as any, plaidItemModel);
  };

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('webhooks dispatcher', () => {
    it('routes an unhandled webhook type with the correct plaid item id (not undefined)', async () => {
      const service = buildService();

      await service.webhooks('item-123', 'AUTH', 'SOME_CODE');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const message = logSpy.mock.calls[0][0] as string;
      expect(message).toContain('item-123');
      expect(message).not.toContain('undefined');
      // The lowercased type is threaded through to the unhandled logger.
      expect(message).toContain('auth');
    });
  });

  describe('itemsHandler', () => {
    it('logs (is observable) for an ERROR item webhook', async () => {
      const service = buildService();

      await service.itemsHandler('item-123', 'ERROR');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const message = logSpy.mock.calls[0][0] as string;
      expect(message).toContain('ERROR');
      expect(message).toContain('error state');
    });

    it('logs (is observable) for a PENDING_EXPIRATION item webhook', async () => {
      const service = buildService();

      await service.itemsHandler('item-123', 'PENDING_EXPIRATION');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const message = logSpy.mock.calls[0][0] as string;
      expect(message).toContain('PENDING_EXPIRATION');
      expect(message).toContain('pending expiration');
    });
  });
});
