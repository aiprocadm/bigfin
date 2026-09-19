// © 2026 Bigfin
import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

/** Направление работает или убрано из выбора. */
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

/**
 * Направление (проект) — разрез операций наравне с подразделением и юрлицом.
 *
 * ЧТО ЭТО В BIGFIN. Не управление проектами с задачами и часами: этим здесь
 * заняты «Сделки». Направление — это просто ярлык, по которому предприниматель
 * раскладывает деньги: «розница», «опт», «объект на Ленина». Его вешают на
 * операцию и по нему смотрят отчёты.
 *
 * ПОЧЕМУ ПОЯВИЛСЯ ТОЛЬКО СЕЙЧАС. Колонка `project_id` у проводок и поля
 * «Проект» в формах существовали с самого начала, но завести направление было
 * НЕГДЕ: серверных ручек не было ни одной. Поля стояли на экранах и всегда
 * оставались пустыми.
 *
 * Живёт в ТЕНАНТНОЙ схеме: направления принадлежат одной организации.
 */
export class Project extends TenantBaseModel {
  name!: string;
  /** `active` | `archived`. */
  status!: string;
  contactId!: number | null;
  deadline!: Date | string | null;
  costEstimate!: number | null;

  static get tableName() {
    return 'projects';
  }

  static get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  /** Убранное направление не предлагается в новых операциях. */
  get isActive(): boolean {
    return this.status !== PROJECT_STATUS.ARCHIVED;
  }
}
