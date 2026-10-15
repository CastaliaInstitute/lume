import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const falKey = Deno.env.get('FAL_KEY')
const allowedOrigins = new Set([
  'https://lume.castalia.institute',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
])

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

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || ''
  if (request.method === 'OPTIONS') return json({}, 200, origin)
  if (request.method !== 'POST') return json({ error: 'Use POST to generate artwork.' }, 405, origin)
  if (!allowedOrigins.has(origin)) return json({ error: 'This Lume editor origin is not allowed.' }, 403, origin)
  if (!falKey) return json({ error: 'fal is not configured yet. Add FAL_KEY to Supabase Edge Function secrets.' }, 503, origin)

  const authorization = request.headers.get('Authorization') || ''
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Sign in to generate artwork.' }, 401, origin)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Your Castalia session is invalid or expired.' }, 401, origin)

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !Array.isArray(profile?.roles) || !profile.roles.some((role: string) => ['faculty', 'admin'].includes(role))) {
    return json({ error: 'fal generation is limited to signed-in faculty and editors.' }, 403, origin)
  }

  let body: { prompt?: unknown; title?: unknown; author?: unknown }
  try { body = await request.json() } catch { return json({ error: 'Request body must be JSON.' }, 400, origin) }
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > 8000) return json({ error: 'Request is too large.' }, 413, origin)
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length < 8 || prompt.length > 1000) return json({ error: 'Artwork direction must be between 8 and 1000 characters.' }, 400, origin)

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : ''
  const author = typeof body.author === 'string' ? body.author.trim().slice(0, 120) : ''
  const fullPrompt = [
    'Create a beautiful, original, symbolic background image for an literary short-form video post.',
    'Portrait 9:16 composition, rich painterly detail, expressive atmosphere, cinematic lighting.',
    'Keep the central and upper-left areas relatively low contrast and uncluttered for legible white editorial text overlays.',
    'No text, letters, captions, typography, logos, watermarks, frames, or split panels.',
    title ? `Post theme: ${title}.` : '',
    author ? `Literary voice: ${author}.` : '',
    `Art direction: ${prompt}`,
  ].filter(Boolean).join(' ')

  try {
    const generation = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: { width: 768, height: 1360 },
        num_inference_steps: 4,
        num_images: 1,
        output_format: 'webp',
        enable_safety_checker: true,
      }),
    })
    const result = await generation.json().catch(() => ({}))
    if (!generation.ok) {
      console.error('fal generation request failed', generation.status)
      return json({ error: generation.status === 401 || generation.status === 403 ? 'fal rejected its server API key.' : 'fal could not generate the image. Try again in a moment.' }, 502, origin)
    }

    let imageUrl = result.images?.[0]?.url
    if (typeof imageUrl !== 'string' && typeof result.request_id === 'string' && typeof result.status_url === 'string' && typeof result.response_url === 'string') {
      for (const link of [result.status_url, result.response_url]) {
        const parsed = new URL(link)
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'queue.fal.run') throw new Error('Unexpected fal queue URL.')
      }
      const pollUrl = new URL(result.response_url)
      const deadline = Date.now() + 110_000
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1600))
        const poll = await fetch(result.status_url, { headers: { Authorization: `Key ${falKey}` } })
        const state = await poll.json().catch(() => ({}))
        if (!poll.ok) throw new Error('fal status check failed')
        if (state.status === 'COMPLETED') {
          if (state.error) throw new Error('fal model returned a generation error')
          const output = await fetch(pollUrl, { headers: { Authorization: `Key ${falKey}` } })
          const completed = await output.json().catch(() => ({}))
          if (!output.ok) throw new Error('fal result fetch failed')
          imageUrl = completed.images?.[0]?.url
          break
        }
        if (state.status === 'FAILED') throw new Error('fal model returned a generation error')
      }
    }
    if (typeof imageUrl !== 'string') return json({ error: 'fal did not return a generated image in time. Please retry.' }, 504, origin)
    const parsedImageUrl = new URL(imageUrl)
    if (parsedImageUrl.protocol !== 'https:' || !['fal.media', 'v3.fal.media'].some(host => parsedImageUrl.hostname === host || parsedImageUrl.hostname.endsWith(`.${host}`))) {
      throw new Error('Unexpected fal image host.')
    }
    return json({ image_url: imageUrl, expires: true }, 200, origin)
  } catch (error) {
    console.error('fal image generation failed', error instanceof Error ? error.message : 'unknown error')
    return json({ error: 'fal image generation failed. Please retry.' }, 502, origin)
  }
})
