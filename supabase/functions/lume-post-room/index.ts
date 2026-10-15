import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const matrixServer = (Deno.env.get('MATRIX_SERVER') || 'https://matrix.castalia.institute').replace(/\/$/, '')
const matrixDomain = Deno.env.get('MATRIX_DOMAIN') || 'castalia.institute'
const matrixAdminUser = Deno.env.get('MATRIX_ADMIN_USER') || `@custodian:${matrixDomain}`
const matrixAdminPassword = Deno.env.get('MATRIX_ADMIN_PASSWORD')
const allowedOrigins = new Set([
  'https://lume.castalia.institute',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
])

type ContentType = 'post' | 'quote'

function facultyDisplayName(person: { name?: string | null; surname?: string | null } | null): string {
  const raw = String(person?.name || '').trim()
  const surname = String(person?.surname || '').trim()
  if (!raw) return surname
  const parts = raw.split(/\s*,\s*/).filter(Boolean)
  if (parts.length > 1) {
    const family = parts[0]
    const tail = parts.slice(1)
    if (tail.some(part => /^(?:emperor|empress|king|queen|pharaoh|pope)\b/i.test(part))) return family
    const annotation = /^(?:graf|comte|count|earl|baron|lord|lady|emperor|empress|king|queen|pharaoh|pope|sultan|caliph|of\b|b\.?\s*\d{3,4}|d\.?\s*\d{3,4}|\d{3,4}(?:\s*[-–]\s*\d{2,4})?)/i
    const givenTokens = tail.filter(part => !annotation.test(part)).join(' ').trim().split(/\s+/).filter(Boolean)
    const familyTokens = family.toLocaleLowerCase().split(/\s+/)
    while (givenTokens.length && familyTokens.includes(givenTokens[givenTokens.length - 1].toLocaleLowerCase())) givenTokens.pop()
    return [givenTokens.join(' ').trim(), family].filter(Boolean).join(' ')
  }
  return !surname || raw.toLocaleLowerCase().endsWith(surname.toLocaleLowerCase()) ? raw : `${raw} ${surname}`.trim()
}

function json(body: unknown, status = 200, origin = '') {
  const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://lume.castalia.institute'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  })
}

async function matrixAccessToken(): Promise<string> {
  if (!matrixAdminPassword) throw new Error('Matrix room provisioning is not configured.')
  const localpart = matrixAdminUser.replace(/^@/, '').split(':')[0]
  const response = await fetch(`${matrixServer}/_matrix/client/v3/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: localpart },
      password: matrixAdminPassword,
    }),
  })
  if (!response.ok) throw new Error('Matrix sign-in failed.')
  const data = await response.json()
  if (typeof data.access_token !== 'string') throw new Error('Matrix returned no access token.')
  return data.access_token
}

async function resolveAlias(alias: string, token: string): Promise<string | null> {
  const roomAlias = encodeURIComponent(`#${alias}:${matrixDomain}`)
  const response = await fetch(`${matrixServer}/_matrix/client/v3/directory/room/${roomAlias}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const data = await response.json()
  if (typeof data.room_id !== 'string') return null
  const createEvent = await fetch(`${matrixServer}/_matrix/client/v3/rooms/${encodeURIComponent(data.room_id)}/state/m.room.create`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!createEvent.ok) return null
  const state = await createEvent.json()
  return state.sender === matrixAdminUser ? data.room_id : null
}

async function createOrResolveRoom(
  alias: string,
  name: string,
  topic: string,
  token: string,
): Promise<{ roomId: string; created: boolean }> {
  const response = await fetch(`${matrixServer}/_matrix/client/v3/createRoom`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_alias_name: alias,
      name: name.slice(0, 250),
      topic: topic.slice(0, 1000),
      preset: 'public_chat',
      visibility: 'public',
      room_version: '10',
      creation_content: { 'm.federate': false },
    }),
  })
  if (response.ok) {
    const data = await response.json()
    if (typeof data.room_id === 'string') return { roomId: data.room_id, created: true }
    throw new Error('Matrix created a room without returning its ID.')
  }

  // A deterministic alias makes retries and simultaneous first replies idempotent.
  if (response.status === 409) {
    const existing = await resolveAlias(alias, token)
    if (existing) return { roomId: existing, created: false }
  }
  throw new Error('Matrix could not create the discussion room.')
}

async function sendRoomContext(roomId: string, contentId: string, author: string, title: string, body: string, postUrl: string, token: string) {
  const transactionId = `lume_context_${contentId.replaceAll('-', '')}`
  const message = `A conversation for ${author}'s Lume: ${title}\n\n${body.slice(0, 9000)}\n\nOpen this Lume: ${postUrl}\n\nThis room belongs to this post. Use Matrix’s thread reply action on this opening post to keep replies connected.`
  const response = await fetch(`${matrixServer}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${transactionId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'm.text', body: message }),
  })
  if (!response.ok) throw new Error('Matrix could not add the post context to its room.')
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || ''
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://lume.castalia.institute', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin)
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Room service is not configured.' }, 503, origin)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in to open a discussion.' }, 401, origin)

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userResult, error: userError } = await userClient.auth.getUser()
    if (userError || !userResult.user) return json({ error: 'Sign in to open a discussion.' }, 401, origin)

    const body = await request.json()
    const contentType = body.content_type as ContentType
    const contentId = String(body.content_id || '')
    if (!['post', 'quote'].includes(contentType) || !/^[0-9a-f-]{36}$/i.test(contentId)) {
      return json({ error: 'Choose a valid published Lume.' }, 400, origin)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: existing, error: lookupError } = await admin
      .from('lume_discussion_rooms')
      .select('id,matrix_room_id,matrix_room_alias')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .maybeSingle()
    if (lookupError) throw new Error('Apply the Lume discussion migration before opening rooms.')
    let room = existing
    if (!room) {
      const contentResult = contentType === 'post'
        ? await admin.from('lume_posts').select('id,title,body,faculty_id,status').eq('id', contentId).eq('status', 'published').maybeSingle()
        : await admin.from('faculty_quotes').select('id,book_title,passage_label,quote_text,faculty_id,status').eq('id', contentId).eq('status', 'published').maybeSingle()
      const content: any = contentResult.data
      if (contentResult.error || !content) return json({ error: 'This Lume is not available for discussion.' }, 404, origin)

      const { data: faculty } = await admin
        .from('faculty')
        .select('name,surname')
        .eq('id', content.faculty_id)
        .maybeSingle()
      const author = facultyDisplayName(faculty) || 'Castalia faculty'
      const title = contentType === 'post'
        ? content.title || String(content.body || '').slice(0, 72)
        : [content.book_title, content.passage_label].filter(Boolean).join(' · ') || String(content.quote_text || '').slice(0, 72)
      const alias = `lume-${contentType}-${contentId.replaceAll('-', '')}`
      const roomName = `${author} · ${String(title).slice(0, 90)}`
      const postUrl = `https://lume.castalia.institute/?${contentType}=${encodeURIComponent(contentId)}`
      const roomTopic = `A threaded discussion for ${author}'s Lume: ${String(title)}. Open this post: ${postUrl}`
      const token = await matrixAccessToken()
      const { roomId, created } = await createOrResolveRoom(alias, roomName, roomTopic, token)
      const contextBody = contentType === 'post' ? String(content.body || '') : `“${String(content.quote_text || '')}”`
      if (created) await sendRoomContext(roomId, contentId, author, String(title), contextBody, postUrl, token)

      const { data: createdRoom, error: saveError } = await admin
        .from('lume_discussion_rooms')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          matrix_room_id: roomId,
          matrix_room_alias: `#${alias}:${matrixDomain}`,
          created_by: userResult.user.id,
        }, { onConflict: 'content_type,content_id' })
        .select('id,matrix_room_id,matrix_room_alias')
        .single()
      if (saveError || !createdRoom) throw new Error('The room exists, but its Lume link could not be saved. Please retry.')
      room = createdRoom
    }

    const { error: memberError } = await admin
      .from('lume_discussion_members')
      .upsert({ discussion_id: room.id, member_id: userResult.user.id, last_opened_at: new Date().toISOString() }, { onConflict: 'discussion_id,member_id' })
    if (memberError) throw new Error('Apply the Lume discussion members migration before opening rooms.')
    return json({ room_id: room.matrix_room_id, room_alias: room.matrix_room_alias }, 200, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open this discussion.'
    return json({ error: message }, 500, origin)
  }
})
