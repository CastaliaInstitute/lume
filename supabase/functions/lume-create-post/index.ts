import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  if (!cleaned || cleaned.length > maxLength) return null
  return cleaned
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Draft service is not configured.' }, 503)

  // This endpoint is for the trusted Matrix bridge only. Never accept the public anon key.
  if (request.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'Not authorized.' }, 401)
  }

  let input: Record<string, unknown>
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400)
  }

  const facultyId = cleanText(input.faculty_id, 120)
  const matrixEventId = cleanText(input.matrix_event_id, 255)
  const kind = input.kind === 'quote' || input.kind === 'reply' ? input.kind : null
  const title = cleanText(input.title, 120)
  const reflection = cleanText(input.reflection, 1200)
  const question = input.question == null ? null : cleanText(input.question, 500)
  const description = input.description == null ? null : cleanText(input.description, 700)
  const sourceQuoteId = cleanText(input.source_quote_id, 80)
  const replyToPostId = cleanText(input.reply_to_post_id, 80)

  if (!facultyId || !matrixEventId || !kind || !title || !reflection) {
    return json({ error: 'Faculty, event, kind, title, and reflection are required.' }, 400)
  }
  if ((input.question != null && !question) || (input.description != null && !description)) {
    return json({ error: 'Question or description is too long or invalid.' }, 400)
  }
  if (kind === 'quote' && (!sourceQuoteId || replyToPostId)) {
    return json({ error: 'Quote suggestions require a verified source quote.' }, 400)
  }
  if (kind === 'reply' && (!replyToPostId || sourceQuoteId)) {
    return json({ error: 'Reply suggestions require a published Lume to reply to.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: faculty, error: facultyError } = await admin
    .from('faculty')
    .select('id')
    .eq('id', facultyId)
    .maybeSingle()
  if (facultyError) {
    console.error('Lume agent draft faculty lookup failed:', facultyError.message)
    return json({ error: 'Could not verify the faculty author.' }, 500)
  }
  if (!faculty) return json({ error: 'Faculty author not found.' }, 404)

  if (kind === 'quote') {
    const { data: quote, error } = await admin
      .from('faculty_quotes')
      .select('id')
      .eq('id', sourceQuoteId)
      .eq('faculty_id', facultyId)
      .eq('status', 'published')
      .maybeSingle()
    if (error) {
      console.error('Lume agent draft source lookup failed:', error.message)
      return json({ error: 'Could not verify the source passage.' }, 500)
    }
    if (!quote) return json({ error: 'The source passage is not published for this faculty author.' }, 422)
  } else {
    const { data: target, error } = await admin
      .from('lume_posts')
      .select('id,faculty_id')
      .eq('id', replyToPostId)
      .eq('status', 'published')
      .maybeSingle()
    if (error) {
      console.error('Lume agent reply target lookup failed:', error.message)
      return json({ error: 'Could not verify the Lume reply target.' }, 500)
    }
    if (!target || target.faculty_id === facultyId) {
      return json({ error: 'Replies must target a published Lume by another faculty member.' }, 422)
    }
  }

  const row = {
    faculty_id: facultyId,
    matrix_event_id: matrixEventId,
    kind,
    title,
    reflection,
    question,
    description,
    source_quote_id: kind === 'quote' ? sourceQuoteId : null,
    reply_to_post_id: kind === 'reply' ? replyToPostId : null,
  }

  const { error: insertError } = await admin
    .from('lume_agent_drafts')
    .upsert(row, {
      onConflict: 'faculty_id,matrix_event_id,kind',
      ignoreDuplicates: true,
    })
  if (insertError) {
    console.error('Lume agent draft insert failed:', insertError.message)
    return json({ error: 'Could not save the private Lume suggestion.' }, 500)
  }

  const { data: saved, error: savedError } = await admin
    .from('lume_agent_drafts')
    .select('id,kind,status')
    .eq('faculty_id', facultyId)
    .eq('matrix_event_id', matrixEventId)
    .eq('kind', kind)
    .maybeSingle()
  if (savedError || !saved) {
    console.error('Lume agent draft lookup failed:', savedError?.message || 'no row')
    return json({ error: 'The private Lume suggestion could not be confirmed.' }, 500)
  }

  return json({ id: saved.id, kind: saved.kind, status: saved.status })
})
