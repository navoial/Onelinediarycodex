import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/state/useAuth'
import styles from './AuthRoute.module.css'

export default function AuthRoute() {
  const navigate = useNavigate()
  const { signIn, signUp, status } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/', { replace: true })
    }
  }, [navigate, status])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setIsSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setInfo('Check your inbox to confirm your email before signing in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleMode() {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
    setError(null)
    setInfo(null)
  }

  async function handleOAuth(provider: 'google') {
    try {
      setError(null)
      setInfo('Redirecting…')
      const { signInWithOAuth } = await import('@/state/oauthSignIn')
      await signInWithOAuth(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className={styles.toggle}>
          {mode === 'signin' ? 'Need an account?' : 'Already have an account?'}{' '}
          <button type="button" onClick={toggleMode}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className={styles.error}>{error}</p> : null}
          {info ? <p className={styles.info}>{info}</p> : null}
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div className={styles.divider}>or</div>
        <button className={styles.secondaryButton} type="button" onClick={() => void handleOAuth('google')}>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
