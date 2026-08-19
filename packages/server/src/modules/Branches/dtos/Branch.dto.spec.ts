// © 2026 Bigfin
import { snakeToCamel } from '@/common/interceptors/serialize.interceptor';
import { ValidationPipe } from '@/common/pipes/ClassValidation.pipe';
import { CreateBranchDto } from './Branch.dto';

/**
 * М3 срез 2 (карта v15). Тело запроса переименовывает общий перехватчик, а
 * поле телефона было объявлено в snake_case — значение не совпадало с именем
 * поля и выбрасывалось. Филиал сохранялся БЕЗ телефона, молча.
 */
describe('CreateBranchDto', () => {
  const pipe = new ValidationPipe();
  const meta = { type: 'body', metatype: CreateBranchDto } as any;

  it('телефон филиала доходит до сохранения', async () => {
    const result: any = await pipe.transform(
      snakeToCamel({ name: 'Склад на Урале', phone_number: '+7 900 000-00-00' }),
      meta,
    );

    expect(result.phoneNumber).toBe('+7 900 000-00-00');
  });

  it('название филиала тоже на месте', async () => {
    const result: any = await pipe.transform(
      snakeToCamel({ name: 'Склад на Урале' }),
      meta,
    );

    expect(result.name).toBe('Склад на Урале');
  });
});
