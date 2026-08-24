// @ts-nocheck
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Text } from '@blueprintjs/core';
import { Icon, For, FormattedMessage as T, Stack } from '@/components';
import { getFooterLinks } from '@/constants/footerLinks';
import { useAuthActions } from '@/hooks/state';
import style from './SetupLeftSection.module.scss';
import { useAuthMetadata } from '@/hooks/query';

/**
 * Footer item link.
 */
function FooterLinkItem({ title, link }) {
  return (
    <div className="content__links-item">
      <a href={link} target="_blank">
        {title}
      </a>
    </div>
  );
}

/**
 * Setup left section footer.
 */
function SetupLeftSectionFooter() {
  // Retrieve the footer links.
  const footerLinks = getFooterLinks();

  const { data: authMeta } = useAuthMetadata();
  // Сервер отдаёт поля плоско: `{ one_click_demo: { enable, demo_url } }`
  // (Д1 карты v18). Ссылка есть всегда, поэтому кнопку показываем только
  // при включённом демо — иначе она вела бы на закрытую страницу.
  const demoEnabled = Boolean(authMeta?.one_click_demo?.enable);
  const demoUrl = authMeta?.one_click_demo?.demo_url;
  const showDemoButton = demoEnabled && Boolean(demoUrl);

  const handleDemoBtnClick = () => {
    window.open(demoUrl);
  };

  return (
    <div className={'content__footer'}>
      {showDemoButton && (
        <Stack spacing={16}>
          <Text className={style.demoButtonLabel}>
            <T id={'setup.left_side.not_now'} />
          </Text>
          <button className={style.demoButton} onClick={handleDemoBtnClick}>
            <T id={'setup.left_side.try_demo'} />
          </button>
        </Stack>
      )}

      <div className={'content__links'}>
        <For render={FooterLinkItem} of={footerLinks} />
      </div>
    </div>
  );
}

/**
 * Setup left section header.
 */
function SetupLeftSectionHeader() {
  const { setLogout } = useAuthActions();

  // Handle logout link click.
  const onClickLogout = () => {
    setLogout();
  };

  return (
    <div className={'content__header'}>
      <h1 className={'content__title'}>
        <T id={'setup.left_side.title'} />
      </h1>

      <p className={'content__text'}>
        <T id={'setup.left_side.description'} />
      </p>

      <div className={'content__organization'}>
        <span className="signout">
          {/* Была ссылка на «#»: она меняла адрес в строке браузера и
              прыгала наверх. Выход — действие, а не переход (М4 карты v15). */}
          <a role="button" tabIndex={0} onClick={onClickLogout}>
            <T id={'sign_out'} />
          </a>
        </span>
      </div>
    </div>
  );
}

/**
 * Wizard setup left section.
 */
export default function SetupLeftSection() {
  return (
    <section className={'setup-page__left-section'}>
      <div className={'content'}>
        <div className={'content__logo'}>
          <Icon
            icon="bigfin"
            className={'bigfin--alt'}
            height={37}
            width={84}
          />
        </div>
        <SetupLeftSectionHeader />
        <SetupLeftSectionFooter />
      </div>
    </section>
  );
}
