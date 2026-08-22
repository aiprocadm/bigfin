import { defaultTo } from 'lodash';
import { IOrganizationBuildDTO } from './Organization.types';
import { BuildOrganizationDto } from './dtos/Organization.dto';

/**
 * Transformes build DTO object.
 * @param {IOrganizationBuildDTO} buildDTO
 * @returns {IOrganizationBuildDTO}
 */
export const transformBuildDto = (
  buildDTO: BuildOrganizationDto,
): BuildOrganizationDto => {
  return {
    ...buildDTO,
    // Русская организация по умолчанию получает «28.07.2026»; словесный
    // формат оставлен прочим языкам (Р2 карты v18).
    dateFormat: defaultTo(
      buildDTO.dateFormat,
      buildDTO.language === 'ru' ? 'DD.MM.YYYY' : 'DD MMM YYYY',
    ),
  };
};
