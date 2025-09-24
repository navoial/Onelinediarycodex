import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './app/AppLayout'
import DayRoute from './day/DayRoute'
import CalendarRoute from './calendar/CalendarRoute'
import SettingsRoute from './settings/SettingsRoute'
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
      { path: 'settings', element: <SettingsRoute /> },
      { path: 'paywall', element: <PaywallRoute /> },
    ],
  },
])
