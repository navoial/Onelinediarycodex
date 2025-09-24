import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

type ProfileContextValue = {
  status: 'loading' | 'ready' | 'error'
  plan: PlanInfo
  refreshProfile: () => Promise<void>
  setLocalPlan: (tier: PlanTier) => void
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

const PROFILE_STORAGE_KEY = 'onelinediary.profile.plan'
const DEFAULT_PLAN: PlanInfo = {
  tier: 'free',
  trialEndsAt: null,
  daysRemaining: null,
  isTrialActive: false,
  isPremium: false,
  canUseLongForm: false,
  canRequestFeedback: false,
}

function resolvePlan(tier: PlanTier, trialEndsAt: string | null): PlanInfo {
  if (tier === 'premium') {
    return {
      tier: 'premium',
      trialEndsAt,
      daysRemaining: null,
      isTrialActive: false,
      isPremium: true,
      canUseLongForm: true,
      canRequestFeedback: true,
    }
  }

  const now = new Date()
  const trialDate = trialEndsAt ? new Date(trialEndsAt) : null
  const isTrialActive = tier === 'trial' && trialDate !== null && trialDate.getTime() > now.getTime()
  const msRemaining = isTrialActive && trialDate ? trialDate.getTime() - now.getTime() : null
  const daysRemaining = msRemaining !== null ? Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))) : null
  const resolvedTier: PlanTier = isTrialActive ? 'trial' : 'free'

  return {
    tier: resolvedTier,
    trialEndsAt,
    daysRemaining,
    isTrialActive,
    isPremium: false,
    canUseLongForm: isTrialActive,
    canRequestFeedback: isTrialActive,
  }
}

function loadStoredPlan(): PlanInfo {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_PLAN
  }
  const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!stored) {
    return DEFAULT_PLAN
  }
  try {
    const parsed = JSON.parse(stored) as { tier: PlanTier; trialEndsAt: string | null }
    return resolvePlan(parsed.tier, parsed.trialEndsAt)
  } catch (error) {
    console.warn('Failed to parse stored plan', error)
    return DEFAULT_PLAN
  }
}

function storePlan(plan: PlanInfo) {
  if (typeof localStorage === 'undefined') return
  const data = { tier: plan.tier, trialEndsAt: plan.trialEndsAt }
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to persist plan', error)
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [plan, setPlan] = useState<PlanInfo>(() => loadStoredPlan())

  const applyPlan = useCallback((nextTier: PlanTier, trialEndsAt: string | null) => {
    setPlan((prev) => {
      const resolved = resolvePlan(nextTier, trialEndsAt)
      if (resolved.tier !== prev.tier || resolved.trialEndsAt !== prev.trialEndsAt) {
        storePlan(resolved)
      }
      return resolved
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setStatus('ready')
      return
    }

    setStatus('loading')
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium, trial_ends_at')
      .maybeSingle()

    if (error) {
      console.warn('Failed to fetch profile', error)
      setStatus('error')
      return
    }

    if (!data) {
      applyPlan('free', null)
      setStatus('ready')
      return
    }

    const tier: PlanTier = data.is_premium ? 'premium' : 'free'
    if (!data.is_premium && data.trial_ends_at) {
      const trialPlan = resolvePlan('trial', data.trial_ends_at)
      applyPlan(trialPlan.isTrialActive ? 'trial' : 'free', data.trial_ends_at)
    } else {
      applyPlan(tier, data.trial_ends_at ?? null)
    }
    setStatus('ready')
  }, [applyPlan])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const setLocalPlan = useCallback(
    (tier: PlanTier) => {
      const trialEndsAt = tier === 'trial' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
      applyPlan(tier, trialEndsAt)
    },
    [applyPlan],
  )

  const value = useMemo<ProfileContextValue>(
    () => ({ status, plan, refreshProfile, setLocalPlan }),
    [plan, refreshProfile, setLocalPlan, status],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function usePlan() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('usePlan must be used within a ProfileProvider')
  }
  return context
}
