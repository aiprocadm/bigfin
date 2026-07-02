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
import { useBranch, useCreateBranch, useEditBranch } from '@/hooks/query';
import { transformToForm } from '@/utils';
import { getBranchFormSchema, type BranchFormValues } from './BranchFormV2.zod';

const defaultValues: BranchFormValues = {
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

interface BranchTextFieldProps {
  name: keyof BranchFormValues;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}

/**
 * Текстовое поле формы филиала (локальный хелпер, не ui-примитив).
 */
function BranchTextField({
  name,
  label,
  placeholder,
  required,
  type,
}: BranchTextFieldProps) {
  const form = useFormContext<BranchFormValues>();

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

interface BranchFormV2InnerProps {
  branchId?: number | null;
  branch?: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Форма филиала (RHF + Zod + shadcn Form).
 * Логика легаси-формы сохранена: create/edit по branchId, тост об успехе,
 * серверная ошибка BRANCH_CODE_NOT_UNIQUE ложится на поле «Код».
 */
function BranchFormV2Inner({ branchId, branch, onClose }: BranchFormV2InnerProps) {
  // Легаси-хуки мутаций без типов (ts-nocheck) — уточняем сигнатуры локально.
  const { mutateAsync: createBranchMutate } = useCreateBranch({}) as unknown as {
    mutateAsync: (values: BranchFormValues) => Promise<unknown>;
  };
  const { mutateAsync: editBranchMutate } = useEditBranch({}) as unknown as {
    mutateAsync: (args: [number, BranchFormValues]) => Promise<unknown>;
  };

  const schema = useMemo(() => getBranchFormSchema(), []);

  const initialValues = useMemo<BranchFormValues>(() => {
    const merged = {
      ...defaultValues,
      ...transformToForm(branch, defaultValues),
    };
    // API может вернуть числа (например, телефон) — приводим к строкам.
    return Object.fromEntries(
      Object.entries(merged).map(([key, value]) => [
        key,
        value == null ? '' : String(value),
      ]),
    ) as BranchFormValues;
  }, [branch]);

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: BranchFormValues) => {
    try {
      if (branchId) {
        await editBranchMutate([branchId, values]);
      } else {
        await createBranchMutate(values);
      }
      AppToaster.show({
        message: intl.get(
          branchId
            ? 'branch.dialog.edit_success_message'
            : 'branch.dialog.success_message',
        ),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      const errors = (error as ApiErrorResponse).response?.data?.errors;

      if (errors?.some((e) => e.type === 'BRANCH_CODE_NOT_UNIQUE')) {
        form.setError('code', {
          // Ключ с опечаткой «branche.» — легаси, переиспользуем как есть.
          message: intl.get('branche.error.warehouse_code_not_unique'),
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
        <BranchTextField
          name="name"
          label={intl.get('branch.dialog.label.branch_name')}
          required
        />
        <BranchTextField
          name="code"
          label={intl.get('branch.dialog.label.branch_code')}
        />
        <BranchTextField
          name="address"
          label={intl.get('branch.dialog.label.branch_address')}
          placeholder={intl.get('branch.dialog.label.address_1')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <BranchTextField
            name="city"
            label={intl.get('branch.dialog.label.city')}
          />
          <BranchTextField
            name="country"
            label={intl.get('branch.dialog.label.country')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BranchTextField
            name="phone_number"
            label={intl.get('branch.dialog.label.phone_number')}
            type="tel"
          />
          <BranchTextField
            name="email"
            label={intl.get('branch.dialog.label.email')}
            type="email"
          />
        </div>
        <BranchTextField
          name="website"
          label={intl.get('branch.dialog.label.website')}
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

interface BranchFormV2Props {
  /** Id филиала из payload диалога (режим редактирования). */
  branchId?: number | null;
  /** Закрывает диалог (redux closeDialog по имени). */
  onClose: () => void;
}

/**
 * Загрузка филиала (режим редактирования) + форма.
 */
export function BranchFormV2({ branchId, onClose }: BranchFormV2Props) {
  // Легаси-хук запроса без типов (ts-nocheck) — уточняем локально.
  const { data: branch, isLoading: isBranchLoading } = useBranch(
    branchId,
    { enabled: !!branchId },
    undefined,
  ) as unknown as {
    data?: Record<string, unknown>;
    isLoading: boolean;
  };

  if (isBranchLoading) {
    return (
      <div className="flex justify-center py-8 text-text-muted">
        <Spinner size="lg" />
      </div>
    );
  }
  return <BranchFormV2Inner branchId={branchId} branch={branch} onClose={onClose} />;
}
