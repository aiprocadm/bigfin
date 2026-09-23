// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { GetPaymentRequestsService } from './queries/GetPaymentRequests.service';
import { GetPaymentRequestService } from './queries/GetPaymentRequest.service';
import { CreatePaymentRequestService } from './commands/CreatePaymentRequest.service';
import { ApprovePaymentRequestService } from './commands/ApprovePaymentRequest.service';
import { RejectPaymentRequestService } from './commands/RejectPaymentRequest.service';
import { CancelPaymentRequestService } from './commands/CancelPaymentRequest.service';
import { CreatePaymentRequestDto, EditPaymentRequestDto } from './dtos/PaymentRequest.dto';
import { EditPaymentRequestService } from './commands/EditPaymentRequest.service';
import { GetPaymentRequestsQueryDto } from './dtos/GetPaymentRequestsQuery.dto';

@Injectable()
export class PaymentRequestsApplication {
  constructor(
    private readonly listService: GetPaymentRequestsService,
    private readonly getService: GetPaymentRequestService,
    private readonly createService: CreatePaymentRequestService,
    private readonly approveService: ApprovePaymentRequestService,
    private readonly rejectService: RejectPaymentRequestService,
    private readonly cancelService: CancelPaymentRequestService,
    private readonly editService: EditPaymentRequestService,
  ) {}

  public getPaymentRequests(query: GetPaymentRequestsQueryDto) {
    return this.listService.getPaymentRequests(query);
  }

  public getPaymentRequest(id: number) {
    return this.getService.getPaymentRequest(id);
  }

  public createPaymentRequest(dto: CreatePaymentRequestDto) {
    return this.createService.create(dto);
  }

  /** Правка черновика (FT-053 ТЗ-3). */
  public editPaymentRequest(id: number, dto: EditPaymentRequestDto) {
    return this.editService.edit(id, dto);
  }

  /** Черновик → на согласование (FT-053 ТЗ-3). */
  public submitPaymentRequest(id: number) {
    return this.editService.submit(id);
  }

  public approvePaymentRequest(id: number) {
    return this.approveService.approve(id);
  }

  public rejectPaymentRequest(id: number) {
    return this.rejectService.reject(id);
  }

  public cancelPaymentRequest(id: number, canManageAll = false) {
    return this.cancelService.cancel(id, canManageAll);
  }
}
