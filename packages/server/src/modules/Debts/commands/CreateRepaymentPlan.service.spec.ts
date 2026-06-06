// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { Contact } from '@/modules/Contacts/models/Contact';
import { CommandRepaymentPlanValidatorService } from './CommandRepaymentPlanValidator.service';

const contactModel = (found: any) => () => ({
  query: () => ({ findById: async () => found }),
});

describe('CommandRepaymentPlanValidatorService', () => {
  const build = async (found: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandRepaymentPlanValidatorService,
        { provide: Contact.name, useValue: contactModel(found) },
      ],
    }).compile();
    return ref.get(CommandRepaymentPlanValidatorService);
  };

  it('бросает CONTACT_NOT_FOUND, если контрагента нет', async () => {
    const v = await build(null);
    await expect(
      v.validate({
        contactId: 9,
        installments: [{ amount: 1, dueDate: '2026-07-01' }],
      } as any),
    ).rejects.toMatchObject({ errorType: 'CONTACT_NOT_FOUND' });
  });

  it('бросает EMPTY_INSTALLMENTS на пустом графике', async () => {
    const v = await build({ id: 1 });
    await expect(
      v.validate({ contactId: 1, installments: [] } as any),
    ).rejects.toMatchObject({ errorType: 'EMPTY_INSTALLMENTS' });
  });

  it('проходит для валидного плана', async () => {
    const v = await build({ id: 1 });
    await expect(
      v.validate({
        contactId: 1,
        installments: [{ amount: 100, dueDate: '2026-07-01' }],
      } as any),
    ).resolves.toBeUndefined();
  });
});
