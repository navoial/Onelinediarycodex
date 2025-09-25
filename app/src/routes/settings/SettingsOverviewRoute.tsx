import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/state/useAuth'
import { usePlan } from '@/state/usePlan'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

type SettingsItem = {
  label: string
  to?: string
  tone?: 'default' | 'danger'
}

type PlanBadgeProps = {
  tier: string
  trialEndsAt: string | null
}

function PlanBadge({ tier, trialEndsAt }: PlanBadgeProps) {
  if (tier === 'premium') {
    return <span className={styles.planBadge}>Premium</span>
  }
  if (tier === 'trial') {
    return (
      <span className={styles.planBadge}>
        Trial{trialEndsAt ? ` · ends ${new Date(trialEndsAt).toLocaleDateString()}` : ''}
      </span>
    )
  }
  return <span className={styles.planBadge}>Free</span>
}

export default function SettingsOverviewRoute() {
  const { signOut } = useAuth()
  const { plan } = usePlan()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  const accountItems: SettingsItem[] = [
    { label: 'Name', to: 'name' },
    { label: 'Email', to: 'email' },
    { label: 'Password', to: 'password' },
  ]
  const helpItems: SettingsItem[] = [
    { label: 'FAQ' },
    { label: 'Contact Us' },
    { label: 'Report a bug' },
  ]
  const appPrefs: SettingsItem[] = [
    { label: 'Notifications', to: 'notifications' },
    { label: 'Terms of Service' },
    { label: 'Privacy' },
  ]
  const dataItems: SettingsItem[] = [
    { label: 'Export data', to: 'export' },
    { label: 'Delete account', to: 'delete', tone: 'danger' },
  ]

  function handleNavigate(item: SettingsItem) {
    if (!item.to) return
    navigate(item.to)
  }

  async function handleConfirmLogout() {
    try {
      await signOut()
      showToast('You have been logged out.')
      navigate('/auth', { replace: true })
    } catch {
      showToast('Failed to log out. Please try again.', 'error')
    }
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
          <button
            type="button"
            className={styles.item}
            onClick={() => navigate('plan')}
          >
            <span>
              Plan
              <PlanBadge tier={plan.tier} trialEndsAt={plan.trialEndsAt} />
            </span>
            <span aria-hidden="true">›</span>
          </button>
          {accountItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.item} ${item.tone === 'danger' ? styles.itemDanger : ''}`}
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
              className={`${styles.item} ${item.tone === 'danger' ? styles.itemDanger : ''}`}
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
              className={`${styles.item} ${item.tone === 'danger' ? styles.itemDanger : ''}`}
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
        <h2 className={styles.sectionTitle}>Data & privacy</h2>
        <div className={styles.list}>
          {dataItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.item} ${item.tone === 'danger' ? styles.itemDanger : ''}`}
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

      <div className={styles.logoutSection}>
        <button type="button" className={styles.logout} onClick={() => setConfirmingLogout(true)}>
          Log out
        </button>
      </div>

      {confirmingLogout ? (
        <div role="dialog" aria-modal="true" className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>Log out?</h2>
            <p className={styles.dialogBody}>You can sign back in anytime with your email and password.</p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmingLogout(false)}>
                Cancel
              </button>
              <button type="button" className={styles.dangerButton} onClick={() => void handleConfirmLogout()}>
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
