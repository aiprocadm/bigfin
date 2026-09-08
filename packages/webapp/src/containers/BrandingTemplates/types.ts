

export interface BrandingTemplateValues {
  templateName: string;

  // Company logo
  companyLogoKey?: string;
  companyLogoUri?: string;

  /**
   * Выбранный файл логотипа — до того, как он загружен на сервер. Ставит его
   * поле загрузки (`BrandingCompanyLogoUploadField`), а форма при отправке
   * заливает файл и подставляет полученный ключ в `companyLogoKey`.
   *
   * Подчёркивание в начале — знак «поле формы, а не поле записи»: на сервер
   * оно не уходит. В объявлении его не было вовсе (задел карты v55).
   */
  _companyLogoFile?: File;
}

export interface BrandingState extends ElementPreviewState {
  companyName: string;
  companyAddress: string;

  companyLogoKey: string;
  companyLogoUri: string;

  primaryColor: string;
}

export interface ElementPreviewState {

}