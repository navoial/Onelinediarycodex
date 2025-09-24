import { useAuth } from '@/state/AuthContext'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsRoute.module.css'

export default function SettingsRoute() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const accountItems = ['Name', 'Email', 'Password', 'Premium']
  const helpItems = ['FAQ', 'Contact Us', 'Report a bug']
  const appPrefs = ['Notifications', 'Terms of Service', 'Privacy']

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
            <button key={item} type="button" className={styles.item}>
              {item}
              <span>›</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Help &amp; Support</h2>
        <div className={styles.list}>
          {helpItems.map((item) => (
            <button key={item} type="button" className={styles.item}>
              {item}
              <span>›</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>App preferences</h2>
        <div className={styles.list}>
          {appPrefs.map((item) => (
            <button key={item} type="button" className={styles.item}>
              {item}
              <span>›</span>
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
