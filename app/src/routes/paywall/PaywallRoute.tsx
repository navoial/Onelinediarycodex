import styles from './PaywallRoute.module.css'

const benefits = [
  'Personalized reflection prompts',
  'Save longer entries any time',
  'Export your memories securely',
]

export default function PaywallRoute() {
  return (
    <div className={styles.container}>
      <h1>Unlock Premium</h1>
      <div className={styles.card}>
        <p>Daily AI insights, long-form notes, and mindful reminders.</p>
        <ul className={styles.list}>
          {benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <button type="button" className={styles.primaryButton}>
          Start 7-day trial
        </button>
        <button type="button" className={styles.secondaryButton}>
          Restore purchases
        </button>
      </div>
    </div>
  )
}
