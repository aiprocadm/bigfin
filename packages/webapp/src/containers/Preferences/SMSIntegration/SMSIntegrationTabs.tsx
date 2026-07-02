import { useEffect, useState } from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import SMSMessagesDataTable from './SMSMessagesDataTable';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { compose } from '@/utils';

/**
 * Вкладки SMS-интеграции (shadcn Tabs).
 */
function SMSIntegrationTabs({
  // #withDashboardActions
  changePreferencesPageTitle,
}: any) {
  const [activeTab, setActiveTab] = useState('sms_messages');

  useEffect(() => {
    changePreferencesPageTitle(intl.get('sms_integration.label'));
  }, [changePreferencesPageTitle]);

  return (
    <div className="bigfin-ui p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            {intl.get('sms_integration.label.overview')}
          </TabsTrigger>
          <TabsTrigger value="sms_messages">
            {intl.get('sms_integration.label.sms_messages')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <EmptyState
            title={intl.get('sms_integration.overview.empty.title')}
            description={intl.get('sms_integration.overview.empty.description')}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab('sms_messages')}
              >
                {intl.get('sms_integration.overview.empty.action')}
              </Button>
            }
          />
        </TabsContent>
        <TabsContent value="sms_messages" className="mt-4">
          <SMSMessagesDataTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default compose(withDashboardActions)(SMSIntegrationTabs);
