import { Injectable } from '@nestjs/common';
import { CreatePlannedOperationService } from './commands/CreatePlannedOperation.service';
import { EditPlannedOperationService } from './commands/EditPlannedOperation.service';
import { DeletePlannedOperationService } from './commands/DeletePlannedOperation.service';
import { GetPlannedOperationsService } from './queries/GetPlannedOperations.service';
import { GetPaymentCalendarForecastService } from './queries/GetPaymentCalendarForecast.service';
import {
  CreatePlannedOperationDto,
  EditPlannedOperationDto,
} from './dtos/PlannedOperation.dto';
import { GetPlannedOperationsQueryDto } from './dtos/GetPlannedOperationsQuery.dto';
import { GetPaymentCalendarQueryDto } from './dtos/GetPaymentCalendarQuery.dto';

@Injectable()
export class PaymentCalendarApplication {
  constructor(
    private readonly createOperationService: CreatePlannedOperationService,
    private readonly editOperationService: EditPlannedOperationService,
    private readonly deleteOperationService: DeletePlannedOperationService,
    private readonly getOperationsService: GetPlannedOperationsService,
    private readonly forecastService: GetPaymentCalendarForecastService,
  ) {}

  public createPlannedOperation(dto: CreatePlannedOperationDto) {
    return this.createOperationService.create(dto);
  }

  public editPlannedOperation(id: number, dto: EditPlannedOperationDto) {
    return this.editOperationService.edit(id, dto);
  }

  public deletePlannedOperation(id: number) {
    return this.deleteOperationService.delete(id);
  }

  public getPlannedOperations(filter: GetPlannedOperationsQueryDto) {
    return this.getOperationsService.getPlannedOperations(filter);
  }

  public getForecast(tenantId: number, query: GetPaymentCalendarQueryDto) {
    return this.forecastService.getForecast(tenantId, query);
  }
}
