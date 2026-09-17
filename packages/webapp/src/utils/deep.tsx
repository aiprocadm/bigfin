import _ from 'lodash';
import Deepdash from 'deepdash';

/**
 * Сборка deepdash поверх lodash — ею пользуется разбор импорта.
 *
 * Жившего здесь `filterValuesDeep` больше нет: его не ввозил никто
 * (Д6 карты v85).
 */
export const deepdash = Deepdash(_);
