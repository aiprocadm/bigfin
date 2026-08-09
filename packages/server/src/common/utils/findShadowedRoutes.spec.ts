// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import {
  findShadowedRoutes,
  parseRouteDeclarations,
  shadows,
} from './findShadowedRoutes';

describe('findShadowedRoutes — разбор и правило перекрытия', () => {
  it('читает маршруты в порядке файла', () => {
    const source = [
      "  @Get('due')",
      '  getDue() {}',
      "  @Get(':id')",
      '  getOne() {}',
      '  @Post()',
      '  create() {}',
    ].join('\n');

    expect(parseRouteDeclarations(source)).toEqual([
      { method: 'GET', path: 'due', line: 1 },
      { method: 'GET', path: ':id', line: 3 },
      { method: 'POST', path: '', line: 5 },
    ]);
  });

  it('параметр перехватывает конкретный путь той же длины', () => {
    expect(shadows(':id', 'due')).toBe(true);
  });

  it('конкретный путь параметр не перехватывает', () => {
    expect(shadows('due', ':id')).toBe(false);
  });

  it('пути разной длины друг другу не мешают', () => {
    expect(shadows(':id', ':id/payments')).toBe(false);
    expect(shadows(':id', '')).toBe(false);
  });

  it('корневой маршрут ничего не перехватывает', () => {
    expect(shadows('', 'due')).toBe(false);
  });

  it('одинаковые маршруты — тоже перекрытие', () => {
    expect(shadows('due', 'due')).toBe(true);
  });

  it('параметр в середине пути перехватывает такой же по форме путь', () => {
    expect(shadows(':id/payments', '5/payments')).toBe(true);
    expect(shadows(':id/payments', ':id/mail')).toBe(false);
  });

  it('находит перекрытую ручку и говорит, кто её перехватил', () => {
    // Ровно тот случай, что нашёлся вживую в Д4: `/bills/due` не работал.
    const source = [
      "  @Get(':id')",
      '  getBill() {}',
      '',
      "  @Get('due')",
      '  getDueBills() {}',
    ].join('\n');

    expect(findShadowedRoutes('Bills.controller.ts', source)).toEqual([
      {
        file: 'Bills.controller.ts',
        method: 'GET',
        path: 'due',
        line: 4,
        shadowedBy: ':id',
        shadowedByLine: 1,
      },
    ]);
  });

  it('разные методы друг другу не мешают', () => {
    const source = ["  @Get(':id')", "  @Post('due')"].join('\n');

    expect(findShadowedRoutes('X.controller.ts', source)).toEqual([]);
  });

  it('правильный порядок объявления претензий не вызывает', () => {
    const source = ["  @Get('due')", "  @Get(':id')", '  @Get()'].join('\n');

    expect(findShadowedRoutes('X.controller.ts', source)).toEqual([]);
  });
});

/**
 * Страховка от регресса на всей кодовой базе: ни одна ручка не должна быть
 * недостижима из-за порядка объявления. Класс дефектов «есть, но не открыть»
 * повторялся семь раз — дешевле проверять машиной.
 */
describe('ни одна ручка не перекрыта параметрическим маршрутом', () => {
  const modulesDir = path.resolve(__dirname, '../../modules');

  const controllerFiles = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return controllerFiles(full);
        return entry.name.endsWith('.controller.ts') ? [full] : [];
      });

  it('контроллеры найдены', () => {
    // Если обход каталога сломается, проверка ниже позеленеет «бесплатно».
    expect(controllerFiles(modulesDir).length).toBeGreaterThan(30);
  });

  it('перекрытых ручек нет', () => {
    const shadowed = controllerFiles(modulesDir).flatMap((file) =>
      findShadowedRoutes(
        path.relative(modulesDir, file),
        fs.readFileSync(file, 'utf8'),
      ),
    );

    expect(shadowed).toEqual([]);
  });
});
