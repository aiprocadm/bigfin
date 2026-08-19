// @ts-nocheck
import { connect } from 'react-redux';
import { resolveSetupStep } from './resolveSetupStep';

export const withSetupWizard = (mapState) => {
  const mapStateToProps = (state, props) => {
    const {
      isOrganizationSetupCompleted,
      isOrganizationReady,
      isSubscriptionActive,
      isOrganizationBuildRunning
    } = props;

    const condits = {
      isCongratsStep: isOrganizationSetupCompleted,
      isInitializingStep: isOrganizationBuildRunning,
      isOrganizationStep: !isOrganizationReady && !isOrganizationBuildRunning,
    };
    // Список шагов вынесен отдельно и покрыт тестами: раньше первым стоял
    // шаг «Подписка», и мастер открывался им у КАЖДОГО нового пользователя
    // (подписки у новичка нет никогда) — М4 карты v15.
    const mapped = {
      ...condits,
      ...resolveSetupStep({
        isSubscriptionActive,
        isOrganizationReady,
        isOrganizationBuildRunning,
        isOrganizationSetupCompleted,
      }),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
