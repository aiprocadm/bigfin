// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { NotFoundException } from '@nestjs/common';

import { activeCode } from '../../testing/activeCode';
import { ProjectsApplication } from './Projects.application';
import { PROJECT_STATUS } from './models/Project.model';

/**
 * Справочник направлений (проектов).
 *
 * ЗАЧЕМ ОН ПОЯВИЛСЯ. Колонка `project_id` у проводок и поля «Проект» в формах
 * операций существовали с самого начала, но завести направление было НЕГДЕ:
 * серверных ручек не было ни одной. Поля стояли на экранах и всегда оставались
 * пустыми — возможность, существовавшая только в базе.
 */
const buildApp = (options: {
  projects?: any[];
  counts?: any[];
  onInsert?: (values: any) => void;
  onPatch?: (id: number, values: any) => void;
  onDelete?: (id: number) => void;
}) => {
  const projectModel = () => ({
    query: () => ({
      orderBy: async () => options.projects ?? [],
      insertAndFetch: async (values: any) => {
        options.onInsert?.(values);
        return { id: 99, ...values };
      },
      patchAndFetchById: async (id: number, values: any) => {
        options.onPatch?.(id, values);
        return { id, ...values };
      },
      deleteById: async (id: number) => options.onDelete?.(id),
    }),
  });

  // `tenantKnex` — ФУНКЦИЯ, ВОЗВРАЩАЮЩАЯ knex, а knex сам вызывается с
  // именем таблицы: `this.tenantKnex()('accounts_transactions')`. Заглушка,
  // перепутавшая один уровень, падает с «knex is not a function» — на этом
  // и споткнулась первая версия теста.
  const tableFn = () => {
    const chain: any = {
      select: () => chain,
      count: () => chain,
      whereNotNull: () => chain,
      groupBy: async () => options.counts ?? [],
    };
    return chain;
  };
  const tenantKnex = () => tableFn;

  return new ProjectsApplication(projectModel as any, tenantKnex as any);
};

const project = (id: number, over: any = {}) => ({
  id,
  name: `Направление ${id}`,
  status: PROJECT_STATUS.ACTIVE,
  ...over,
});

describe('справочник направлений', () => {
  it('список отдаёт направления со счётчиком операций', async () => {
    const app = buildApp({
      projects: [project(1), project(2)],
      counts: [{ project_id: 1, total: 7 }],
    });

    const rows = await app.getProjects();

    expect(rows.map((row) => row.transactionsCount)).toEqual([7, 0]);
  });

  it('новое направление по умолчанию действует', async () => {
    // Заводя направление, человек собирается им пользоваться. Спрашивать
    // «включить ли его» — лишний вопрос.
    let saved: any = null;
    const app = buildApp({ onInsert: (values) => (saved = values) });

    await app.createProject({ name: 'Розница' } as any);

    expect(saved.status).toBe(PROJECT_STATUS.ACTIVE);
  });

  it('заданный статус не перетирается', async () => {
    let saved: any = null;
    const app = buildApp({ onInsert: (values) => (saved = values) });

    await app.createProject({
      name: 'Старый объект',
      status: PROJECT_STATUS.ARCHIVED,
    } as any);

    expect(saved.status).toBe(PROJECT_STATUS.ARCHIVED);
  });

  it('несуществующее направление — понятный отказ', async () => {
    const app = buildApp({ projects: [] });

    await expect(app.getProject(5)).rejects.toThrow(NotFoundException);
  });

  it('пустая оценка стоимости остаётся пустой, а не нулём', async () => {
    // Ноль означает «оценили в ноль», пустота — «не оценивали». Разница
    // видна в отчётах, поэтому подменять нельзя.
    const app = buildApp({
      projects: [project(1, { costEstimate: null })],
    });

    const rows = await app.getProjects();

    expect(rows[0].costEstimate).toBeNull();
  });

  describe('удаление', () => {
    it('направление без операций удаляется', async () => {
      let deleted: number | null = null;
      const app = buildApp({
        projects: [project(1)],
        counts: [],
        onDelete: (id) => (deleted = id),
      });

      await app.deleteProject(1);

      expect(deleted).toBe(1);
    });

    it('направление С ОПЕРАЦИЯМИ удалить нельзя', async () => {
      // Иначе прошлые операции остались бы со ссылкой в никуда: отчёт по
      // направлению показал бы пустоту, а деньги были потрачены.
      let deleted: number | null = null;
      const app = buildApp({
        projects: [project(1)],
        counts: [{ project_id: 1, total: 3 }],
        onDelete: (id) => (deleted = id),
      });

      await expect(app.deleteProject(1)).rejects.toThrow(NotFoundException);
      expect(deleted).toBeNull();
    });
  });
});

describe('ручки направлений и правда объявлены', () => {
  const controller = activeCode(
    fs.readFileSync(path.join(__dirname, 'Projects.controller.ts'), 'utf-8'),
  );

  it('витрина зовёт именно этот адрес', () => {
    // Хуки витрины писались давно и ходят на `projects` — серверной части у
    // них не было ни одной.
    expect(controller).toContain("@Controller('projects')");
  });

  it('есть все четыре действия справочника', () => {
    ['@Get()', '@Post()', "@Put(':id')", "@Delete(':id')"].forEach((route) => {
      expect(controller).toContain(route);
    });
  });

  it('правка требует права, и право проверяется стражем', () => {
    // Пометка права без стража — «мнимая защита»: выглядит закрытым, а не
    // проверяется никем.
    expect(controller).toContain('RequirePermission');
    expect(controller).toContain('PermissionGuard');
  });
});
