// Calls the Gemini API directly from the browser with the user's own key,
// so the key never touches any server we run.
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Flash models are first because they work on the free tier; the most
// advanced models usually need a billing-enabled key.
export const MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', note: 'Free tier · recommended' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', note: 'Free tier · fastest' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon', note: 'Latest · paid key' },
]

export class GeminiError extends Error {
  constructor(message, { status, retryAfter } = {}) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

const LENGTHS = {
  short: 'Short: 40-80 words. Punchy, 3-5 short lines.',
  medium: 'Medium: 120-180 words. A clear hook, a story or insight, and a takeaway.',
  long: 'Long: 220-320 words. A narrative with structure, white space, and a strong close.',
}

const responseSchema = {
  type: 'OBJECT',
  properties: {
    posts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          angle: { type: 'STRING', description: 'A 2-4 word label for the creative angle of this post' },
          hook: { type: 'STRING', description: 'The opening line of the post' },
          body: { type: 'STRING', description: 'The full post text, including the hook as the first line' },
          hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['angle', 'hook', 'body', 'hashtags'],
      },
    },
  },
  required: ['posts'],
}

function buildPrompt({ topic, tone, length, profession, extras }) {
  return `You are a world-class LinkedIn ghostwriter who writes posts that get saved, shared and commented on.

Write exactly 3 distinct LinkedIn post options.

Author profession: ${profession || 'Professional'}
Topic: ${topic}
Tone: ${tone}
Length: ${LENGTHS[length] || LENGTHS.medium}
${extras ? `Extra instructions: ${extras}` : ''}

Rules:
- Each option must use a clearly different angle (e.g. personal story, contrarian take, practical framework, data-driven insight, lessons learned).
- Start with a scroll-stopping hook line. No "I'm excited to announce" clichés.
- Write in first person from the perspective of the author's profession, with credible, specific detail.
- Use short paragraphs and line breaks for readability. Emojis only if they fit the tone, and sparingly.
- End with a question or call to action that invites comments.
- Do NOT put hashtags inside "body"; return 3-5 relevant hashtags (without the # symbol) in "hashtags".
- Plain text only, no markdown formatting like ** or #.`
}

function retryDelaySeconds(error) {
  const info = error?.details?.find((d) => d['@type']?.includes('RetryInfo'))
  const secs = parseFloat(info?.retryDelay)
  return Number.isFinite(secs) ? Math.ceil(secs) : undefined
}

async function callModel({ apiKey, model, input }) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || `Request failed with status ${res.status}`
    if (res.status === 400 && /api key/i.test(msg)) throw new GeminiError('That API key was rejected. Double-check it in Google AI Studio.', { status: 400 })
    if (res.status === 404) throw new GeminiError(`Model "${model}" isn't available for this key.`, { status: 404 })
    throw new GeminiError(msg, { status: res.status, retryAfter: retryDelaySeconds(data?.error) })
  }

  const text = data?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('')
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason
    throw new GeminiError(reason ? `Gemini returned no content (${reason}).` : 'Gemini returned an empty response.')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new GeminiError('Could not parse the model response. Please try again.')
  }
  const posts = (parsed.posts || []).slice(0, 3).map((p) => ({
    ...p,
    hashtags: (p.hashtags || []).map((h) => h.replace(/^#/, '').replace(/\s+/g, '')),
  }))
  if (!posts.length) throw new GeminiError('No posts came back. Please try again.')
  return posts
}

// Tries the chosen model first, then falls back to the other models when
// Google reports a quota/rate limit (429), overload (503) or missing model (404).
export async function generatePosts({ apiKey, model, onFallback, ...input }) {
  const chain = [model, ...MODELS.map((m) => m.id).filter((id) => id !== model && id !== 'gemini-4-argon')]
  let lastError
  for (const [i, id] of chain.entries()) {
    try {
      if (i > 0) onFallback?.(id)
      return { posts: await callModel({ apiKey, model: id, input }), model: id }
    } catch (err) {
      lastError = err
      if (![404, 429, 503].includes(err.status)) throw err
    }
  }
  if (lastError?.status === 429) {
    const wait = lastError.retryAfter ? ` Try again in about ${lastError.retryAfter}s.` : ' Wait a minute and try again.'
    throw new GeminiError(
      `Rate limit reached on every model for this key.${wait} Free keys have per-minute and per-day limits; enabling billing in Google AI Studio raises them. Google said: "${lastError.message}"`,
      lastError,
    )
  }
  throw lastError
}
