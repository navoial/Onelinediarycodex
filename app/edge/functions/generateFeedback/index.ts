import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
const OPENAI_URL = Deno.env.get('OPENAI_API_URL') ?? 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODERATION_URL = Deno.env.get('OPENAI_MODERATION_URL') ?? 'https://api.openai.com/v1/moderations'
const OPENAI_MODERATION_MODEL = Deno.env.get('OPENAI_MODERATION_MODEL') ?? 'omni-moderation-latest'
const OPENAI_MODERATION_URL = Deno.env.get('OPENAI_MODERATION_URL') ?? 'https://api.openai.com/v1/moderations'
const OPENAI_MODERATION_MODEL = Deno.env.get('OPENAI_MODERATION_MODEL') ?? 'omni-moderation-latest'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables inside generateFeedback function.')
}

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : undefined

type GenerateFeedbackRequest = {
  entry_id?: string
}

type EntryRow = {
  id: string
  user_id: string
  entry_date: string
  one_liner: string
  updated_at: string
}

type HistoryRow = {
  entry_date: string
  one_liner: string
}

type AiResponse = {
  feedback: string
}

async function fetchEntry(entryId: string): Promise<EntryRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('entries')
    .select('id, user_id, entry_date, one_liner, updated_at')
    .eq('id', entryId)
    .single()
  if (error) {
    console.error('fetchEntry error', error)
    return null
  }
  return data
}

async function fetchHistory(userId: string, entryDate: string): Promise<HistoryRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('entries')
    .select('entry_date, one_liner')
    .eq('user_id', userId)
    .lt('entry_date', entryDate)
    .order('entry_date', { ascending: false })
    .limit(7)
  if (error) {
    console.error('fetchHistory error', error)
    return []
  }
  return data ?? []
}

function buildPrompt(entry: EntryRow, history: HistoryRow[]) {
  const formattedHistory = history
    .map((item) => `- ${item.entry_date}: ${item.one_liner}`)
    .join('\n')
  return `You are a calm journaling coach. You must respond with three parts: 1) Reflection sentence mirroring the user's current entry, 2) A micro-step suggestion for tomorrow, 3) A single guiding question. Keep everything concise, respectful, and under 320 characters total. Do not use emojis.\n\nToday: ${entry.entry_date}\nEntry: ${entry.one_liner}\nRecent context:\n${formattedHistory || 'None'}`
}

async function callOpenAI(prompt: string): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY missing; returning fallback message')
    return 'It sounds like today brought some meaningful moments. Consider one small action you can take tomorrow, and ask yourself what support could help you follow through.'
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You help users reflect on their day with short, gentle coaching. Follow the required format strictly: reflection + micro-step + guiding question. Keep total length ≤ 320 characters.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    console.error('OpenAI API error', await response.text())
    return null
  }

  const payload = await response.json()
  const message = payload?.choices?.[0]?.message?.content
  return typeof message === 'string' ? message.trim() : null
}

async function checkSelfHarmRisk(content: string): Promise<boolean> {
  if (!OPENAI_API_KEY) {
    return false
  }

  try {
    const response = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input: content,
      }),
    })
    if (!response.ok) {
      console.warn('Moderation API error', await response.text())
      return false
    }
    const payload = await response.json()
    const result = payload?.results?.[0]
    if (!result) {
      return false
    }
    const categories = result.categories ?? {}
    const selfHarmCategory =
      categories['self-harm'] || categories['self-harm-intent'] || categories['self-harm-instructions']
    return Boolean(selfHarmCategory)
  } catch (error) {
    console.warn('Moderation check failed', error)
    return false
  }
}

const SELF_HARM_FALLBACK =
  'I’m really sorry that things feel heavy right now. If you’re in immediate danger, please contact local emergency services. You can call or text 988 in the US/Canada, or find worldwide helplines at https://www.opencounseling.com/suicide-hotlines.'

async function checkSelfHarmRisk(content: string): Promise<boolean> {
  if (!OPENAI_API_KEY) {
    return false
  }

  try {
    const response = await fetch(OPENAI_MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input: content,
      }),
    })
    if (!response.ok) {
      console.warn('Moderation API error', await response.text())
      return false
    }
    const payload = await response.json()
    const result = payload?.results?.[0]
    if (!result) {
      return false
    }
    const categories = result.categories ?? {}
    const selfHarmCategory = categories['self-harm'] || categories['self-harm-intent'] || categories['self-harm-instructions']
    return Boolean(selfHarmCategory)
  } catch (error) {
    console.warn('Moderation check failed', error)
    return false
  }
}

const SELF_HARM_FALLBACK =
  'I’m really sorry that things feel heavy right now. If you’re in immediate danger, please contact local emergency services. You can call or text 988 in the US/Canada, or find worldwide helplines at https://www.opencounseling.com/suicide-hotlines.'

async function updateEntry(entryId: string, feedback: string) {
  if (!supabase) return false
  const { error } = await supabase
    .from('entries')
    .update({ ai_feedback: feedback, ai_feedback_generated_at: new Date().toISOString() })
    .eq('id', entryId)
  if (error) {
    console.error('updateEntry error', error)
    return false
  }
  return true
}

serve(async (req) => {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase client misconfigured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as GenerateFeedbackRequest
    if (!body.entry_id) {
      return new Response(JSON.stringify({ error: 'entry_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const entry = await fetchEntry(body.entry_id)
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const history = await fetchHistory(entry.user_id, entry.entry_date)
    const moderationPayload = [entry.one_liner, ...history.map((item) => item.one_liner)].join('\n')
    const hasSelfHarmRisk = await checkSelfHarmRisk(moderationPayload)

    if (hasSelfHarmRisk) {
      await updateEntry(entry.id, SELF_HARM_FALLBACK)
      return new Response(JSON.stringify({ feedback: SELF_HARM_FALLBACK, flagged: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const prompt = buildPrompt(entry, history)
    const feedback = await callOpenAI(prompt)

    if (!feedback) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedFeedback = feedback.length > 320 ? `${feedback.slice(0, 317).trimEnd()}...` : feedback

    await updateEntry(entry.id, normalizedFeedback)

    return new Response(JSON.stringify({ feedback: normalizedFeedback, flagged: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generateFeedback error', error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
