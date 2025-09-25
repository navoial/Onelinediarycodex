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
    console.error('Missing Supabase environment variables inside deleteAccount function.')
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return errorResponse(req, 'Unauthorized', 401)
  }

  const userId = user.id

  const deleteResults = await Promise.allSettled([
    supabase.from('entries').delete().eq('user_id', userId),
    supabase.from('profiles').delete().eq('user_id', userId),
  ])

  deleteResults.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('Failed to delete user data chunk', result.reason)
    } else if (result.value.error) {
      console.warn('Failed to delete user data chunk', result.value.error)
    }
  })

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error('Failed to delete auth user', deleteUserError)
    return errorResponse(req, 'Could not delete account. Please contact support.', 500)
  }

  const corsHeaders = buildCorsHeaders(req)
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
