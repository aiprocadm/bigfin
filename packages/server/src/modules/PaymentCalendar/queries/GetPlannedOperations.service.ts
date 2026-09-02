import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PlannedOperation } from '../models/PlannedOperation.model';
import { GetPlannedOperationsQueryDto } from '../dtos/GetPlannedOperationsQuery.dto';
import { applyKeywordSearch } from '@/common/utils/keywordSearch';
import { applyListCap, splitCapped } from '@/common/utils/listCap';

@Injectable()
export class GetPlannedOperationsService {
  constructor(
    @Inject(PlannedOperation.name)
    private readonly operationModel: TenantModelProxy<typeof PlannedOperation>,
  ) {}

  /**
   * Retrieves planned operations (optionally filtered).
   * @param {GetPlannedOperationsQueryDto} filterDto
   * @returns {Promise<{ data: PlannedOperation[] }>}
   */
  public async getPlannedOperations(
    filterDto: GetPlannedOperationsQueryDto,
  ): Promise<{ data: PlannedOperation[]; truncated: boolean }> {
    const data: any[] = await this.operationModel()
      .query()
      .onBuild((query) => {
        if (filterDto.direction) {
          query.modify('filterByDirection', filterDto.direction);
        }
        if (filterDto.accountId) {
          query.modify('filterByAccount', filterDto.accountId);
        }
        if (filterDto.fromDate) {
          query.where('plannedDate', '>=', filterDto.fromDate);
        }
        if (filterDto.toDate) {
          query.where('plannedDate', '<=', filterDto.toDate);
        }
        applyKeywordSearch(
          query,
          PlannedOperation.searchColumns,
          filterDto.keyword,
        );
        query.orderBy('plannedDate', 'asc');
        applyListCap(query);
      });

    const { items, truncated } = splitCapped(data);

    return { data: items, truncated };
  }
}
