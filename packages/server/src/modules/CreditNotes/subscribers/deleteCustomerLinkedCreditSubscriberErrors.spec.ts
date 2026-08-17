import * as fs from 'fs';
import * as path from 'path';

/**
 * С1 срез 2 (карта v14): валидатор «у покупателя есть кредит-ноты» обязан
 * ДОЛЕТАТЬ до пользователя. Nest по умолчанию глушит ошибки @OnEvent
 * (грабля v7): валидация срабатывала, писала ошибку в журнал — и удаление
 * шло дальше, падая голым 500 по внешнему ключу.
 */
describe('DeleteCustomerLinkedCreditSubscriber: ошибки не глушатся', () => {
  it('каждый @OnEvent несёт suppressErrors: false', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'DeleteCustomerLinkedCreditSubscriber.ts'),
      'utf-8',
    );
    const onEvents = source.match(/@OnEvent\([^)]*\)/g) ?? [];
    expect(onEvents.length).toBeGreaterThan(0);
    onEvents.forEach((decorator) => {
      expect(decorator).toContain('suppressErrors: false');
    });
  });
});
