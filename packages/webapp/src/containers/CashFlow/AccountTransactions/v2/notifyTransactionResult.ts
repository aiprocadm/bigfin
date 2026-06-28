import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components';

/**
 * Обёртка для мутаций банковских таблиц вкладки «без категории» (D-redesign, слайс 4).
 *
 * По успеху показывает тост-успех с переданным i18n-ключом, по ошибке — общий
 * «что-то пошло не так». Извлечена из 5 одинаковых обработчиков
 * (uncategorize / unmatch / exclude / restore): единственное, чем они различались, —
 * сама мутация и ключ успеха; ветка ошибки везде была идентична.
 *
 * Поведение сохранено: ошибка по-прежнему «гасится» тостом, и итоговый промис
 * успешно резолвится (как и в исходном `.catch`).
 */
export function notifyTransactionResult(
  promise: Promise<unknown>,
  successMessageKey: string,
): Promise<void> {
  return promise
    .then(() => {
      AppToaster.show({
        message: intl.get(successMessageKey),
        intent: Intent.SUCCESS,
      });
    })
    .catch(() => {
      AppToaster.show({
        message: intl.get('something_went_wrong'),
        intent: Intent.DANGER,
      });
    });
}
