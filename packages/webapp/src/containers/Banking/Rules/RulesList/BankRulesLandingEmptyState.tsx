import * as R from 'ramda';
import intl from 'react-intl-universal';
import { Button, Intent } from '@blueprintjs/core';
import { EmptyStatus, Can } from '@/components';
import { AbilitySubject, BankRuleAction } from '@/constants/abilityOption';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { DialogsName } from '@/constants/dialogs';
import styles from './BankRulesLandingEmptyState.module.scss';

/**
 * Пустой экран банковских правил. Раньше здесь был английский текст и кнопка
 * «Подробнее», которая никуда не вела (М4 карты v15).
 */
function BankRulesLandingEmptyStateRoot({
  // #withDialogAction
  openDialog,
}: any) {
  const handleNewBtnClick = () => {
    openDialog(DialogsName.BankRuleForm);
  };

  return (
    <EmptyStatus
      title={intl.get('banking.rules.empty_state.title')}
      description={
        <p>{intl.get('banking.rules.empty_state.description')}</p>
      }
      action={
        <Can I={BankRuleAction.Create} a={AbilitySubject.BankRule}>
          <Button
            intent={Intent.PRIMARY}
            large={true}
            onClick={handleNewBtnClick}
          >
            {intl.get('banking.rules.empty_state.new_button')}
          </Button>
        </Can>
      }
      classNames={{ root: styles.root }}
    />
  );
}

export const BankRulesLandingEmptyState = R.compose(withDialogActions)(
  BankRulesLandingEmptyStateRoot,
);
