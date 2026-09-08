import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import { EditorProvider } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useUncontrolled } from '@/hooks/useUncontrolled';
import { Box } from '../Layout/Box';
import './RichEditor.style.scss';

const extensions = [
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  // `types` в объявлении расширения не перечислен, но расширение его читает:
  // так задают, к каким узлам применять оформление текста (Д13 карты v76).
  TextStyle.configure({ types: [ListItem.name] } as any),
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
];

export interface RichEditorProps {
  value?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}
export const RichEditor = ({
  value,
  initialValue,
  onChange,
  className,
}: RichEditorProps) => {
  const [content, handleChange] = useUncontrolled({
    value,
    initialValue,
    onChange,
    finalValue: '',
  });

  // Тип `editor` берётся из чужого пакета; здесь достаточно того, что у него
  // есть `getHTML()`.
  const handleBlur = ({ editor }: { editor: { getHTML: () => string } }) => {
    handleChange(editor.getHTML());
  };

  return (
    <Box className={className}>
      {/* Редактор рисует содержимое сам; ребёнок ему всё равно нужен по
          объявлению — отдаём пустой (Д13 карты v76). */}
      <EditorProvider
        extensions={extensions}
        content={content}
        onBlur={handleBlur}
      >
        {null}
      </EditorProvider>
    </Box>
  );
};
