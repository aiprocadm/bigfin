// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Account } from '@/modules/Accounts/models/Account.model';
import { CommandPaymentRequestValidatorService } from './CommandPaymentRequestValidator.service';

const model = (found: any) => () => ({
  query: () => ({ findById: async () => found }),
});

describe('CommandPaymentRequestValidatorService', () => {
  const build = async (article: any, contact: any, account: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandPaymentRequestValidatorService,
        { provide: ManagementArticle.name, useValue: model(article) },
        { provide: Contact.name, useValue: model(contact) },
        { provide: Account.name, useValue: model(account) },
      ],
    }).compile();
    return ref.get(CommandPaymentRequestValidatorService);
  };

  it('бросает ARTICLE_NOT_FOUND для несуществующей статьи', async () => {
    const v = await build(null, { id: 1 }, { id: 1 });
    await expect(v.validateRefs({ articleId: 9 })).rejects.toMatchObject({
      errorType: 'ARTICLE_NOT_FOUND',
    });
  });

  it('бросает ACCOUNT_NOT_FOUND для несуществующего счёта', async () => {
    const v = await build({ id: 1 }, { id: 1 }, null);
    await expect(v.validateRefs({ accountId: 9 })).rejects.toMatchObject({
      errorType: 'ACCOUNT_NOT_FOUND',
    });
  });

  it('проходит, когда ссылки не заданы', async () => {
    const v = await build(null, null, null);
    await expect(v.validateRefs({})).resolves.toBeUndefined();
  });
});
