import { CommandDealValidatorService } from './CommandDealValidator.service';

describe('CommandDealValidatorService', () => {
  const make = (contact: any) => {
    const contactModel = () => ({
      query: () => ({ findById: () => Promise.resolve(contact) }),
    });
    return new CommandDealValidatorService(contactModel as any);
  };

  it('throws when the contact is missing', async () => {
    await expect(make(undefined).validateRefs({ contactId: 9 })).rejects.toThrow();
  });

  it('passes when no contactId is provided', async () => {
    await expect(make(undefined).validateRefs({})).resolves.toBeUndefined();
  });
});
