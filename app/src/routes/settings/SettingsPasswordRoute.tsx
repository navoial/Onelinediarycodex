import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/useAuth'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

export default function SettingsPasswordRoute() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      newPassword === confirmPassword &&
      status !== 'saving'
    )
  }, [confirmPassword, currentPassword, newPassword, status])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase client is not configured.')
      setStatus('error')
      return
    }
    if (!user?.email) {
      setError('Email is required to update password.')
      setStatus('error')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      setStatus('error')
      return
    }

    setStatus('saving')
    setError(null)

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (reauthError) {
      setStatus('error')
      setError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setStatus('error')
      setError(updateError.message)
      return
    }

    setStatus('success')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    showToast('Password updated.')
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
        <h1 className={styles.title}>Password</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className={styles.input}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
        />

        <label className={styles.label} htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className={styles.input}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
        />
        <p className={styles.helperText}>Use at least 8 characters with a mix of letters and numbers.</p>

        <label className={styles.label} htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className={styles.input}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />

        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton} disabled={!canSubmit}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {status === 'success' ? <p className={styles.successText}>Password updated.</p> : null}
      </form>
    </div>
  )
}
