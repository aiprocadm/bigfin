// © 2026 Bigfin
import { ForbiddenException } from '@nestjs/common';
import { FeatureGuard } from './Feature.guard';
import { RequireFeature } from './RequireFeature.decorator';
import { Features } from '@/common/types/Features';

/**
 * П1 карты v36. Выключенный модуль — это НЕ «нет прав».
 *
 * Витрина показывала на выключенный раздел красную плашку «У вас нет прав
 * на доступ к этой странице»: она видела код 403 и других примет у ответа
 * не было. Причина названа неверно — права ни при чём, человек сам может
 * включить модуль в настройках, — и вдобавок плашка спорила с экраном,
 * который рядом объяснял, что раздел выключен.
 *
 * Поэтому страж говорит машинной меткой: тип `FEATURE_DISABLED` и имя
 * модуля в payload. По ней витрина отличает выключенный модуль от отказа
 * в правах.
 */
describe('FeatureGuard — выключенный модуль называет себя', () => {
  const context = (handler: any, cls: any = class {}) =>
    ({ getHandler: () => handler, getClass: () => cls }) as any;

  const build = (accessible: Record<string, boolean>) =>
    new FeatureGuard(
      {
        getAllAndOverride: (key: string, targets: any[]) =>
          Reflect.getMetadata(key, targets[0]),
      } as any,
      { accessible: async (f: string) => accessible[f] ?? false } as any,
    );

  const handler = () => {
    const fn = function () {};
    RequireFeature(Features.PAYROLL)({}, 'index', { value: fn } as any);
    return fn;
  };

  const reject = async () => {
    try {
      await build({ payroll: false }).canActivate(context(handler()));
    } catch (error) {
      return error as ForbiddenException;
    }
    throw new Error('страж пропустил выключенный модуль');
  };

  it('отказ несёт тип FEATURE_DISABLED', async () => {
    const error = await reject();

    expect((error.getResponse() as any).errors[0].type).toBe(
      'FEATURE_DISABLED',
    );
  });

  it('в отказе назван сам модуль — по нему видно, что включать', async () => {
    const error = await reject();

    expect((error.getResponse() as any).errors[0].payload).toEqual({
      feature: Features.PAYROLL,
    });
  });

  it('человеку остаётся понятное объяснение', async () => {
    const error = await reject();

    expect((error.getResponse() as any).errors[0].message).toContain(
      'выключен',
    );
  });

  it('код ответа остаётся 403', async () => {
    expect((await reject()).getStatus()).toBe(403);
  });
});
