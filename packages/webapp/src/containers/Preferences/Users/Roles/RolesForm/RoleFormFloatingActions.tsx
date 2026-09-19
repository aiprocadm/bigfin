import React from 'react';
import styled from 'styled-components';
import { useFormikContext } from 'formik';
import { useHistory } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { FormattedMessage as T } from '@/components';
import { Button } from '@/components/ui/button';

/**
 * Нижняя панель действий формы роли.
 *
 * Кнопки переведены на новые (остаток Д1). У новой кнопки нет отдельного
 * состояния «крутится» — вместо него значок внутри и запрет повторного
 * нажатия: так же сделано на всех переработанных формах, и человек видит
 * одно и то же поведение везде.
 */
export function RoleFormFloatingActions() {
  // Formik form context.
  const { isSubmitting } = useFormikContext<any>();

  // History context.
  const history = useHistory();

  // Handle close click.
  const handleCloseClick = () => {
    history.go(-1);
  };

  return (
    <RoleFormFloatingActionsRoot>
      <Button type="submit" disabled={isSubmitting} className="min-w-[90px]">
        {isSubmitting && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        )}
        <T id={'save'} />
      </Button>
      <Button
        variant="secondary"
        onClick={handleCloseClick}
        disabled={isSubmitting}
      >
        <T id={'cancel'} />
      </Button>
    </RoleFormFloatingActionsRoot>
  );
}

const RoleFormFloatingActionsRoot = styled.div`
  position: fixed;
  bottom: 0;
  width: 100%;
  background: rgb(var(--c-surface));
  padding: 14px 18px;
  border-top: 1px solid rgb(var(--c-border));
  box-shadow: 0px -1px 4px 0px rgb(0 0 0 / 5%);
  display: flex;
  gap: 10px;
`;
