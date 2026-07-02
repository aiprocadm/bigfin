import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useHistory } from 'react-router-dom';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getContactDuplicateSchema,
  type ContactDuplicateFormValues,
} from './ContactDuplicate.zod';

interface ContactDuplicateFormV2Props {
  /** Id контакта из payload диалога (openDialog('contact-duplicate', { contactId })). */
  contactId?: number | string;
  /** Закрывает диалог (redux closeDialog по имени). */
  onClose: () => void;
}

/**
 * Форма дублирования контакта (RHF + Zod + shadcn).
 * Логика легаси-формы сохранена: выбор типа контакта и переход на страницу
 * создания клиента/поставщика с параметром duplicate.
 */
export function ContactDuplicateFormV2({
  contactId,
  onClose,
}: ContactDuplicateFormV2Props) {
  const history = useHistory();

  const schema = useMemo(() => getContactDuplicateSchema(), []);

  // Пути совпадают с легаси ContactsOptions: customers | vendors.
  const contactTypeOptions = useMemo(
    () => [
      { value: 'customers', label: intl.get('customer') },
      { value: 'vendors', label: intl.get('vendor') },
    ],
    [],
  );

  const form = useForm<ContactDuplicateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactType: '' },
  });

  // Тот же сабмит, что в легаси: закрыть диалог и перейти на форму создания.
  const onSubmit = (values: ContactDuplicateFormValues) => {
    onClose();
    history.push(`${values.contactType}/new?duplicate=${contactId}`, {
      action: contactId,
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="contactType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('contact_type')}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={intl.get('select_contact')} />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {intl.get('duplicate')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
