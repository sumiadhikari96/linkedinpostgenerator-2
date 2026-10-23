// Calls the Gemini API directly from the browser with the user's own key,
// so the key never touches any server we run.
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const MODELS = [
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon', note: 'Latest · best quality' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', note: 'Fast · great value' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', note: 'Fastest · cheapest' },
]

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

export async function generatePosts({ apiKey, model, ...input }) {
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
    if (res.status === 400 && /api key/i.test(msg)) throw new Error('That API key was rejected. Double-check it in Google AI Studio.')
    if (res.status === 404) throw new Error(`Model "${model}" isn't available for this key. Try another model from the list.`)
    if (res.status === 429) throw new Error('Rate limit or quota reached. Wait a moment or switch to a Flash model.')
    throw new Error(msg)
  }

  const text = data?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('')
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason
    throw new Error(reason ? `Gemini returned no content (${reason}).` : 'Gemini returned an empty response.')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Could not parse the model response. Please try again.')
  }
  const posts = (parsed.posts || []).slice(0, 3).map((p) => ({
    ...p,
    hashtags: (p.hashtags || []).map((h) => h.replace(/^#/, '').replace(/\s+/g, '')),
  }))
  if (!posts.length) throw new Error('No posts came back. Please try again.')
  return posts
}
