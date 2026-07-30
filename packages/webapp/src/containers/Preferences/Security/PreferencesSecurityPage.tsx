import { useEffect } from 'react';
import intl from 'react-intl-universal';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose } from '@/utils';
import { TwoFactorCard } from './TwoFactorCard';

interface PreferencesSecurityPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

/** Настройки → «Безопасность»: 2FA текущего пользователя. */
function PreferencesSecurityPage({
  changePreferencesPageTitle,
}: PreferencesSecurityPageProps) {
  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.security.title'));
  }, [changePreferencesPageTitle]);

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-6">
      <TwoFactorCard />
    </div>
  );
}

export default compose(withDashboardActions)(PreferencesSecurityPage);
