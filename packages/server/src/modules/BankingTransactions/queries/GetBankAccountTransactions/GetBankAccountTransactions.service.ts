import { Injectable } from '@nestjs/common';
import { getBankAccountTransactionsDefaultQuery } from './_utils';
import { GetBankAccountTransactionsRepository } from './GetBankAccountTransactionsRepo.service';
import { GetBankAccountTransactions } from './GetBankAccountTransactions';
import { GetBankTransactionsQueryDto } from '../../dtos/GetBankTranasctionsQuery.dto';
import { I18nService } from 'nestjs-i18n';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

@Injectable()
export class GetBankAccountTransactionsService {
  constructor(
    private readonly getBankAccountTransactionsRepository: GetBankAccountTransactionsRepository,
    private readonly i18nService: I18nService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Retrieve the cashflow account transactions report data.
   * @param {ICashflowAccountTransactionsQuery} query -
   * @return {Promise<IInvetoryItemDetailDOO>}
   */
  public async bankAccountTransactions(
    query: GetBankTransactionsQueryDto,
  ) {
    const parsedQuery = {
      ...getBankAccountTransactionsDefaultQuery(),
      ...query,
    };
    this.getBankAccountTransactionsRepository.setQuery(parsedQuery);

    await this.getBankAccountTransactionsRepository.asyncInit();

    // Данные организации: формат даты И ВАЛЮТА УЧЁТА.
    //
    // Валюту раньше не передавали, и общий помощник формата считал её
    // неизвестной — а значит выводил суммы ПО-АНГЛИЙСКИ: «500,000.00»
    // вместо «500 000,00 ₽». Найдено живым проходом на самом частом экране
    // продукта — «Все операции».
    const tenantMetadata = await this.tenancyContext.getTenantMetadata();
    const dateFormat = tenantMetadata?.dateFormat;
    const baseCurrency = tenantMetadata?.baseCurrency;

    // Retrieve the computed report.
    const report = new GetBankAccountTransactions(
      this.getBankAccountTransactionsRepository,
      parsedQuery,
      this.i18nService,
      dateFormat,
      baseCurrency,
    );
    const transactions = report.reportData();
    const pagination = this.getBankAccountTransactionsRepository.pagination;

    return { transactions, pagination };
  }
}
