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
  if (profileError || !Array.isArray(profile?.roles) || !profile.roles.some((role: string) => ['faculty', 'admin', 'inquisitor'].includes(role))) {
    return json({ error: 'fal generation is limited to signed-in faculty and editors.' }, 403, origin)
  }

  let body: { mode?: unknown; prompt?: unknown; style?: unknown; title?: unknown; author?: unknown; image_url?: unknown; request_id?: unknown }
  try { body = await request.json() } catch { return json({ error: 'Request body must be JSON.' }, 400, origin) }
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  if (contentLength > 8000) return json({ error: 'Request is too large.' }, 413, origin)
  const mode = body.mode === 'video' || body.mode === 'video-status' ? body.mode : 'image'
  const videoModel = 'fal-ai/kling-video/v3/standard/image-to-video'
  if (mode === 'video-status') {
    const requestId = typeof body.request_id === 'string' ? body.request_id : ''
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(requestId)) return json({ error: 'A valid fal video request ID is required.' }, 400, origin)
    try {
      const base = `https://queue.fal.run/${videoModel}/requests/${encodeURIComponent(requestId)}`
      const statusResponse = await fetch(`${base}/status`, { headers: { Authorization: `Key ${falKey}` } })
      const state = await statusResponse.json().catch(() => ({}))
      if (!statusResponse.ok) return json({ error: 'Could not check fal video progress.' }, 502, origin)
      if (state.status !== 'COMPLETED') return json({ status: state.status || 'IN_PROGRESS' }, 200, origin)
      if (state.error) return json({ status: 'FAILED' }, 200, origin)
      const outputResponse = await fetch(base, { headers: { Authorization: `Key ${falKey}` } })
      const output = await outputResponse.json().catch(() => ({}))
      if (!outputResponse.ok) return json({ error: 'fal completed the video but its result could not be retrieved.' }, 502, origin)
      const videoUrl = output.video?.url
      if (typeof videoUrl !== 'string') return json({ error: 'fal returned no video file.' }, 502, origin)
      const parsed = new URL(videoUrl)
      if (parsed.protocol !== 'https:' || !['fal.media', 'v3.fal.media', 'v3b.fal.media', 'storage.googleapis.com'].some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) throw new Error('Unexpected fal video host.')
      return json({ status: 'COMPLETED', video_url: videoUrl }, 200, origin)
    } catch (error) {
      console.error('fal video status check failed', error instanceof Error ? error.message : 'unknown error')
      return json({ error: 'fal video status check failed. Please retry.' }, 502, origin)
    }
  }
  if (mode === 'video') {
    const imageUrl = typeof body.image_url === 'string' ? body.image_url : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    let parsedImage: URL
    try { parsedImage = new URL(imageUrl) } catch { return json({ error: 'Generate a portrait image with fal first.' }, 400, origin) }
    if (parsedImage.protocol !== 'https:' || !['fal.media', 'v3.fal.media', 'v3b.fal.media'].some(host => parsedImage.hostname === host || parsedImage.hostname.endsWith(`.${host}`))) return json({ error: 'Video generation currently animates an image generated by fal.' }, 400, origin)
    if (prompt.length < 8 || prompt.length > 1400) return json({ error: 'Video direction must be between 8 and 1400 characters.' }, 400, origin)
    try {
      const queued = await fetch(`https://queue.fal.run/${videoModel}`, {
        method: 'POST',
        headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_image_url: imageUrl, prompt, duration: '5', generate_audio: false, enable_safety_checker: true }),
      })
      const result = await queued.json().catch(() => ({}))
      if (!queued.ok || typeof result.request_id !== 'string') {
        console.error('fal video request failed', queued.status)
        return json({ error: 'fal could not queue the video. Try again in a moment.' }, 502, origin)
      }
      return json({ request_id: result.request_id, status: 'IN_QUEUE' }, 202, origin)
    } catch (error) {
      console.error('fal video request failed', error instanceof Error ? error.message : 'unknown error')
      return json({ error: 'fal video generation could not be started.' }, 502, origin)
    }
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (prompt.length < 8 || prompt.length > 1000) return json({ error: 'Artwork direction must be between 8 and 1000 characters.' }, 400, origin)
  const styles: Record<string, string> = {
    explore: 'an original, art-directed visual language chosen to best serve the literary idea; it may be photorealistic, painterly, cinematic, documentary, archival, surreal, symbolic, or a thoughtful hybrid',
    cinematic: 'cinematic fine-art still, layered atmosphere, dramatic natural light, nuanced film color grading, carefully composed foreground and deep background',
    photoreal: 'photorealistic editorial photography, believable materials and light, fine photographic detail, natural lens depth, subtle grain and tactile surfaces',
    documentary: 'observational documentary photography, candid human scale, natural available light, lived-in details, honest textures, composed like a still from an art-house film',
    macro: 'intimate macro photography, extraordinary surface detail, shallow depth of field, luminous bokeh, tactile natural materials, composition that feels like a small world',
    painterly: 'expressive fine-art painting, visible confident brushwork, layered pigments, painterly depth, nuanced composition, rich material texture',
    impressionist: 'impressionist oil painting, luminous broken color, atmospheric brush strokes, shifting light, textured canvas, evocative rather than literal detail',
    collage: 'surreal mixed-media collage, layered photographic textures, torn paper, unexpected symbolic juxtapositions, depth and material richness',
    woodcut: 'expressive woodcut print, bold carved forms, tactile ink and paper fibers, complex hatching, sophisticated limited palette, strong dramatic composition',
    botanical: 'antique botanical field plate, precise naturalist detail, delicate watercolor and graphite, textured paper, carefully observed leaves and specimens, archival elegance',
    illustration: 'rich editorial illustration, sophisticated drawing, tactile print texture, nuanced color and shape, detailed environment, distinct artistic point of view',
    'dreamlike-3d': 'dreamlike sculptural 3D artwork, physically rich materials, atmospheric volumetric light, elegant impossible architecture, intricate surfaces, cinematic depth',
    symbolic: 'symbolic abstract art, complex organic forms, layered translucent shapes, refined visual metaphor, rich material detail and nuanced light',
  }
  const style = typeof body.style === 'string' && styles[body.style] ? body.style : 'explore'

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : ''
  const author = typeof body.author === 'string' ? body.author.trim().slice(0, 120) : ''
  const fullPrompt = [
    `Create a beautiful, original background image for a literary short-form video post. Art style: ${styles[style]}.`,
    'Portrait 9:16 composition with foreground, middle distance, and deep background; combine several meaningful visual details into a coherent scene with a distinct point of view. Prefer complex, specific imagery over simple line drawings or generic gradients.',
    'Use expressive, high-quality material detail and atmospheric light. Avoid sparse vector line art, flat iconography, generic gradients, and stock-template composition.',
    'Compose for animated text overlays: keep the central-left reading area legible but visually alive, with contrast and detail distributed across the frame. Use depth, texture, atmosphere, and a clear focal idea rather than leaving a large empty text void.',
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
    if (parsedImageUrl.protocol !== 'https:' || !['fal.media', 'v3.fal.media', 'v3b.fal.media'].some(host => parsedImageUrl.hostname === host || parsedImageUrl.hostname.endsWith(`.${host}`))) {
      throw new Error('Unexpected fal image host.')
    }
    return json({ image_url: imageUrl, expires: true }, 200, origin)
  } catch (error) {
    console.error('fal image generation failed', error instanceof Error ? error.message : 'unknown error')
    return json({ error: 'fal image generation failed. Please retry.' }, 502, origin)
  }
})
