import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/useAuth'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

export default function SettingsDeleteAccountRoute() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [confirmation, setConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      showToast('Supabase client not configured.', 'error')
      return
    }
    if (confirmation.trim() !== (user?.email ?? '')) {
      showToast('Type your email to confirm deletion.', 'error')
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase.functions.invoke('deleteAccount', { method: 'POST', body: {} })
      if (error) {
        throw error
      }
      await supabase.auth.signOut()
      showToast('Your account has been deleted.')
      navigate('/auth', { replace: true })
    } catch (error) {
      console.error('Failed to delete account', error)
      showToast('We could not delete your account. Please try again.', 'error')
      setIsDeleting(false)
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
        <h1 className={styles.title}>Delete account</h1>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <p className={styles.helperText}>
          This will permanently remove your entries, profile data, and account access. This action cannot be undone.
        </p>
        <label className={styles.label} htmlFor="confirmation">
          Type your email to confirm
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="email"
          className={styles.input}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={user?.email ?? 'you@example.com'}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.dangerButton} disabled={isDeleting || confirmation.trim() !== (user?.email ?? '')}>
            {isDeleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </div>
  )
}
