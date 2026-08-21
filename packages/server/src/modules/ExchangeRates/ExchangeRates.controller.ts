import {
  Controller,
  Get,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { ExchangeRateApplication } from './ExchangeRates.application';
import { ExchangeRateLatestQueryDto } from './dtos/ExchangeRateLatestQuery.dto';
import { ExchangeRateLatestResponseDto } from './dtos/ExchangeRateLatestResponse.dto';

interface RequestWithTenantId extends Request {
  tenantId?: number;
}

@Controller('exchange-rates')
@ApiTags('Exchange Rates')
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRateApp: ExchangeRateApplication,
    private readonly tenancyContext: TenancyContext,
  ) {}

  @Get('/latest')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  @ApiOperation({ summary: 'Get the latest exchange rate' })
  @ApiQuery({
    name: 'from_currency',
    description: 'Source currency code (ISO 4217)',
    required: false,
    type: String,
    example: 'USD',
  })
  @ApiQuery({
    name: 'to_currency',
    description: 'Target currency code (ISO 4217)',
    required: false,
    type: String,
    example: 'EUR',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved exchange rate',
    type: ExchangeRateLatestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency code or service error',
  })
  async getLatestExchangeRate(
    @Query() query: ExchangeRateLatestQueryDto,
    @Req() req: RequestWithTenantId,
  ): Promise<ExchangeRateLatestResponseDto> {
    // Организация берётся из контекста запроса, как во всех остальных
    // контроллерах: поле `req.tenantId` в Bigfin никто не заполняет, из-за
    // чего этот запрос всегда падал с 500 (М3 карты v15).
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const tenantId = metadata?.tenantId ?? req.tenantId;

    const exchangeRate = await this.exchangeRateApp.latest(tenantId, {
      fromCurrency: query.fromCurrency,
      toCurrency: query.toCurrency,
      // Живая проба ловила: объект собирается руками, и забытое поле молча
      // теряется — курс «на дату» приходил сегодняшним (К1 срез 2 карты v17).
      date: query.date,
    });
    return exchangeRate;
  }
}
