/*
Copyright 2024 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
Licensed under the Amazon Software License http://aws.amazon.com/asl/
*/

import { useCognitoAuthContext } from '@aws-northstar/ui';
import getBreadcrumbs from '@aws-northstar/ui/components/AppLayout/utils/getBreadcrumbs';
import {
  BreadcrumbGroup,
  BreadcrumbGroupProps,
  SideNavigation,
  SideNavigationProps,
} from '@cloudscape-design/components';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAppUser } from './Auth';
import Config from './config.json';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import { useHelpPanel, useSplitPanel } from './providers/AppLayoutProvider/managed-content';
import { RiskProvider } from './providers/RiskProvider';

/**
 * Defines the App layout and contains logic for routing.
 */
const App: React.FC = () => {
  const { getAuthenticatedUser } = useCognitoAuthContext();
  const user = useAppUser();
  const splitPanel = useSplitPanel();
  const helpPanel = useHelpPanel();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeHref, setActiveHref] = useState('/');
  const defaultBreadcrumb = 'Research Assistant';
  const [activeBreadcrumbs, setActiveBreadcrumbs] = useState<BreadcrumbGroupProps.Item[]>([
    { text: defaultBreadcrumb, href: '/' },
  ]);

  useEffect(() => {
    setActiveHref(location.pathname);
    const breadcrumbs = getBreadcrumbs(location.pathname, location.search, defaultBreadcrumb);
    setActiveBreadcrumbs(breadcrumbs);
  }, [location, defaultBreadcrumb]);

  const onNavigate = useCallback(
    (e: CustomEvent<{ href: string; external?: boolean }>) => {
      if (!e.detail.external) {
        e.preventDefault();
        navigate(e.detail.href);
      }
    },
    [navigate],
  );

  const sideNavigation = useMemo<SideNavigationProps.Item[]>(() => {
    const _navItems: SideNavigationProps.Item[] = [
      {
        text: 'Chat',
        type: 'link',
        href: '/chat',
      },
    ];

    return _navItems;
  }, []);

  return (
    <>
      <TopNavigation
        identity={{
          href: '#',
          title: Config.applicationName,
          logo: { src: '/logo512.png', alt: 'logo' },
        }}
        utilities={[
          {
            type: 'menu-dropdown',
            text: user.username,
            description: user.email,
            iconName: 'user-profile',
            onItemClick: (event) => {
              if (event.detail.id === 'signout') {
                const CREDENTIALS_KEY = 'northstar.sigv4fetch.session';
                getAuthenticatedUser && getAuthenticatedUser()?.signOut();
                window.sessionStorage.removeItem(CREDENTIALS_KEY);
                window.location.href = '/';
              }
            },
            items: [
              {
                id: 'signout',
                text: 'Sign out',
              },
            ],
          },
        ]}
      />
      <AppLayout
        breadcrumbs={<BreadcrumbGroup onFollow={onNavigate} items={activeBreadcrumbs} />}
        toolsHide
        notifications={<RiskProvider />}
        navigation={
          <SideNavigation
            header={{ text: 'Assistant', href: '/' }}
            activeHref={activeHref}
            onFollow={onNavigate}
            items={sideNavigation}
          />
        }
        content={
          <Routes>
            <Route path={'/chat'} element={<Chat />}>
              <Route path={':id'} element={<Chat />} />
            </Route>
            <Route path={'/settings'} element={<Settings />} />
            <Route path={'/'} element={<Navigate to="/chat" replace />} />
          </Routes>
        }
        splitPanel={splitPanel.active}
        tools={helpPanel.active}
      />
    </>
  );
};

export default App;
