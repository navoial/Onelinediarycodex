import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/useAuth'
import { usePlan } from '@/state/usePlan'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

export default function SettingsNameRoute() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { refreshProfile } = usePlan()
  const { showToast } = useToast()
  const initialName = (user?.fullName ?? '').trim()
  const [fullName, setFullName] = useState(initialName)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(initialName)
    setStatus('idle')
    setError(null)
  }, [initialName])

  const cleaned = useMemo(() => fullName.trim(), [fullName])
  const hasChanges = cleaned !== initialName

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

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: cleaned || null },
    })

    if (updateError) {
      setStatus('error')
      setError(updateError.message)
      return
    }

    try {
      await refreshUser()
      void refreshProfile()
    } catch (refreshError) {
      console.warn('Failed to refresh profile after name update', refreshError)
    }
    setStatus('success')
    showToast('Name updated.')
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
        <h1 className={styles.title}>Name</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          className={styles.input}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Add your name"
        />

        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!hasChanges || cleaned.length === 0 || status === 'saving'}
          >
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
        {status === 'success' ? <p className={styles.successText}>Name updated.</p> : null}
      </form>
    </div>
  )
}
