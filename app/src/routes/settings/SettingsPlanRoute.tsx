import { useNavigate } from 'react-router-dom'
import { usePlan } from '@/state/usePlan'
import styles from './SettingsRoute.module.css'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

export default function SettingsPlanRoute() {
  const navigate = useNavigate()
  const { plan } = usePlan()

  const tierLabel = plan.isPremium ? 'Premium' : plan.isTrialActive ? 'Trial' : 'Free'
  const ctaLabel = plan.isPremium ? 'Manage subscription' : 'Upgrade'
  const trialCopy = plan.trialEndsAt ? `Trial ends ${formatDate(plan.trialEndsAt)}` : null

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
        <h1 className={styles.title}>Plan</h1>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Current plan</h2>
        <div className={styles.planCard}>
          <div>
            <p className={styles.planTier}>{tierLabel}</p>
            {trialCopy ? <p className={styles.planMeta}>{trialCopy}</p> : null}
            {plan.daysRemaining !== null ? (
              <p className={styles.planMeta}>{plan.daysRemaining} days remaining</p>
            ) : null}
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => navigate('/paywall')}>
            {ctaLabel}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What you get</h2>
        <ul className={styles.benefitsList}>
          <li>Unlimited AI feedback on your reflections</li>
          <li>Long-form journaling with synced backup</li>
          <li>Daily insights and guided prompts</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Need help?</h2>
        <p className={styles.helperText}>Questions about billing or your membership? We’re happy to help.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Back
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => navigate('../')}>
            Contact support
          </button>
        </div>
      </section>
    </div>
  )
}
