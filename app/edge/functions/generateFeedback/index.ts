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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables inside generateFeedback function.')
}

const supabase =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : undefined

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

type AiFeedbackParts = {
  reflection: string
  micro_step: string
  question: string
}

type AiResult = {
  text: string
  parts: {
    reflection: string
    microStep: string
    question: string
  }
}

type UpdateResult = {
  success: boolean
  skipped?: boolean
  generatedAt?: string
}

type SupportedLanguage = 'en' | 'ru'

const SELF_HARM_FALLBACK =
  'I’m really sorry that things feel heavy right now. If you’re in immediate danger, please contact local emergency services. You can call or text 988 in the US/Canada, or find worldwide helplines at https://www.opencounseling.com/suicide-hotlines.'

function ensureSentence(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const terminal = trimmed.at(-1)
  if (terminal && ['.', '!', '?'].includes(terminal)) {
    return trimmed
  }
  return `${trimmed}.`
}

function ensureQuestion(value: string) {
  const trimmed = value.trim().replace(/[.?!]+$/g, '')
  if (!trimmed) return ''
  return `${trimmed}?`
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}

function composeFeedback(parts: AiFeedbackParts): AiResult {
  const reflection = ensureSentence(parts.reflection)
  const microStep = ensureSentence(parts.micro_step)
  const question = ensureQuestion(parts.question)
  let combined = `${reflection} ${microStep} ${question}`.trim()
  if (combined.length > 320) {
    // Prefer trimming micro-step first, then reflection.
    const spare = 320 - (question.length + 1)
    const microLimit = Math.max(60, spare - reflection.length)
    const adjustedMicro = truncate(microStep, Math.min(microLimit, microStep.length))
    combined = `${reflection} ${adjustedMicro} ${question}`.trim()
    if (combined.length > 320) {
      const reflectionLimit = Math.max(60, 320 - (adjustedMicro.length + question.length + 2))
      const adjustedReflection = truncate(reflection, reflectionLimit)
      combined = `${adjustedReflection} ${adjustedMicro} ${question}`.trim()
      if (combined.length > 320) {
        combined = truncate(combined, 320)
      }
    }
  }

  return {
    text: combined,
    parts: {
      reflection,
      microStep: microStep,
      question,
    },
  }
}

function detectEntryLanguage(text: string): SupportedLanguage {
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru'
  }
  return 'en'
}

function languageDisplayName(language: SupportedLanguage) {
  switch (language) {
    case 'ru':
      return 'Russian'
    default:
      return 'English'
  }
}

function createFallbackParts(entry: EntryRow): AiFeedbackParts {
  const language = detectEntryLanguage(entry.one_liner)
  if (language === 'ru') {
    return {
      reflection: 'Похоже, что сегодняшний день оказался непростым, и это нормально — замечать свои чувства.',
      micro_step: 'Завтра попробуйте выделить маленький момент для отдыха или привычку, которая поддержит вас.',
      question: 'Что могло бы помочь вам почувствовать себя немного спокойнее завтра?',
    }
  }

  return {
    reflection: 'It sounds like today held meaningful moments for you.',
    micro_step: 'Consider one small action you can take tomorrow to support how you want to feel.',
    question: 'What support would help you follow through?',
  }
}

function buildPrompt(entry: EntryRow, history: HistoryRow[]) {
  const formattedHistory = history
    .map((item) => `- ${item.entry_date}: ${item.one_liner}`)
    .join('\n')
  return `Today is ${entry.entry_date}. The user wrote: "${entry.one_liner}". Recent entries (most recent first):\n${formattedHistory || 'None'}`
}

async function callOpenAI(entry: EntryRow, history: HistoryRow[]): Promise<AiResult | null> {
  const detectedLanguage = detectEntryLanguage(entry.one_liner)
  if (!OPENAI_API_KEY) {
    return composeFeedback(createFallbackParts(entry))
  }

  const prompt = buildPrompt(entry, history)
  const languageName = languageDisplayName(detectedLanguage)

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
            `You are a calm journaling coach. Detect the primary language of the user entry and respond entirely in that language. The entry appears to be in ${languageName}; if you clearly identify another language, use that instead. Respond using JSON that contains a short reflection, a micro-step suggestion for tomorrow, and a guiding question. Tone: respectful, no emojis, no clinical language. Keep the combined response within 320 characters when the sentences are read together.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'insight_feedback',
          schema: {
            type: 'object',
            properties: {
              reflection: { type: 'string', maxLength: 200 },
              micro_step: { type: 'string', maxLength: 200 },
              question: { type: 'string', maxLength: 200 },
            },
            required: ['reflection', 'micro_step', 'question'],
            additionalProperties: false,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    console.error('OpenAI API error', await response.text())
    return null
  }

  const payload = await response.json()
  const rawContent = payload?.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string') {
    console.error('Unexpected OpenAI response shape', payload)
    return null
  }

  let parsed: AiFeedbackParts | null = null
  try {
    parsed = JSON.parse(rawContent) as AiFeedbackParts
  } catch (error) {
    console.error('Failed to parse AI response as JSON', error, rawContent)
    return null
  }

  return composeFeedback(parsed)
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
    return Boolean(
      categories['self-harm'] || categories['self-harm-intent'] || categories['self-harm-instructions'],
    )
  } catch (error) {
    console.warn('Moderation check failed', error)
    return false
  }
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

async function updateEntry(entry: EntryRow, feedback: string): Promise<UpdateResult> {
  if (!supabase) return { success: false }
  const generatedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('entries')
    .update({ ai_feedback: feedback, ai_feedback_generated_at: generatedAt })
    .eq('id', entry.id)
    .eq('updated_at', entry.updated_at)
    .select('id')
  if (error) {
    console.error('updateEntry error', error)
    return { success: false }
  }
  if (!data || data.length === 0) {
    return { success: false, skipped: true }
  }
  return { success: true, generatedAt }
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        status: 200,
        headers: corsHeaders,
      })
    }

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase client misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json().catch(() => ({}))) as GenerateFeedbackRequest
    if (!body.entry_id) {
      return new Response(JSON.stringify({ error: 'entry_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const entry = await fetchEntry(body.entry_id)
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const history = await fetchHistory(entry.user_id, entry.entry_date)
    const moderationPayload = [entry.one_liner, ...history.map((item) => item.one_liner)].join('\n')
    const hasSelfHarmRisk = await checkSelfHarmRisk(moderationPayload)

    if (hasSelfHarmRisk) {
      const updateResult = await updateEntry(entry, SELF_HARM_FALLBACK)
      if (updateResult.skipped) {
        return new Response(JSON.stringify({ skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ feedback: SELF_HARM_FALLBACK, flagged: true, generatedAt: updateResult.generatedAt }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const aiResult = await callOpenAI(entry, history)
    if (!aiResult) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updateResult = await updateEntry(entry, aiResult.text)
    if (updateResult.skipped) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!updateResult.success || !updateResult.generatedAt) {
      return new Response(JSON.stringify({ error: 'Failed to persist feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        feedback: aiResult.text,
        parts: aiResult.parts,
        flagged: false,
        generatedAt: updateResult.generatedAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('generateFeedback error', error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
