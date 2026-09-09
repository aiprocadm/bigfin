import { InputGroupProps, SwitchProps } from '@blueprintjs/core';
import { FInputGroup, FSwitch, Group, Stack } from '@/components';
import { CLASSES } from '@/constants';

export function ElementCustomizeFieldsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={20}>
      <h4 className={CLASSES.TEXT_MUTED} style={{ fontWeight: 600 }}>
        {label}
      </h4>

      <Stack spacing={14}>{children}</Stack>
    </Stack>
  );
}

/**
 * Строка настройки макета: слева переключатель «показывать ли», справа — поле
 * с подписью, которую надо напечатать.
 *
 * **Имена были перепутаны местами.** `inputGroupProps` уходили в переключатель,
 * а `switchProps` — в поле ввода. Работало это правильно только потому, что
 * все четыре экрана передавали их так же наоборот. Но объявленные типы при
 * этом описывали не то, и `name` в них не помещался — четыре экрана считались
 * ошибкой (Д8 карты v75).
 *
 * Теперь имена совпадают с тем, куда свойства идут. Поведение не изменилось.
 */
export function ElementCustomizeContentItemFieldGroup({
  switchProps,
  inputGroupProps,
}: {
  /** Переключатель «показывать ли». Обязательно поле формы — значит, `name`. */
  switchProps: SwitchProps & { name: string; label?: React.ReactNode };
  /** Поле подписи. Рисуется, только если оно задано. */
  inputGroupProps?: InputGroupProps & { name?: string };
}) {
  return (
    <Group spacing={14} position={'apart'}>
      <FSwitch {...switchProps} fastField />

      {inputGroupProps?.name && (
        <FInputGroup
          {...inputGroupProps}
          // Имя повторено после раскрытия нарочно: условие выше уже проверило,
          // что оно есть, но при раскрытии это знание теряется.
          name={inputGroupProps.name}
          style={{ maxWidth: 150 }}
          fastField
        />
      )}
    </Group>
  );
}
