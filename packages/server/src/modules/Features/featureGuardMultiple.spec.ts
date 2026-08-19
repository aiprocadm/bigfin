// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { FeatureGuard } from './Feature.guard';
import { RequireFeature, REQUIRED_FEATURE_KEY } from './RequireFeature.decorator';
import { Features } from '@/common/types/Features';

/**
 * Под-модуль живёт за ДВУМЯ флагами: своим и родительским (вкладка «KPI»
 * внутри «Зарплаты»). Если пометить ручку только своим флагом, пометка
 * КЛАССА перестаёт действовать (`getAllAndOverride` берёт ближайшую), и
 * ребёнок открывается при выключенном родителе — М2 карты v15.
 */
describe('FeatureGuard — несколько флагов на одной ручке', () => {
  const context = (handler: any, cls: any = class {}) =>
    ({
      getHandler: () => handler,
      getClass: () => cls,
    }) as any;

  const build = (accessible: Record<string, boolean>) =>
    new FeatureGuard(
      { getAllAndOverride: (key: string, targets: any[]) => Reflect.getMetadata(key, targets[0]) } as any,
      { accessible: async (f: string) => accessible[f] ?? false } as any,
    );

  /** Ручка, помеченная парой флагов. */
  const handlerWithBoth = () => {
    const fn = function () {};
    RequireFeature(Features.PAYROLL, Features.PAYROLL_KPI)(
      {},
      'kpi',
      { value: fn } as any,
    );
    return fn;
  };

  it('пометка хранит оба флага', () => {
    expect(Reflect.getMetadata(REQUIRED_FEATURE_KEY, handlerWithBoth())).toEqual(
      [Features.PAYROLL, Features.PAYROLL_KPI],
    );
  });

  it('пропускает, только когда включены ОБА', async () => {
    const guard = build({ payroll: true, payroll_kpi: true });

    await expect(guard.canActivate(context(handlerWithBoth()))).resolves.toBe(
      true,
    );
  });

  it('выключенный родитель закрывает ручку ребёнка', async () => {
    const guard = build({ payroll: false, payroll_kpi: true });

    await expect(
      guard.canActivate(context(handlerWithBoth())),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('выключенный ребёнок закрывает ручку при включённом родителе', async () => {
    const guard = build({ payroll: true, payroll_kpi: false });

    await expect(
      guard.canActivate(context(handlerWithBoth())),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('одиночная пометка по-прежнему работает', async () => {
    const fn = function () {};
    RequireFeature(Features.DEALS)({}, 'list', { value: fn } as any);

    expect(Reflect.getMetadata(REQUIRED_FEATURE_KEY, fn)).toBe(Features.DEALS);
    await expect(
      build({ deals: true }).canActivate(context(fn)),
    ).resolves.toBe(true);
  });
});
