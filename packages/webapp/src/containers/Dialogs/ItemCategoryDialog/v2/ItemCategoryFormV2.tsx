import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateItemCategory,
  useEditItemCategory,
  useItemCategory,
} from '@/hooks/query';
import { transformToForm } from '@/utils';
import {
  getItemCategorySchema,
  type ItemCategoryFormValues,
} from './ItemCategory.zod';

const defaultValues: ItemCategoryFormValues = {
  name: '',
  description: '',
};

// Легаси-хуки без типов — уточняем сигнатуры локально.
const useCreateCategory = useCreateItemCategory as unknown as () => {
  mutateAsync: (values: ItemCategoryFormValues) => Promise<unknown>;
};
const useEditCategory = useEditItemCategory as unknown as () => {
  mutateAsync: (
    args: [number, ItemCategoryFormValues],
  ) => Promise<unknown>;
};
const useCategory = useItemCategory as unknown as (
  id: number | null | undefined,
  props: { enabled: boolean },
) => { data?: Record<string, unknown>; isFetching: boolean };

interface ItemCategoryFormV2Props {
  itemCategoryId?: number | null;
  onClose: () => void;
}

/**
 * Форма категории товара: название + описание (RHF + Zod + shadcn).
 * Логика легаси: create/edit по itemCategoryId, тосты, ошибка
 * CATEGORY_NAME_EXISTS ложится на поле «Название».
 */
export function ItemCategoryFormV2({
  itemCategoryId,
  onClose,
}: ItemCategoryFormV2Props) {
  const isNewMode = !itemCategoryId;

  const { data: itemCategory, isFetching: isCategoryLoading } = useCategory(
    itemCategoryId,
    { enabled: !!itemCategoryId },
  );
  const { mutateAsync: createCategory } = useCreateCategory();
  const { mutateAsync: editCategory } = useEditCategory();

  if (isCategoryLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  return (
    <ItemCategoryFormV2Inner
      isNewMode={isNewMode}
      itemCategoryId={itemCategoryId ?? null}
      itemCategory={itemCategory}
      onSubmitCategory={(values) =>
        isNewMode
          ? createCategory(values)
          : editCategory([Number(itemCategoryId), values])
      }
      onClose={onClose}
    />
  );
}

function ItemCategoryFormV2Inner({
  isNewMode,
  itemCategory,
  onSubmitCategory,
  onClose,
}: {
  isNewMode: boolean;
  itemCategoryId: number | null;
  itemCategory?: Record<string, unknown>;
  onSubmitCategory: (values: ItemCategoryFormValues) => Promise<unknown>;
  onClose: () => void;
}) {
  const schema = useMemo(() => getItemCategorySchema(), []);

  const initialValues: ItemCategoryFormValues = {
    ...defaultValues,
    ...transformToForm(itemCategory, defaultValues),
  };
  const form = useForm<ItemCategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: ItemCategoryFormValues) => {
    try {
      await onSubmitCategory(values);
      AppToaster.show({
        message: intl.get(
          isNewMode
            ? 'the_item_category_has_been_created_successfully'
            : 'the_item_category_has_been_edited_successfully',
        ),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      const errors =
        (error as { response?: { data?: { errors?: { type: string }[] } } })
          ?.response?.data?.errors ?? [];
      if (errors.some((e) => e.type === 'CATEGORY_NAME_EXISTS')) {
        form.setError('name', {
          message: intl.get('category_name_exists'),
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('category_name')}</FormLabel>
              <FormControl>
                <Input autoFocus {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('description')}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {intl.get('cancel')}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {intl.get('save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
