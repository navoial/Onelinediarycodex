import { serve } from 'https://deno.land/std@0.210.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL')
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')

function buildCorsHeaders(req: Request) {
  const requestHeaders = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': requestHeaders || 'authorization, Authorization, x-client-info, apikey, content-type, accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function errorResponse(req: Request, message: string, status: number) {
  const corsHeaders = buildCorsHeaders(req)
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const corsHeaders = buildCorsHeaders(req)
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405)
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables inside exportData function.')
    return errorResponse(req, 'Server not configured', 500)
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return errorResponse(req, 'Unauthorized', 401)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const body = (await req.json().catch(() => ({}))) as { format?: 'json' | 'text' }
  const format = body.format === 'text' ? 'text' : 'json'

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return errorResponse(req, 'Unauthorized', 401)
  }

  const userId = user.id

  const [{ data: profile, error: profileError }, { data: entries, error: entriesError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('entries')
      .select('entry_date, one_liner, long_text, ai_feedback, ai_feedback_generated_at, created_at, updated_at')
      .eq('user_id', userId)
      .order('entry_date', { ascending: true }),
  ])

  if (profileError) {
    console.error('Failed to fetch profile for export', profileError)
    return errorResponse(req, 'Could not load profile data', 500)
  }

  if (entriesError) {
    console.error('Failed to fetch entries for export', entriesError)
    return errorResponse(req, 'Could not load entries', 500)
  }

  const generatedAt = new Date().toISOString()
  const exportPayload = {
    generated_at: generatedAt,
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    entries: entries ?? [],
  }

  const corsHeaders = buildCorsHeaders(req)

  if (format === 'text') {
    const lines: string[] = []
    lines.push('One Line Diary export')
    lines.push(`Generated at: ${generatedAt}`)
    lines.push('')
    if (profile) {
      lines.push('Profile:')
      Object.entries(profile).forEach(([key, value]) => {
        lines.push(`  ${key}: ${value ?? ''}`)
      })
      lines.push('')
    }
    lines.push('Entries:')
    for (const entry of entries ?? []) {
      lines.push(`- ${entry.entry_date}`)
      lines.push(`  One sentence: ${entry.one_liner ?? ''}`)
      if (entry.long_text) {
        lines.push('  Long entry:')
        lines.push(`    ${entry.long_text}`)
      }
      if (entry.ai_feedback) {
        lines.push(`  AI feedback: ${entry.ai_feedback}`)
      }
      lines.push('')
    }
    const textPayload = lines.join('\n')
    return new Response(textPayload, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="onelinediary-export-${generatedAt}.txt"`,
      },
    })
  }

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="onelinediary-export-${generatedAt}.json"`,
    },
  })
})
