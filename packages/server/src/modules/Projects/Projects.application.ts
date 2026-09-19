// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';

import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';

import { Project, PROJECT_STATUS } from './models/Project.model';
import { CreateProjectDto, EditProjectDto } from './dtos/Project.dto';

export interface ProjectRow {
  id: number;
  name: string;
  status: string;
  contactId: number | null;
  deadline: Date | string | null;
  costEstimate: number | null;
  /** Сколько операций уже отнесено на направление. */
  transactionsCount: number;
}

/**
 * Справочник направлений (проектов).
 *
 * ЗАЧЕМ ОН ПОЯВИЛСЯ. Колонка `project_id` у проводок и поля «Проект» в формах
 * операций существовали с самого начала, но завести направление было НЕГДЕ:
 * серверных ручек не было ни одной. Поля стояли на экранах и всегда оставались
 * пустыми — возможность, существовавшая только в базе.
 */
@Injectable()
export class ProjectsApplication {
  constructor(
    @Inject(Project.name)
    private readonly projectModel: TenantModelProxy<typeof Project>,

    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,
  ) {}

  /** Список направлений со счётчиком отнесённых операций. */
  public async getProjects(): Promise<ProjectRow[]> {
    const projects: any[] = await this.projectModel()
      .query()
      .orderBy('name', 'asc');

    const counts = await this.countTransactionsByProject();

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status ?? PROJECT_STATUS.ACTIVE,
      contactId: project.contactId ?? null,
      deadline: project.deadline ?? null,
      costEstimate:
        project.costEstimate === null || project.costEstimate === undefined
          ? null
          : Number(project.costEstimate),
      transactionsCount: counts.get(project.id) ?? 0,
    }));
  }

  public async getProject(id: number): Promise<ProjectRow> {
    const rows = await this.getProjects();
    const found = rows.find((row) => row.id === Number(id));

    if (!found) throw new NotFoundException('PROJECT_NOT_FOUND');

    return found;
  }

  public async createProject(dto: CreateProjectDto) {
    return this.projectModel()
      .query()
      .insertAndFetch({
        ...dto,
        status: dto.status ?? PROJECT_STATUS.ACTIVE,
      } as any);
  }

  public async editProject(id: number, dto: EditProjectDto) {
    await this.getProject(id);

    return this.projectModel()
      .query()
      .patchAndFetchById(id, { ...dto } as any);
  }

  /**
   * Удаление направления.
   *
   * НАПРАВЛЕНИЕ С ОПЕРАЦИЯМИ УДАЛИТЬ НЕЛЬЗЯ. Иначе прошлые операции остались
   * бы со ссылкой в никуда: отчёт по направлению показал бы пустоту, а деньги
   * при этом были потрачены. Такое направление убирают из выбора статусом.
   */
  public async deleteProject(id: number) {
    const project = await this.getProject(id);

    if (project.transactionsCount > 0) {
      throw new NotFoundException('PROJECT_HAS_TRANSACTIONS');
    }
    await this.projectModel().query().deleteById(id);
  }

  /** Сколько проводок отнесено на каждое направление. */
  private async countTransactionsByProject(): Promise<Map<number, number>> {
    const knex = this.tenantKnex();
    const rows: any[] = await knex('accounts_transactions')
      .select('project_id')
      .count({ total: 'id' })
      .whereNotNull('project_id')
      .groupBy('project_id');

    return new Map(
      rows.map((row) => [
        Number(row.project_id ?? row.projectId),
        Number(row.total ?? row.TOTAL ?? 0),
      ]),
    );
  }
}
