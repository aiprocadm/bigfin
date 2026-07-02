import { useEffect } from 'react';
import intl from 'react-intl-universal';

import { Card, CardContent } from '@/components/ui/card';
import { PreferencesBrandingBoot } from './PreferencesBrandingBoot';
import { PreferencesBrandingForm } from './PreferencesBrandingForm';
import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose } from '@/utils';

interface PreferencesBrandingPageProps {
  changePreferencesPageTitle: (title: string) => void;
}

function PreferencesBrandingPageRoot({
  changePreferencesPageTitle,
}: PreferencesBrandingPageProps) {
  useEffect(() => {
    changePreferencesPageTitle(intl.get('preferences.branding.title'));
  }, [changePreferencesPageTitle]);

  return (
    <Card>
      <CardContent className="p-6">
        <PreferencesBrandingBoot>
          <PreferencesBrandingForm />
        </PreferencesBrandingBoot>
      </CardContent>
    </Card>
  );
}

export default compose(withDashboardActions)(PreferencesBrandingPageRoot);
