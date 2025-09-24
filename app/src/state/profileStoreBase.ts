import { createContext } from 'react'

export type PlanTier = 'free' | 'trial' | 'premium'

export type PlanInfo = {
  tier: PlanTier
  trialEndsAt: string | null
  daysRemaining: number | null
  isTrialActive: boolean
  isPremium: boolean
  canUseLongForm: boolean
  canRequestFeedback: boolean
}

export type ProfileContextValue = {
  status: 'loading' | 'ready' | 'error'
  plan: PlanInfo
  refreshProfile: () => Promise<void>
  setLocalPlan: (tier: PlanTier) => void
}

export const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)
