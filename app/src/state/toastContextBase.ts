import { createContext } from 'react'

type ToastTone = 'success' | 'error'

type Toast = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
export type { Toast, ToastTone, ToastContextValue }
