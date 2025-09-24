export type FeatureFlagKey = 'allowFutureEntries'

const defaultFlags: Record<FeatureFlagKey, boolean> = {
  allowFutureEntries: false,
}

let cache = { ...defaultFlags }

export function getFeatureFlag(key: FeatureFlagKey) {
  return cache[key]
}

export function setFeatureFlags(flags: Partial<Record<FeatureFlagKey, boolean>>) {
  cache = { ...cache, ...flags }
}
