import { Injectable } from '@nestjs/common';
import { CreateBill } from './CreateBill.service';
import { GetBill } from '../queries/GetBill';
import { CreateBillDto } from '../dtos/Bill.dto';

/**
 * Дублирование расхода — счёта поставщика (О2 карты v13).
 *
 * Берёт существующий расход и создаёт из него ЧЕРНОВИК-копию с теми же
 * позициями и реквизитами, чтобы похожий расход не набивать заново. Номер НЕ
 * копируется (он уникален и приходит с бумаги поставщика — у копии его ещё нет),
 * проведённость сбрасывается: пользователь правит копию и проводит её сам.
 */
@Injectable()
export class DuplicateBillService {
  constructor(
    private readonly getBillService: GetBill,
    private readonly createBillService: CreateBill,
  ) {}

  public async duplicate(billId: number) {
    const src: any = await this.getBillService.getBill(billId);

    const dto: CreateBillDto = {
      vendorId: src.vendorId,
      billDate: src.billDate,
      dueDate: src.dueDate,
      referenceNo: src.referenceNo,
      // Копия — всегда черновик; номер пустой (уникален, впишут с новой бумаги).
      open: false,
      billNumber: '',
      note: src.note,
      exchangeRate: src.exchangeRate,
      warehouseId: src.warehouseId,
      branchId: src.branchId,
      projectId: src.projectId,
      isInclusiveTax: src.isInclusiveTax,
      discount: src.discount,
      discountType: src.discountType,
      adjustment: src.adjustment,
      entries: (src.entries ?? []).map((entry: any) => ({
        index: entry.index,
        itemId: entry.itemId,
        rate: entry.rate,
        quantity: entry.quantity,
        discount: entry.discount,
        discountType: entry.discountType,
        description: entry.description,
        taxRateId: entry.taxRateId,
        warehouseId: entry.warehouseId,
        landedCost: entry.landedCost,
      })),
    } as CreateBillDto;

    return this.createBillService.createBill(dto);
  }
}
