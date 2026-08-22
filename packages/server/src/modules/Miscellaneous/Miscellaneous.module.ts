import { Module } from '@nestjs/common';
import { GetDateFormatsService } from './queries/GetDateFormats.service';
import { MiscellaneousController } from './Miscellaneous.controller';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

@Module({
  providers: [GetDateFormatsService, TenancyContext],
  exports: [GetDateFormatsService],
  controllers: [MiscellaneousController],
})
export class MiscellaneousModule {}
