// © 2026 Bigfin
import 'reflect-metadata';
import { REQUIRED_FEATURE_KEY } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { PayrollController } from './Payroll.controller';

/**
 * М2 карты v15: у «KPI и премий» появился тумблер, значит у него обязан быть
 * и серверный замок. Раньше KPI-ручки закрывал только родительский флаг
 * «Зарплата»: выключенный KPI продолжал отдавать планы и премии.
 *
 * Флага здесь ДВА: пометка на ручке перекрывает пометку класса, поэтому
 * родительский флаг обязан быть назван явно.
 */
describe('KPI-ручки зарплаты закрыты своим флагом', () => {
  const proto = PayrollController.prototype as any;

  it.each([
    ['getKpiTargets'],
    ['createKpiTarget'],
    ['editKpiTarget'],
    ['deleteKpiTarget'],
    ['getKpiSummary'],
  ])('%s требует «Зарплату» и «KPI»', (method) => {
    expect(Reflect.getMetadata(REQUIRED_FEATURE_KEY, proto[method])).toEqual([
      Features.PAYROLL,
      Features.PAYROLL_KPI,
    ]);
  });

  it('обычные ручки зарплаты остались за одним флагом', () => {
    // Иначе выключенный KPI закрыл бы саму зарплату.
    expect(
      Reflect.getMetadata(REQUIRED_FEATURE_KEY, proto.getEmployees),
    ).toBeUndefined();
    expect(Reflect.getMetadata(REQUIRED_FEATURE_KEY, PayrollController)).toBe(
      Features.PAYROLL,
    );
  });
});
