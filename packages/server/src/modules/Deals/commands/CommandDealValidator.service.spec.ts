import { CommandDealValidatorService } from './CommandDealValidator.service';

describe('CommandDealValidatorService', () => {
  const make = (contact: any, employee?: any) => {
    const contactModel = () => ({
      query: () => ({ findById: () => Promise.resolve(contact) }),
    });
    const employeeModel = () => ({
      query: () => ({ findById: () => Promise.resolve(employee) }),
    });
    return new CommandDealValidatorService(
      contactModel as any,
      employeeModel as any,
    );
  };

  it('throws when the contact is missing', async () => {
    await expect(make(undefined).validateRefs({ contactId: 9 })).rejects.toThrow();
  });

  it('passes when no contactId is provided', async () => {
    await expect(make(undefined).validateRefs({})).resolves.toBeUndefined();
  });

  it('throws when the manager (employee) is missing', async () => {
    await expect(
      make(undefined, undefined).validateRefs({ managerId: 7 }),
    ).rejects.toMatchObject({ errorType: 'EMPLOYEE_NOT_FOUND' });
  });

  it('passes when the manager exists', async () => {
    await expect(
      make(undefined, { id: 7 }).validateRefs({ managerId: 7 }),
    ).resolves.toBeUndefined();
  });

  it('passes when managerId is null (clearing the manager)', async () => {
    await expect(
      make(undefined, undefined).validateRefs({ managerId: null }),
    ).resolves.toBeUndefined();
  });
});
