import styles from './AIInsightCard.module.css'

type Props = {
  status: 'idle' | 'loading' | 'delayed' | 'ready' | 'error' | 'flagged'
  feedback?: string
  fallbackMessage?: string
  flagged?: boolean
}

export default function AIInsightCard({ status, feedback, fallbackMessage, flagged = false }: Props) {
  if (status === 'idle') {
    return null
  }

  return (
    <section className={styles.card} aria-live="polite">
      <span className={styles.badge}>Insight</span>
      {status === 'loading' ? (
        <div className={styles.skeleton} />
      ) : status === 'delayed' ? (
        <p className={styles.text}>{fallbackMessage ?? 'Feedback will appear shortly.'}</p>
      ) : status === 'error' ? (
        <p className={styles.text}>{fallbackMessage ?? 'We could not load feedback.'}</p>
      ) : status === 'flagged' ? (
        <p className={styles.text}>{feedback}</p>
      ) : (
        <p className={styles.text}>{feedback}</p>
      )}
      {flagged && status === 'flagged' ? (
        <p className={styles.notice}>If you need immediate support, please reach out to local emergency services or trusted helplines.</p>
      ) : null}
    </section>
  )
}
