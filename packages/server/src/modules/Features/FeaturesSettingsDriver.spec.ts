// © 2026 Bigfin
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';

describe('FeaturesSettingsDriver — persistence', () => {
  const makeDriver = () => {
    const set = jest.fn();
    const save = jest.fn().mockResolvedValue(undefined);
    const store = { set, save };
    // конструктор: (configure, featuresConfigure, settingsFactory, tenancyContext)
    const driver = new FeaturesSettingsDriver(
      null as any,
      null as any,
      () => store as any,
      null as any,
    );
    return { driver, set, save };
  };

  it('turnOn записывает флаг И сохраняет стор', async () => {
    const { driver, set, save } = makeDriver();
    await driver.turnOn('deals');
    expect(set).toHaveBeenCalledWith({ group: 'features', key: 'deals', value: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('turnOff сбрасывает флаг И сохраняет стор', async () => {
    const { driver, set, save } = makeDriver();
    await driver.turnOff('deals');
    expect(set).toHaveBeenCalledWith({ group: 'features', key: 'deals', value: false });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
