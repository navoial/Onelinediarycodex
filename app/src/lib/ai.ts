import { supabase } from './supabase'

export type AiFeedbackResponse = {
  feedback: string
  generatedAt?: string
  flagged?: boolean
  parts?: {
    reflection: string
    microStep: string
    question: string
  }
}

export async function requestFeedback(entryId: string): Promise<AiFeedbackResponse | null> {
  if (!supabase) {
    throw new Error('Supabase client is not configured')
  }

  const { data, error } = await supabase.functions.invoke<AiFeedbackResponse & { skipped?: boolean }>(
    'generateFeedback',
    {
      body: { entry_id: entryId },
    },
  )

  if (error) {
    throw new Error(error.message ?? 'Failed to generate feedback')
  }

  if (data?.skipped) {
    return null
  }

  if (!data?.feedback) {
    throw new Error('No feedback returned')
  }

  return {
    feedback: data.feedback,
    generatedAt: data.generatedAt,
    flagged: data.flagged ?? false,
    parts: data.parts,
  }
}
