import { useAuth } from '@/state/useAuth'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsRoute.module.css'

type SettingsItem = {
  label: string
  to?: string
}

export default function SettingsOverviewRoute() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const accountItems: SettingsItem[] = [
    { label: 'Name', to: 'name' },
    { label: 'Email', to: 'email' },
    { label: 'Password', to: 'password' },
    { label: 'Premium' },
  ]
  const helpItems: SettingsItem[] = [
    { label: 'FAQ' },
    { label: 'Contact Us' },
    { label: 'Report a bug' },
  ]
  const appPrefs: SettingsItem[] = [
    { label: 'Notifications' },
    { label: 'Terms of Service' },
    { label: 'Privacy' },
  ]

  function handleNavigate(item: SettingsItem) {
    if (!item.to) return
    navigate(item.to)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className={styles.title}>Account</h1>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.list}>
          {accountItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              onClick={() => handleNavigate(item)}
              aria-disabled={!item.to}
              disabled={!item.to}
              tabIndex={item.to ? 0 : -1}
            >
              {item.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Help &amp; Support</h2>
        <div className={styles.list}>
          {helpItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              onClick={() => handleNavigate(item)}
              aria-disabled={!item.to}
              disabled={!item.to}
              tabIndex={item.to ? 0 : -1}
            >
              {item.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>App preferences</h2>
        <div className={styles.list}>
          {appPrefs.map((item) => (
            <button
              key={item.label}
              type="button"
              className={styles.item}
              onClick={() => handleNavigate(item)}
              aria-disabled={!item.to}
              disabled={!item.to}
              tabIndex={item.to ? 0 : -1}
            >
              {item.label}
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className={styles.logout} onClick={() => void signOut()}>
        Log out
      </button>
    </div>
  )
}
