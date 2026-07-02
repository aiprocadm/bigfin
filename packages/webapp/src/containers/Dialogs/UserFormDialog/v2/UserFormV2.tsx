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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAuthenticatedAccount,
  useEditUser,
  useRoles,
  useUser,
} from '@/hooks/query';
import { transformToForm } from '@/utils';
import { getUserFormSchema, type UserFormValues } from './UserForm.zod';

interface RoleRecord {
  id: number | string;
  name: string;
}

const defaultValues: UserFormValues = {
  email: '',
  first_name: '',
  last_name: '',
  role_id: '',
};

// Легаси-хуки без типов — уточняем сигнатуры локально.
const useEditUserTyped = useEditUser as unknown as () => {
  mutateAsync: (
    args: [number, Record<string, unknown>],
  ) => Promise<unknown>;
};
const useUserTyped = useUser as unknown as (
  id: number | null | undefined,
  props: { enabled: boolean },
) => {
  data?: Record<string, unknown> & { system_user_id?: number };
  isLoading: boolean;
};
const useRolesTyped = useRoles as unknown as () => {
  data?: RoleRecord[];
  isLoading: boolean;
};
const useAuthAccountTyped = useAuthenticatedAccount as unknown as () => {
  data?: { id?: number };
};

interface UserFormV2Props {
  userId: number;
  onClose: () => void;
}

/**
 * Форма редактирования пользователя (RHF + Zod + shadcn).
 * Логика легаси: useEditUser([userId, values]); своя роль недоступна
 * для изменения; ошибка CANNOT_AUTHORIZED_USER_MUTATE_ROLE — на поле роли.
 */
export function UserFormV2({ userId, onClose }: UserFormV2Props) {
  const { data: user, isLoading: isUserLoading } = useUserTyped(userId, {
    enabled: !!userId,
  });
  const { data: roles, isLoading: isRolesLoading } = useRolesTyped();
  const { data: authAccount } = useAuthAccountTyped();

  if (isUserLoading || isRolesLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  const isAuth = user?.system_user_id === authAccount?.id;

  return (
    <UserFormV2Inner
      userId={userId}
      user={user}
      roles={roles ?? []}
      isAuth={isAuth}
      onClose={onClose}
    />
  );
}

function UserFormV2Inner({
  userId,
  user,
  roles,
  isAuth,
  onClose,
}: {
  userId: number;
  user?: Record<string, unknown>;
  roles: RoleRecord[];
  isAuth: boolean;
  onClose: () => void;
}) {
  const { mutateAsync: editUser } = useEditUserTyped();

  const schema = useMemo(() => getUserFormSchema(), []);
  const stored = transformToForm(user, defaultValues) as Record<
    string,
    unknown
  >;
  const initialValues: UserFormValues = {
    ...defaultValues,
    ...Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [
        key,
        value == null ? '' : String(value),
      ]),
    ),
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: UserFormValues) => {
    try {
      await editUser([userId, { ...values, role_id: Number(values.role_id) }]);
      AppToaster.show({
        message: intl.get('teammate_invited_to_organization_account'),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      const errors =
        (error as { response?: { data?: { errors?: { type: string }[] } } })
          ?.response?.data?.errors ?? [];
      if (
        errors.some((e) => e.type === 'CANNOT_AUTHORIZED_USER_MUTATE_ROLE')
      ) {
        form.setError('role_id', {
          message: intl.get('roles.error.you_cannot_change_your_own_role'),
        });
      }
    }
  };

  const TEXT_FIELDS = [
    { name: 'email' as const, labelKey: 'email', type: 'email' },
    { name: 'first_name' as const, labelKey: 'first_name', type: 'text' },
    { name: 'last_name' as const, labelKey: 'last_name', type: 'text' },
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {TEXT_FIELDS.map(({ name, labelKey, type }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get(labelKey)}</FormLabel>
                <FormControl>
                  <Input type={type} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <FormField
          control={form.control}
          name="role_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('roles.label.role_name')}</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={isAuth}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
