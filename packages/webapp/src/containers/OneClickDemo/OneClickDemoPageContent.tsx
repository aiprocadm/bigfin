import intl from 'react-intl-universal';
import { Button, Intent, ProgressBar, Text } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import {
  useCreateOneClickDemo,
  useOneClickDemoBuildJob,
  useOneClickDemoSignin,
} from '@/hooks/query/oneclick-demo';
import { Box, Icon, Stack } from '@/components';
import style from './OneClickDemoPage.module.scss';

export function OneClickDemoPageContent() {
  const {
    mutateAsync: createOneClickDemo,
    isLoading: isCreateOneClickLoading,
  } = useCreateOneClickDemo();
  const {
    mutateAsync: oneClickDemoSignIn,
    isLoading: isOneclickDemoSigningIn,
  } = useOneClickDemoSignin();

  const [demoId, setDemoId] = useState<string>('');
  const [isJobDone, setIsJobDone] = useState<boolean>(false);
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  // Поллим постройку по ключу демо (а не по номеру джоба).
  const { data: buildJob } = useOneClickDemoBuildJob(demoId, {
    refetchInterval: 2000,
    enabled: !isJobDone && !!demoId,
  });

  useEffect(() => {
    if (buildJob?.isCompleted) {
      setIsJobDone(true);
    }
    // Провал постройки раньше не показывался никак: страница просто
    // крутилась вечно (Д1 карты v18).
    if (buildJob?.isFailed) {
      setHasFailed(true);
    }
  }, [buildJob?.isCompleted, buildJob?.isFailed]);

  // Как только организация готова — входим по ключу демо.
  useEffect(() => {
    if (isJobDone) {
      oneClickDemoSignIn({ demoId }).catch(() => setHasFailed(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobDone]);

  const handleCreateAccountBtnClick = () => {
    setHasFailed(false);
    createOneClickDemo({})
      .then((demo) => {
        setDemoId(demo.demoId);
      })
      .catch(() => setHasFailed(true));
  };
  const isBuilding = !!demoId && !isJobDone && !hasFailed;
  const isLoading = isBuilding || isOneclickDemoSigningIn;

  return (
    <Box className={style.root}>
      <Box className={style.inner}>
        <Stack align={'center'} spacing={40}>
          <Icon icon="bigfin" height={37} width={84} />

          {isLoading && (
            <Stack align={'center'} spacing={15}>
              <ProgressBar stripes className={style.progressBar} />
              {isOneclickDemoSigningIn && (
                <Text className={style.waitingText}>
                  {intl.get('one_click_demo.signing_in')}
                </Text>
              )}
              {isBuilding && (
                <Text className={style.waitingText}>
                  {intl.get('one_click_demo.preparing')}
                </Text>
              )}
            </Stack>
          )}

          {hasFailed && (
            <Text className={style.waitingText}>
              {intl.get('one_click_demo.failed')}
            </Text>
          )}
        </Stack>

        {!isLoading && (
          <Button
            className={style.oneClickBtn}
            intent={Intent.NONE}
            onClick={handleCreateAccountBtnClick}
            loading={isCreateOneClickLoading}
          >
            {intl.get('one_click_demo.create_account')}
          </Button>
        )}
      </Box>
    </Box>
  );
}
