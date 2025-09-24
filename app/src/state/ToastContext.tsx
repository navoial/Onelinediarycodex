import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './ToastContext.module.css'
import { ToastContext, type Toast, type ToastContextValue } from './toastContextBase'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timeout = timers.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback<ToastContextValue['showToast']>(
    (message, tone = 'success') => {
      idRef.current += 1
      const id = idRef.current
      setToasts((prev) => [...prev, { id, message, tone }])
      const timeout = setTimeout(() => removeToast(id), 4000)
      timers.current.set(id, timeout)
    },
    [removeToast],
  )

  const dismissToast = useCallback<ToastContextValue['dismissToast']>(
    (id) => {
      removeToast(id)
    },
    [removeToast],
  )

  useEffect(() => {
    const timersMap = timers.current
    return () => {
      timersMap.forEach((timeout) => clearTimeout(timeout))
      timersMap.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ showToast, dismissToast }), [dismissToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${toast.tone === 'success' ? styles.success : styles.error}`}
            role="status"
          >
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
