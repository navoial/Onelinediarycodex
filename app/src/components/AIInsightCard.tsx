import styles from './AIInsightCard.module.css'

type Props = {
  status: 'idle' | 'loading' | 'delayed' | 'ready' | 'error' | 'flagged'
  feedback?: string
  fallbackMessage?: string
  flagged?: boolean
  parts?: {
    reflection: string
    microStep: string
    question: string
  }
}

function InsightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" {...props}>
      <circle cx="4" cy="10" r="2" fill="url(#a)" />
      <circle cx="13.5" cy="5.5" r="3.5" fill="url(#b)" />
      <circle cx="15" cy="13" r="1.5" fill="url(#c)" />
      <defs>
        <linearGradient id="a" x1="2" y1="8" x2="6" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4FD8" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="b" x1="10" y1="2" x2="17" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8A65" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="c" x1="14" y1="11.5" x2="16" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5BC7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function AIInsightCard({ status, feedback, fallbackMessage, flagged = false, parts }: Props) {
  if (status === 'idle') {
    return null
  }

  return (
    <section className={styles.card} aria-live="polite">
      <span className={styles.badge}>
        <InsightIcon className={styles.badgeIcon} />
        Insight
      </span>
      {status === 'loading' ? (
        <div className={styles.skeleton} />
      ) : status === 'delayed' ? (
        <p className={styles.text}>{fallbackMessage ?? 'Feedback will appear shortly.'}</p>
      ) : status === 'error' ? (
        <p className={styles.text}>{fallbackMessage ?? 'We could not load feedback.'}</p>
      ) : status === 'flagged' ? (
        <p className={styles.text}>{feedback}</p>
      ) : parts && (parts.reflection || parts.microStep || parts.question) ? (
        <div className={styles.list}>
          <div className={styles.item}>
            <span className={styles.label}>Reflection</span>
            <p className={styles.text}>{parts.reflection}</p>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Micro-step</span>
            <p className={styles.text}>{parts.microStep}</p>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Question</span>
            <p className={styles.text}>{parts.question}</p>
          </div>
        </div>
      ) : (
        <p className={styles.text}>{feedback}</p>
      )}
      {flagged && status === 'flagged' ? (
        <p className={styles.notice}>If you need immediate support, please reach out to local emergency services or trusted helplines.</p>
      ) : null}
    </section>
  )
}
