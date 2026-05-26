# Bigfin Design System v1

Папка `components/ui/` — это новая дизайн-система Bigfin на Tailwind 4 + shadcn/ui + Radix.
Существует **рядом** с BlueprintJS-компонентами из `containers/`. Граница проходит по файлам, не feature-флагам.

## Как использовать

Любой новый экран использует ТОЛЬКО компоненты из `ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
```

Один файл компонента использует ЛИБО `@/components/ui/*`, ЛИБО Blueprint — **никогда оба сразу**.

## Как добавить новый shadcn-компонент

```bash
pnpm dlx shadcn@latest add <name>
```

После генерации:
1. Открыть файл, заменить цвета на наши токены (`bg-surface`, `text-text-primary`, `bg-accent` и т.д.).
2. Заменить `text-muted-foreground` → `text-text-muted`, `text-destructive` → `text-danger`.
3. Написать `.stories.tsx` со всеми вариантами и состояниями.
4. Закоммитить (один компонент = один коммит).

## Как мигрировать существующий BP-экран

1. Создать новый файл в `components/<feature>/` (или модифицировать существующий).
2. Заменить все Blueprint-импорты на `@/components/ui/*`.
3. Заменить классы на Tailwind.
4. Обернуть корневой `<div>` в `className="bigfin-ui"` (если ещё не обёрнут родителем).
5. Закоммитить один PR на экран.

## Токены

Все цвета и шрифты — в `src/styles/tokens.css`. Не пиши `#FFD300` — пиши `text-accent`.

## Список компонентов v1

shadcn: `button`, `input`, `label`, `form`, `card`, `checkbox`, `separator`, `alert`, `sonner`, `skeleton`, `tooltip`
Custom: `Logo`, `Spinner`, `Link`, `AuthLayout`

## Что НЕ входит в v1

`Dialog`, `Tabs`, `Select`, `Combobox`, `DropdownMenu`, `Popover`, `Avatar`, `Badge`, `Calendar`, `DatePicker`, `Sheet`, `Drawer`, `Command`, `Table`, `Accordion`, `RadioGroup`, `Switch`, `Slider`, `Progress`, `AlertDialog` — добавляются по мере необходимости в следующих под-проектах.
