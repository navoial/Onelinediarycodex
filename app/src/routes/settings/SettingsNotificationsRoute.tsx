import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsRoute.module.css'

export default function SettingsNotificationsRoute() {
  const navigate = useNavigate()
  const [dailyReminder, setDailyReminder] = useState(false)
  const [weeklySummary, setWeeklySummary] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO: wire to Capacitor notifications once implemented
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
        <h1 className={styles.title}>Notifications</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <fieldset className={styles.toggleGroup}>
          <legend className={styles.sectionTitle}>Reminders</legend>
          <label className={styles.toggleRow}>
            <span>Daily reminder</span>
            <input type="checkbox" checked={dailyReminder} onChange={(event) => setDailyReminder(event.target.checked)} />
          </label>
          <p className={styles.helperText}>We’ll nudge you each evening at 8pm.</p>

          <label className={styles.toggleRow}>
            <span>Weekly summary</span>
            <input type="checkbox" checked={weeklySummary} onChange={(event) => setWeeklySummary(event.target.checked)} />
          </label>
          <p className={styles.helperText}>Get a Sunday digest with highlights from your week.</p>
        </fieldset>

        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton} disabled>
            Coming soon
          </button>
        </div>
      </form>
    </div>
  )
}
