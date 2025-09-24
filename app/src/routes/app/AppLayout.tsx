import AppHeader from '@/components/AppHeader'
import { DateStateProvider } from '@/state/DateStateContext'
import { EntryProvider } from '@/state/EntryStore'
import { ProfileProvider } from '@/state/ProfileStore'
import { useAuth } from '@/state/AuthContext'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { status } = useAuth()
  const location = useLocation()

  const hideAppHeader = location.pathname.startsWith('/settings')

  if (status === 'loading') {
    return <div className={styles.loading}>Loading…</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" replace />
  }

  return (
    <DateStateProvider>
      <ProfileProvider>
        <EntryProvider>
          <div className={styles.container}>
            <div className={styles.inner}>
              {hideAppHeader ? null : <AppHeader />}
              <main className={styles.main}>
                <Outlet />
              </main>
            </div>
          </div>
        </EntryProvider>
      </ProfileProvider>
    </DateStateProvider>
  )
}
