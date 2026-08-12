export interface AttachmentLinkDTO {
  key: string;
}

export enum AttachmentAction {
  View = 'View',
  /**
   * Приложить файл и привязать его к документу. Права на это не было вовсе:
   * у вложений значились только просмотр и удаление, поэтому файл мог
   * приложить кто угодно.
   */
  Create = 'Create',
  Delete = 'Delete',
}
