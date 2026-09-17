import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import classNames from 'classnames';
import { Icon } from '@/components/Icon';
import intl from 'react-intl-universal';

// const initialFile: {
//   file: ?File,
//   preview: string,
//   metadata: ?object,
//   uploaded: boolean,
// };

/** Файл в области перетаскивания: сам файл, картинка для показа и признак «уже загружен». */
export interface DragzoneFile {
  file?: File;
  preview?: string;
  metadata?: Record<string, any>;
  uploaded?: boolean;
  name?: string;
}

/**
 * Свойства области перетаскивания. Все необязательные: та же ошибка, что и у
 * блока итогов — типа не было вовсе, проверка вывела все шесть как
 * обязательные, и обе вкладки вложений считались ошибкой (Д10 карты v75).
 */
export interface DragzoneProps {
  /** Надпись внутри рамки. По умолчанию — «перетащите файлы сюда». */
  text?: React.ReactNode;
  /**
   * ВНИМАНИЕ: сейчас не подключено. Свойство разбирается, но внутри область
   * пользуется собственным обработчиком и наружу о новых файлах не сообщает.
   * Обе вкладки вложений передавали сюда `null`, так что сегодня это ничего не
   * меняет; подключение — отдельная работа.
   */
  onDrop?: ((files: DragzoneFile[]) => void) | null;
  /** Файлы, показанные сразу при открытии. */
  initialFiles?: DragzoneFile[];
  /** Вызывается при удалении файла из области. */
  onDeleteFile?: (deleted: DragzoneFile[]) => void;
  /** Пояснение под рамкой — например, про предельный размер. */
  hint?: React.ReactNode;
  className?: string;
}

export function Dragzone({
  text = intl.get('drag_drop_files_here_or_click_here'),
  onDrop,
  initialFiles = [],
  onDeleteFile,
  hint,
  className,
}: DragzoneProps) {
  const [files, setFiles] = useState<DragzoneFile[]>([]);

  useEffect(() => {
    setFiles([...initialFiles]);
  }, [initialFiles]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    onDrop: (acceptedFiles) => {
      const _files = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        uploaded: false,
      }));
      setFiles(_files);
    },
  });

  const handleRemove = useCallback(
    (index: number) => {
      const deletedFile = files.splice(index, 1);
      setFiles([...files]);
      onDeleteFile && onDeleteFile(deletedFile);
    },
    [files, onDeleteFile],
  );

  const thumbs = files.map((file, index) => (
    <div className={'dropzone-thumb'} key={file.name}>
      <div>
        <img src={file.preview} />
      </div>
      <button onClick={() => handleRemove(index)}>
        <Icon icon={'times'} iconSize={12} />
      </button>
    </div>
  ));

  useEffect(
    () => () => {
      files.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    },
    [files, onDrop],
  );

  useEffect(() => {
    onDrop && onDrop(files);
  }, [files, onDrop]);

  return (
    <section className={classNames('dropzone-container', className)}>
      {hint && <div className="dropzone-hint">{hint}</div>}

      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>{text}</p>
      </div>

      <div className={'dropzone-thumbs'}>{thumbs}</div>
    </section>
  );
}
