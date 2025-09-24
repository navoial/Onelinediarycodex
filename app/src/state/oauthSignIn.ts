import { supabase } from '@/lib/supabase'

export async function signInWithOAuth(provider: 'google') {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })
  if (error) {
    throw error
  }
}
