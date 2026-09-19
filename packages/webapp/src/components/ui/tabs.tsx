import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Полоса вкладок — на линии, без серой подложки. Подложка была
      // ещё одной поверхностью поверх страницы, и глаз обязан был её
      // разобрать, прежде чем добраться до самих вкладок.
      'inline-flex h-10 items-center justify-start gap-1 border-b border-border text-text-secondary',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Текущая вкладка ПОДЧЁРКИВАЕТСЯ, а не всплывает над полосой.
      // Тень оставлена тому, что и правда лежит поверх страницы, —
      // меню, окнам, подсказкам. Так же выглядят вкладки на старых
      // экранах (см. мост темы), и продукт не двоится.
      'relative inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50',
      'hover:text-text-primary',
      'data-[state=active]:text-text-primary data-[state=active]:shadow-[inset_0_-2px_0_rgb(var(--c-action))]',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
