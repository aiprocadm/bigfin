import { connect } from 'react-redux';
import {
  FetchOptions,
  submitOptions,
  addSettings
} from '@/store/settings/settings.actions';

/** Что обёртка кладёт в свойства экрана. */
export interface WithSettingsActionsProps {
  requestSubmitOptions: (
    form: Parameters<typeof submitOptions>[0]['form'],
  ) => unknown;
  requestFetchOptions: () => unknown;
  addSetting: (group: string, key: string, value: unknown) => unknown;
}

// `dispatch` здесь принимает и thunk-функции (`submitOptions`, `FetchOptions`),
// поэтому не `Dispatch` из redux — как у `withDrawerActions`.
export const mapDispatchToProps = (dispatch: any): WithSettingsActionsProps => ({
  requestSubmitOptions: (form) => dispatch(submitOptions({ form })),
  requestFetchOptions: () => dispatch(FetchOptions()),
  addSetting: (group, key, value) => dispatch(addSettings(group, key, value)),
});

export const withSettingsActions = connect<
  {},
  WithSettingsActionsProps,
  {},
  any
>(null, mapDispatchToProps);
