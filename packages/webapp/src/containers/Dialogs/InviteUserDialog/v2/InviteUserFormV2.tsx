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
import { useCreateInviteUser, useRoles } from '@/hooks/query';
import {
  getInviteUserSchema,
  type InviteUserFormValues,
} from './InviteUser.zod';

interface RoleRecord {
  id: number | string;
  name: string;
}

// Легаси-хуки без типов — уточняем сигнатуры локально.
const useInviteUserMutation = useCreateInviteUser as unknown as () => {
  mutateAsync: (values: {
    email: string;
    role_id: number;
    status: number;
  }) => Promise<unknown>;
};
const useRolesTyped = useRoles as unknown as () => {
  data?: RoleRecord[];
  isLoading: boolean;
};

interface InviteUserFormV2Props {
  onClose: () => void;
}

/**
 * Форма приглашения пользователя: email + роль (RHF + Zod + shadcn).
 * Логика легаси сохранена: useCreateInviteUser, тост, ошибки
 * EMAIL.ALREADY.* ложатся на поле email.
 */
export function InviteUserFormV2({ onClose }: InviteUserFormV2Props) {
  const { mutateAsync: inviteUser } = useInviteUserMutation();
  const { data: roles, isLoading: isRolesLoading } = useRolesTyped();

  const schema = useMemo(() => getInviteUserSchema(), []);
  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role_id: '' },
  });

  const onSubmit = async (values: InviteUserFormValues) => {
    try {
      await inviteUser({
        email: values.email,
        role_id: Number(values.role_id),
        status: 1,
      });
      AppToaster.show({
        message: intl.get('teammate_invited_to_organization_account'),
        intent: Intent.SUCCESS,
      });
      onClose();
    } catch (error) {
      const errors =
        (error as { response?: { data?: { errors?: { type: string }[] } } })
          ?.response?.data?.errors ?? [];
      const emailTaken = errors.some(
        (e) =>
          e.type === 'EMAIL.ALREADY.INVITED' ||
          e.type === 'EMAIL.ALREADY.EXISTS',
      );
      if (emailTaken) {
        form.setError('email', {
          message: intl.get('email_is_already_used'),
        });
      }
    }
  };

  if (isRolesLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-text-secondary">
          {intl.get('your_access_to_your_team')}
        </p>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('invite_user.label.email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoFocus
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('invite_user.label.role_name')}</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(roles ?? []).map((role) => (
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
            {intl.get('invite')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
