import { Injectable } from '@nestjs/common';
import { CreateSaleInvoice } from './CreateSaleInvoice.service';
import { GetSaleInvoice } from '../queries/GetSaleInvoice.service';
import { CreateSaleInvoiceDto } from '../dtos/SaleInvoice.dto';

/**
 * Дублирование счёта покупателя (О2 карты v13).
 *
 * Берёт существующий счёт и создаёт из него ЧЕРНОВИК-копию с теми же
 * позициями и реквизитами, чтобы похожий счёт не набивать заново. Номер НЕ
 * копируется (он уникален — новый счёт получит свой), проведённость сбрасывается
 * в «черновик»: пользователь правит копию и проводит её сам.
 */
@Injectable()
export class DuplicateSaleInvoiceService {
  constructor(
    private readonly getSaleInvoiceService: GetSaleInvoice,
    private readonly createSaleInvoiceService: CreateSaleInvoice,
  ) {}

  public async duplicate(saleInvoiceId: number) {
    const src: any = await this.getSaleInvoiceService.getSaleInvoice(
      saleInvoiceId,
    );

    const dto: CreateSaleInvoiceDto = {
      customerId: src.customerId,
      invoiceDate: src.invoiceDate,
      dueDate: src.dueDate,
      referenceNo: src.referenceNo,
      // Копия — всегда черновик; номер новый (не копируем — он уникален).
      delivered: false,
      invoiceMessage: src.invoiceMessage,
      termsConditions: src.termsConditions,
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
      })),
    } as CreateSaleInvoiceDto;

    return this.createSaleInvoiceService.createSaleInvoice(dto);
  }
}
