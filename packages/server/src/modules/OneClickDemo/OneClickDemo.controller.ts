import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { PublicRoute } from '@/modules/Auth/guards/jwt.guard';
import { CreateOneClickDemoService } from './commands/CreateOneClickDemo.service';
import { OneClickDemoSigninService } from './commands/OneClickDemoSignin.service';
import { GetOneClickDemoBuildJobService } from './queries/GetOneClickDemoBuildJob.service';
import {
  CreateOneClickDemoDto,
  OneClickDemoBuildJobResponseDto,
  OneClickDemoResponseDto,
  OneClickDemoSigninDto,
} from './dtos/OneClickDemo.dto';

@Controller('/demo')
@ApiTags('One-click demo')
@ApiExtraModels(OneClickDemoResponseDto, OneClickDemoBuildJobResponseDto)
@PublicRoute()
export class OneClickDemoController {
  constructor(
    private readonly createOneClickDemoService: CreateOneClickDemoService,
    private readonly oneClickDemoSigninService: OneClickDemoSigninService,
    private readonly getBuildJobService: GetOneClickDemoBuildJobService,
  ) {}

  @Post('/one_click')
  // Каждый вызов создаёт организацию и базу под неё — предел частоты по
  // адресу обязателен, даже при включённом флаге (Д1 карты v18).
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Creates a one-click demo organization.' })
  @ApiResponse({
    status: 200,
    description: 'The demo organization is being built.',
    schema: { $ref: getSchemaPath(OneClickDemoResponseDto) },
  })
  async createOneClickDemo(@Body() body: CreateOneClickDemoDto = {}) {
    // Отрасль необязательна: кнопка «посмотреть продукт» работает и без
    // выбора, а служба сама сведёт пустое к самому частому случаю.
    const result = await this.createOneClickDemoService.createOneClickDemo(
      body?.industry,
    );

    return {
      type: 'success',
      code: 'ONE_CLICK_DEMO.CREATED',
      message: 'The one-click demo organization has been created.',
      data: result,
    };
  }

  @Get('/one_click/:demoId/build_job')
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Retrieves the demo organization build state.' })
  @ApiParam({ name: 'demoId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'The demo organization build job state.',
    schema: { $ref: getSchemaPath(OneClickDemoBuildJobResponseDto) },
  })
  getBuildJob(@Param('demoId') demoId: string) {
    return this.getBuildJobService.getBuildJobState(demoId);
  }

  @Post('/one_click_signin')
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @HttpCode(200)
  @ApiOperation({ summary: 'Signs in to the created demo organization.' })
  signin(@Body() body: OneClickDemoSigninDto) {
    return this.oneClickDemoSigninService.signin(body.demoId);
  }
}
