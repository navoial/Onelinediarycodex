import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/useAuth'
import { usePlan } from '@/state/usePlan'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

export default function SettingsEmailRoute() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { refreshProfile } = usePlan()
  const { showToast } = useToast()
  const initialEmail = (user?.email ?? '').trim()
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEmail(initialEmail)
    setStatus('idle')
    setError(null)
  }, [initialEmail])

  const cleaned = useMemo(() => email.trim(), [email])
  const hasChanges = cleaned.length > 0 && cleaned !== initialEmail

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase client is not configured.')
      setStatus('error')
      return
    }
    if (!hasChanges) return

    setStatus('saving')
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ email: cleaned })

    if (updateError) {
      setStatus('error')
      setError(updateError.message)
      return
    }

    try {
      await refreshUser()
      void refreshProfile()
    } catch (refreshError) {
      console.warn('Failed to refresh profile after email update', refreshError)
    }
    setStatus('success')
    showToast('Check your inbox to confirm the new email.')
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
        <h1 className={styles.title}>Email</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        <p className={styles.helperText}>We'll send a confirmation link to verify changes.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!hasChanges || status === 'saving'}
          >
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {status === 'success' ? <p className={styles.successText}>Check your inbox to confirm the new email.</p> : null}
      </form>
    </div>
  )
}
