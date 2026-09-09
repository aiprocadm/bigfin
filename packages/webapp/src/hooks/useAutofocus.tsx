import { useRef, useEffect } from 'react';

/**
 * Ссылка на поле, которое надо навести курсором при появлении.
 *
 * Тип обязателен: без него `useRef()` даёт «неизвестно что», и `.focus()`
 * внутри крючка, и присваивание `ref.current = ref` в четырёх формах
 * считались ошибкой (Д3 карты v75).
 *
 * Значение допускает `null`: поле ввода отдаёт `null`, когда исчезает с
 * экрана.
 */
export default function useAutofocus(focus = true) {
  // Поле бывает и многострочным: окна блокировки наводят курсор на `textarea`
  // (Д9 карты v84). Крючку нужен только `.focus()`.
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current && focus) {
      ref.current.focus();
    }
  }, [ref, focus]);

  return ref;
}
