import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFormContext } from 'react-hook-form';
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
import { Spinner } from '@/components/ui/Spinner';
import {
  useCreateWarehouse,
  useEditWarehouse,
  useWarehouse,
} from '@/hooks/query';
import { transformToForm } from '@/utils';
import {
  getWarehouseFormSchema,
  type WarehouseFormValues,
} from './WarehouseFormV2.zod';

const defaultValues: WarehouseFormValues = {
  name: '',
  code: '',
  address: '',
  city: '',
  country: '',
  phone_number: '',
  email: '',
  website: '',
};

/** Ответ API с типизированными ошибками валидации. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

interface WarehouseTextFieldProps {
  name: keyof WarehouseFormValues;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}

/**
 * Текстовое поле формы склада (локальный хелпер, не ui-примитив).
 */
function WarehouseTextField({
  name,
  label,
  placeholder,
  required,
  type,
}: WarehouseTextFieldProps) {
  const form = useFormContext<WarehouseFormValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && (
              <span className="text-danger" aria-hidden>
                {' '}
                *
              </span>
            )}
          </FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface WarehouseFormV2InnerProps {
  warehouseId?: number | null;
  warehouse?: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Форма склада (RHF + Zod + shadcn Form).
 * Логика легаси-формы сохранена: create/edit по warehouseId, тост об успехе,
 * серверная ошибка WAREHOUSE_CODE_NOT_UNIQUE ложится на поле «Код».
 */
function WarehouseFormV2Inner({
  warehouseId,
  warehouse,
  onClose,
}: WarehouseFormV2InnerProps) {
  // Легаси-хуки мутаций без типов (ts-nocheck) — уточняем сигнатуры локально.
  const { mutateAsync: createWarehouseMutate } =
    useCreateWarehouse({}) as unknown as {
      mutateAsync: (values: WarehouseFormValues) => Promise<unknown>;
    };
  const { mutateAsync: editWarehouseMutate } =
    useEditWarehouse({}) as unknown as {
      mutateAsync: (args: [number, WarehouseFormValues]) => Promise<unknown>;
    };

  const schema = useMemo(() => getWarehouseFormSchema(), []);

  const initialValues = useMemo<WarehouseFormValues>(() => {
    const merged = {
      ...defaultValues,
      ...transformToForm(warehouse, defaultValues),
    };
    // API может вернуть числа (например, телефон) — приводим к строкам.
    return Object.fromEntries(
      Object.entries(merged).map(([key, value]) => [
        key,
        value == null ? '' : String(value),
      ]),
    ) as WarehouseFormValues;
  }, [warehouse]);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: WarehouseFormValues) => {
    try {
      if (warehouseId) {
        await editWarehouseMutate([warehouseId, values]);
      } else {
        await createWarehouseMutate(values);
      }
      AppToaster.show({
        message: intl.get(
          warehouseId
            ? 'warehouse.dialog.edit_success_message'
            : 'warehouse.dialog.success_message',
        ),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      const errors = (error as ApiErrorResponse).response?.data?.errors;

      if (errors?.some((e) => e.type === 'WAREHOUSE_CODE_NOT_UNIQUE')) {
        form.setError('code', {
          message: intl.get('warehouse.error.warehouse_code_not_unique'),
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <WarehouseTextField
          name="name"
          label={intl.get('warehouse.dialog.label.warehouse_name')}
          required
        />
        <WarehouseTextField
          name="code"
          label={intl.get('warehouse.dialog.label.code')}
        />
        <WarehouseTextField
          name="address"
          label={intl.get('warehouse.dialog.label.warehouse_address')}
          placeholder={intl.get('warehouse.dialog.label.warehouse_address_1')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <WarehouseTextField
            name="city"
            label={intl.get('warehouse.dialog.label.city')}
          />
          <WarehouseTextField
            name="country"
            label={intl.get('warehouse.dialog.label.country')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <WarehouseTextField
            name="phone_number"
            label={intl.get('warehouse.dialog.label.phone_number')}
            type="tel"
          />
          <WarehouseTextField
            name="email"
            label={intl.get('warehouse.dialog.label.email')}
            type="email"
          />
        </div>
        <WarehouseTextField
          name="website"
          label={intl.get('warehouse.dialog.label.website')}
          placeholder="https://"
        />

        <DialogFooter className="border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={form.formState.isSubmitting}
            onClick={onClose}
          >
            {intl.get('cancel')}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner size="sm" />}
            {intl.get('save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface WarehouseFormV2Props {
  /** Id склада из payload диалога (режим редактирования). */
  warehouseId?: number | null;
  /** Закрывает диалог (redux closeDialog по имени). */
  onClose: () => void;
}

/**
 * Загрузка склада (режим редактирования) + форма.
 */
export function WarehouseFormV2({ warehouseId, onClose }: WarehouseFormV2Props) {
  // Легаси-хук запроса без типов (ts-nocheck) — уточняем локально.
  const { data: warehouse, isLoading: isWarehouseLoading } = useWarehouse(
    warehouseId,
    { enabled: !!warehouseId },
    undefined,
  ) as unknown as {
    data?: Record<string, unknown>;
    isLoading: boolean;
  };

  if (isWarehouseLoading) {
    return (
      <div className="flex justify-center py-8 text-text-muted">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <WarehouseFormV2Inner
      warehouseId={warehouseId}
      warehouse={warehouse}
      onClose={onClose}
    />
  );
}
