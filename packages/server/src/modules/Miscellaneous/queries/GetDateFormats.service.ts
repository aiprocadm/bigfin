import * as moment from 'moment';
import 'moment/locale/ru';
import { Injectable } from '@nestjs/common';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { DATE_FORMATS } from '../Miscellaneous.constants';

// Импорт локали moment переключает глобальную локаль — возвращаем en,
// русская ставится на каждый вызов формата отдельно (Р2 карты v18).
moment.locale('en');

@Injectable()
export class GetDateFormatsService {
  constructor(private readonly tenancyContext: TenancyContext) {}

  /**
   * Примеры форматов в выпадашке настроек. Словесные месяцы — на языке
   * организации: раньше русская организация видела «22 Aug 2026».
   */
  async getDateFormats() {
    const tenant = await this.tenancyContext.getTenant(true);
    const locale = tenant?.metadata?.language === 'ru' ? 'ru' : 'en';

    return DATE_FORMATS.map((dateFormat) => {
      return {
        label: `${moment().locale(locale).format(dateFormat)} [${dateFormat}]`,
        key: dateFormat,
      };
    });
  }
}
