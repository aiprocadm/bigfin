import { DynamicListService } from '@/modules/DynamicListing/DynamicList.service';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { Inject, Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { Customer } from '../models/Customer';
import { CustomerTransfromer } from './CustomerTransformer';
import {
  GetCustomersResponse,
  ICustomersFilter,
} from '../types/Customers.types';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  applyDebtNatureFilter,
  parseDebtNature,
} from '@/modules/Contacts/queries/applyDebtNatureFilter';
import { GetCustomersQueryDto } from '../dtos/GetCustomersQuery.dto';

@Injectable()
export class GetCustomers {
  constructor(
    private dynamicListService: DynamicListService,
    private transformer: TransformerInjectable,

    @Inject(Customer.name)
    private customerModel: TenantModelProxy<typeof Customer>,
  ) {}

  /**
   * Parses customers list filter DTO.
   * @param filterDTO -
   */
  private parseCustomersListFilterDTO(filterDTO) {
    return R.compose(this.dynamicListService.parseStringifiedFilter)(filterDTO);
  }

  /**
   * Retrieves customers paginated list.
   * @param {GetCustomersQueryDto} filter - Cusotmers filter.
   * @returns {Promise<GetCustomersResponse>}
   */
  public async getCustomersList(
    filterDto: GetCustomersQueryDto,
  ): Promise<GetCustomersResponse> {
    const _filterDto = {
      inactiveMode: false,
      sortOrder: 'desc',
      columnSortBy: 'created_at',
      page: 1,
      pageSize: 12,
      ...filterDto,
    };
    // Parses customers list filter DTO.
    const filter = this.parseCustomersListFilterDTO(_filterDto);

    const dynamicList = await this.dynamicListService.dynamicList(
      this.customerModel(),
      filter,
    );
    const { results, pagination } = await this.customerModel()
      .query()
      .onBuild((builder) => {
        dynamicList.buildQuery()(builder);
        builder.modify('inactiveMode', filter.inactiveMode);

        // Отбор по природе долга (FIN-023 ТЗ-2). Подзапросом, а не списком
        // номеров: список на несколько тысяч значений не помещается в адрес.
        applyDebtNatureFilter(builder, parseDebtNature(filterDto.debtNature));
      })
      .pagination(filter.page - 1, filter.pageSize);

    // Retrieves the transformed customers.
    const customers = await this.transformer.transform(
      results,
      new CustomerTransfromer(),
    );
    return {
      customers,
      pagination,
      filterMeta: dynamicList.getResponseMeta(),
    };
  }
}
