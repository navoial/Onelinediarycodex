import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './app/AppLayout'
import DayRoute from './day/DayRoute'
import CalendarRoute from './calendar/CalendarRoute'
import SettingsLayout from './settings/SettingsLayout'
import SettingsOverviewRoute from './settings/SettingsOverviewRoute'
import SettingsNameRoute from './settings/SettingsNameRoute'
import SettingsEmailRoute from './settings/SettingsEmailRoute'
import SettingsPasswordRoute from './settings/SettingsPasswordRoute'
import SettingsPlanRoute from './settings/SettingsPlanRoute'
import SettingsNotificationsRoute from './settings/SettingsNotificationsRoute'
import PaywallRoute from './paywall/PaywallRoute'
import AuthRoute from './auth/AuthRoute'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthRoute />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DayRoute /> },
      { path: 'calendar', element: <CalendarRoute /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsOverviewRoute /> },
          { path: 'name', element: <SettingsNameRoute /> },
          { path: 'email', element: <SettingsEmailRoute /> },
          { path: 'password', element: <SettingsPasswordRoute /> },
          { path: 'plan', element: <SettingsPlanRoute /> },
          { path: 'notifications', element: <SettingsNotificationsRoute /> },
        ],
      },
      { path: 'paywall', element: <PaywallRoute /> },
    ],
  },
])
