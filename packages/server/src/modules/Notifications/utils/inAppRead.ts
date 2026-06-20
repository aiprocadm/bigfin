// © 2026 Bigfin

export interface NotificationRow {
  id: number;
  eventType: string;
  title: string;
  body: string;
  payload: string | null;
  firedAt: string;
}

export interface NotificationView extends NotificationRow {
  read: boolean;
}

/** Помечает каждое уведомление флагом read по множеству прочитанных id. */
export const markReadFlags = (
  notifications: NotificationRow[],
  readIds: number[],
): NotificationView[] => {
  const read = new Set(readIds);
  return notifications.map((n) => ({ ...n, read: read.has(n.id) }));
};

/** Считает непрочитанные: уведомления, чьего id нет в прочитанных. */
export const countUnread = (
  notificationIds: number[],
  readIds: number[],
): number => {
  const read = new Set(readIds);
  return notificationIds.filter((id) => !read.has(id)).length;
};

/** id уведомлений, ещё не прочитанных пользователем (для mark-all). */
export const selectUnreadIds = (
  notificationIds: number[],
  readIds: number[],
): number[] => {
  const read = new Set(readIds);
  return notificationIds.filter((id) => !read.has(id));
};
