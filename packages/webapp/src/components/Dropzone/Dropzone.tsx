import React from 'react';
import { Ref, useCallback } from 'react';
import clsx from 'classnames';
import {
  Accept,
  DropEvent,
  FileError,
  FileRejection,
  FileWithPath,
  useDropzone,
} from 'react-dropzone-esm';
import { DropzoneProvider } from './DropzoneProvider';
import { DropzoneAccept, DropzoneIdle, DropzoneReject } from './DropzoneStatus';
import { Box } from '../Layout';
import { CloudLoadingIndicator } from '../Indicator';
import styles from './Dropzone.module.css';

/**
 * Рамка перенесена из чужой библиотеки (Mantine), а её в проекте нет: виды
 * `MantineColor`, `MantineRadius`, `LoaderProps` и `Factory` здесь просто
 * не существовали. Заменены своими — цвет и скругление задаются обычной
 * строкой CSS (Д17 карты v88).
 */
export type DropzoneColor = string;
export type DropzoneRadius = string | number;

export type DropzoneStylesNames = 'root' | 'inner';
export type DropzoneVariant = 'filled' | 'light';
export type DropzoneCssVariables = {
  root:
  | '--dropzone-radius'
  | '--dropzone-accept-color'
  | '--dropzone-accept-bg'
  | '--dropzone-reject-color'
  | '--dropzone-reject-bg';
};

export interface DropzoneProps {
  /** Содержимое рамки. Компонент его рисует, но в объявлении его не было —
   *  оба места применения считались ошибкой (Д29 карты v75). */
  children?: React.ReactNode;

  /** Свои имена стилей для рамки и содержимого. Компонент их читает
   *  (`classNames?.root`, `classNames?.content`), но в объявлении строка
   *  была закомментирована (Д29 карты v75). */
  classNames?: { root?: string; content?: string; [key: string]: string | undefined };

  /** Key of `theme.colors` or any valid CSS color to set colors of `Dropzone.Accept`, `theme.primaryColor` by default */
  acceptColor?: DropzoneColor;

  /** Key of `theme.colors` or any valid CSS color to set colors of `Dropzone.Reject`, `'red'` by default */
  rejectColor?: DropzoneColor;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius`, numbers are converted to rem, `theme.defaultRadius` by default */
  radius?: DropzoneRadius;

  /** Determines whether files capturing should be disabled, `false` by default */
  disabled?: boolean;

  /** Called when any files are dropped to the dropzone */
  onDropAny?: (files: FileWithPath[], fileRejections: FileRejection[]) => void;

  /** Called when valid files are dropped to the dropzone */
  onDrop: (files: FileWithPath[]) => void;

  /** Called when dropped files do not meet file restrictions */
  onReject?: (fileRejections: FileRejection[]) => void;

  /** Determines whether a loading overlay should be displayed over the dropzone, `false` by default */
  loading?: boolean;

  /** Mime types of the files that dropzone can accepts. By default, dropzone accepts all file types. */
  accept?: Accept | string[];

  /** A ref function which when called opens the file system file picker */
  openRef?: React.ForwardedRef<() => void | undefined>;

  /** Determines whether multiple files can be dropped to the dropzone or selected from file system picker, `true` by default */
  multiple?: boolean;

  /** Maximum file size in bytes */
  maxSize?: number;

  /** Name of the form control. Submitted with the form as part of a name/value pair. */
  name?: string;

  /** Maximum number of files that can be picked at once */
  maxFiles?: number;

  /** Set to autofocus the root element */
  autoFocus?: boolean;

  /** If `false`, disables click to open the native file selection dialog */
  activateOnClick?: boolean;

  /** If `false`, disables drag 'n' drop */
  activateOnDrag?: boolean;

  /** If `false`, disables Space/Enter to open the native file selection dialog. Note that it also stops tracking the focus state. */
  activateOnKeyboard?: boolean;

  /** If `false`, stops drag event propagation to parents */
  dragEventsBubbling?: boolean;

  /** Called when the `dragenter` event occurs */
  onDragEnter?: (event: React.DragEvent<HTMLElement>) => void;

  /** Called when the `dragleave` event occurs */
  onDragLeave?: (event: React.DragEvent<HTMLElement>) => void;

  /** Called when the `dragover` event occurs */
  onDragOver?: (event: React.DragEvent<HTMLElement>) => void;

  /** Called when user closes the file selection dialog with no selection */
  onFileDialogCancel?: () => void;

  /** Called when user opens the file selection dialog */
  onFileDialogOpen?: () => void;

  /** If `false`, allow dropped items to take over the current browser window */
  preventDropOnDocument?: boolean;

  /** Set to true to use the File System Access API to open the file picker instead of using an <input type="file"> click event, defaults to true */
  useFsAccessApi?: boolean;

  /** Use this to provide a custom file aggregator */
  getFilesFromEvent?: (
    event: DropEvent,
  ) => Promise<Array<File | DataTransferItem>>;

  /** Custom validation function. It must return null if there's no errors. */
  validator?: <T extends File>(file: T) => FileError | FileError[] | null;

  /** Determines whether pointer events should be enabled on the inner element, `false` by default */
  enablePointerEvents?: boolean;

  /** Props passed down to the Loader component */
  loaderProps?: Record<string, any>;

  /** Props passed down to the internal Input component */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}


const defaultProps: Partial<DropzoneProps> = {
  loading: false,
  multiple: true,
  maxSize: Infinity,
  autoFocus: false,
  activateOnClick: true,
  activateOnDrag: true,
  dragEventsBubbling: true,
  activateOnKeyboard: true,
  useFsAccessApi: true,
  // `variant` компонент не читает — единственное его упоминание в теле
  // закомментировано; в объявлении свойств его тоже нет (Д17 карты v88).
  rejectColor: 'red',
};

export const Dropzone = (_props: DropzoneProps) => {
  const {
    // classNames,
    // className,
    // style,
    // styles,
    // unstyled,
    // vars,
    radius,
    disabled,
    loading,
    multiple,
    maxSize,
    accept,
    children,
    onDropAny,
    onDrop,
    onReject,
    openRef,
    name,
    maxFiles,
    autoFocus,
    activateOnClick,
    activateOnDrag,
    dragEventsBubbling,
    activateOnKeyboard,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onFileDialogCancel,
    onFileDialogOpen,
    preventDropOnDocument,
    useFsAccessApi,
    getFilesFromEvent,
    validator,
    rejectColor,
    acceptColor,
    enablePointerEvents,
    loaderProps,
    inputProps,
    // mod,
    classNames,
    ...others
  } = {
    ...defaultProps,
    ..._props,
  };

  const { getRootProps, getInputProps, isDragAccept, isDragReject, open } =
    useDropzone({
      onDrop: onDropAny,
      onDropAccepted: onDrop,
      onDropRejected: onReject,
      disabled: disabled || loading,
      accept: Array.isArray(accept)
        ? accept.reduce((r, key) => ({ ...r, [key]: [] }), {})
        : accept,
      multiple,
      maxSize,
      maxFiles,
      autoFocus,
      noClick: !activateOnClick,
      noDrag: !activateOnDrag,
      noDragEventsBubbling: !dragEventsBubbling,
      noKeyboard: !activateOnKeyboard,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onFileDialogCancel,
      onFileDialogOpen,
      preventDropOnDocument,
      useFsAccessApi,
      validator,
      ...(getFilesFromEvent ? { getFilesFromEvent } : null),
    });

  const isIdle = !isDragAccept && !isDragReject;
  assignRef(openRef, open);

  return (
    <DropzoneProvider
      value={{ accept: isDragAccept, reject: isDragReject, idle: isIdle }}
    >
      <Box
        {...getRootProps({
          className: clsx(
            styles.root,
            {
              [styles.dropzoneAccept]: isDragAccept,
              [styles.dropzoneReject]: isDragReject
            },
            classNames?.root
          ),
        })}
        // {...getStyles('root', { focusable: true })}
        {...others}
      >
        <input {...getInputProps(inputProps)} name={name} />
        <div
          data-enable-pointer-events={enablePointerEvents || undefined}
          className={clsx(styles.content, classNames?.content)}
        >
          {children}
        </div>
      </Box>
    </DropzoneProvider>
  );
};

Dropzone.displayName = 'Dropzone';
Dropzone.Accept = DropzoneAccept;
Dropzone.Idle = DropzoneIdle;
Dropzone.Reject = DropzoneReject;


type PossibleRef<T> = Ref<T> | undefined;

export function assignRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (typeof ref === 'object' && ref !== null && 'current' in ref) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

export function mergeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    refs.forEach((ref) => assignRef(ref, node));
  };
}

export function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  return useCallback(mergeRefs(...refs), refs);
}