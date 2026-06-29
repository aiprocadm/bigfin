// © 2026 Bigfin
import { BadRequestException } from '@nestjs/common';
import { FeaturesController } from './Features.controller';

describe('FeaturesController', () => {
  const makeCtrl = () => {
    const manager = {
      all: jest.fn().mockResolvedValue([{ name: 'deals', isAccessible: true, defaultAccessible: false }]),
      turnOn: jest.fn().mockResolvedValue(undefined),
      turnOff: jest.fn().mockResolvedValue(undefined),
    };
    return { ctrl: new FeaturesController(manager as any), manager };
  };

  it('all() возвращает список фич менеджера', async () => {
    const { ctrl, manager } = makeCtrl();
    const res = await ctrl.all();
    expect(manager.all).toHaveBeenCalled();
    expect(res).toEqual([{ name: 'deals', isAccessible: true, defaultAccessible: false }]);
  });

  it('turnOn разрешённого модуля вызывает manager.turnOn', async () => {
    const { ctrl, manager } = makeCtrl();
    await ctrl.turnOn('deals');
    expect(manager.turnOn).toHaveBeenCalledWith('deals');
  });

  it('turnOn технического флага отвергается (BadRequest)', async () => {
    const { ctrl, manager } = makeCtrl();
    await expect(ctrl.turnOn('customers_list_v2')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.turnOn).not.toHaveBeenCalled();
  });

  it('turnOff неизвестного ключа отвергается (BadRequest)', async () => {
    const { ctrl, manager } = makeCtrl();
    await expect(ctrl.turnOff('nonsense')).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.turnOff).not.toHaveBeenCalled();
  });
});
