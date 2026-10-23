import { useEffect, useRef, useState } from 'react'
import { MODELS, generatePosts } from './gemini.js'

const TONES = [
  { id: 'Professional', emoji: '💼' },
  { id: 'Inspirational', emoji: '🚀' },
  { id: 'Storytelling', emoji: '📖' },
  { id: 'Witty', emoji: '😄' },
  { id: 'Bold & Contrarian', emoji: '🔥' },
  { id: 'Educational', emoji: '🎓' },
  { id: 'Empathetic', emoji: '💛' },
]

const LENGTHS = [
  { id: 'short', label: 'Short', hint: '~60 words' },
  { id: 'medium', label: 'Medium', hint: '~150 words' },
  { id: 'long', label: 'Long', hint: '~270 words' },
]

const PROFESSIONS = ['Software Engineer', 'Product Manager', 'Founder', 'Marketer', 'Designer', 'Recruiter', 'Data Scientist', 'Sales Leader']

const TOPIC_IDEAS = [
  'Lessons from my first year as a manager',
  'Why I stopped chasing productivity hacks',
  'How AI is changing my daily workflow',
  'The best career advice I ever ignored',
  'What a failed project taught me',
]

const storage = {
  get: (k) => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  set: (k, v) => {
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* storage unavailable */ }
  },
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => storage.get('gemini_api_key') || '')
  const [rememberKey, setRememberKey] = useState(() => !!storage.get('gemini_api_key'))
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(() => storage.get('gemini_model_v2') || MODELS[0].id)

  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('medium')
  const [profession, setProfession] = useState('')
  const [extras, setExtras] = useState('')

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [usedModel, setUsedModel] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const resultsRef = useRef(null)

  useEffect(() => storage.set('gemini_api_key', rememberKey && apiKey ? apiKey : null), [apiKey, rememberKey])
  useEffect(() => storage.set('gemini_model_v2', model), [model])

  const canGenerate = apiKey.trim() && topic.trim() && !loading

  async function handleGenerate(e) {
    e?.preventDefault()
    if (!apiKey.trim()) return setError('Add your Gemini API key first — it stays in your browser.')
    if (!topic.trim()) return setError('Tell me what the post is about.')
    setError('')
    setLoading(true)
    setPosts([])
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    try {
      const result = await generatePosts({
        apiKey: apiKey.trim(),
        model: model.trim(),
        topic, tone, length, profession, extras,
        onFallback: (id) => setStatus(`Busy or rate limited, trying ${labelFor(id)}…`),
      })
      setPosts(result.posts)
      setUsedModel(result.model)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="grid-overlay" aria-hidden="true" />

      <header className="hero">
        <div className="badge">
          <span className="pulse" /> Powered by Google Gemini
        </div>
        <h1>
          Write LinkedIn posts that <span className="gradient-text">stop the scroll</span>
        </h1>
        <p className="sub">Pick a topic, tone and length. Get three ready-to-post options in seconds.</p>
      </header>

      <main className="layout">
        <form className="card glass form" onSubmit={handleGenerate}>
          <section className="key-box">
            <div className="label-row">
              <label htmlFor="apikey">🔑 Gemini API key</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="link">
                Get a free key ↗
              </a>
            </div>
            <div className="input-wrap">
              <input
                id="apikey"
                type={showKey ? 'text' : 'password'}
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <button type="button" className="ghost-btn" onClick={() => setShowKey((s) => !s)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="key-meta">
              <label className="check">
                <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
                <span>Remember on this device</span>
              </label>
              <span className="muted">Sent only to Google, never to us.</span>
            </div>
          </section>

          <div className="field">
            <label htmlFor="topic">✍️ Topic</label>
            <textarea
              id="topic"
              rows={3}
              placeholder="e.g. What I learned shipping a product with a 3-person team"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={600}
            />
            <div className="chips small">
              {TOPIC_IDEAS.map((t) => (
                <button type="button" key={t} className="chip" onClick={() => setTopic(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="profession">👤 Your profession</label>
            <input
              id="profession"
              list="professions"
              placeholder="e.g. Product Designer at a fintech startup"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
            <datalist id="professions">
              {PROFESSIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div className="field">
            <label>🎭 Tone</label>
            <div className="chips">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`chip tone ${tone === t.id ? 'active' : ''}`}
                  onClick={() => setTone(t.id)}
                  aria-pressed={tone === t.id}
                >
                  <span>{t.emoji}</span> {t.id}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>📏 Length</label>
            <div className="segmented" style={{ '--idx': LENGTHS.findIndex((l) => l.id === length) }}>
              <span className="seg-thumb" />
              {LENGTHS.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className={length === l.id ? 'active' : ''}
                  onClick={() => setLength(l.id)}
                  aria-pressed={length === l.id}
                >
                  <strong>{l.label}</strong>
                  <small>{l.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <details className="advanced">
            <summary>Advanced options</summary>
            <div className="field">
              <label htmlFor="model">🧠 Model</label>
              <div className="model-grid">
                {MODELS.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={`model-opt ${model === m.id ? 'active' : ''}`}
                    onClick={() => setModel(m.id)}
                  >
                    <strong>{m.label}</strong>
                    <small>{m.note}</small>
                  </button>
                ))}
              </div>
              <input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="or type any Gemini model id"
                spellCheck="false"
              />
            </div>
            <div className="field">
              <label htmlFor="extras">🧩 Extra instructions</label>
              <input
                id="extras"
                placeholder="e.g. Mention our product launch on Friday, no emojis"
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
              />
            </div>
          </details>

          {error && <div className="error">⚠️ {error}</div>}

          <button type="submit" className={`generate ${loading ? 'loading' : ''}`} disabled={!canGenerate}>
            <span className="shine" />
            {loading ? (
              <>
                <span className="spinner" /> {status || 'Crafting your posts…'}
              </>
            ) : (
              <>✨ Generate 3 posts</>
            )}
          </button>
        </form>

        <section className="results" ref={resultsRef}>
          {!loading && !posts.length && <EmptyState />}
          {loading && [0, 1, 2].map((i) => <Skeleton key={i} i={i} />)}
          {!loading && usedModel && posts.length > 0 && (
            <div className="used-model">
              Written by <strong>{labelFor(usedModel)}</strong>
              {usedModel !== model.trim() && <span> · switched automatically because {labelFor(model.trim())} hit a limit</span>}
            </div>
          )}
          {!loading &&
            posts.map((p, i) => (
              <PostCard key={i} post={p} index={i} profession={profession} onCopied={() => flash('Copied to clipboard 🎉')} />
            ))}
          {!loading && posts.length > 0 && (
            <button className="regen" onClick={handleGenerate}>
              🔄 Regenerate all
            </button>
          )}
        </section>
      </main>

      <footer className="footer">
        Built with Gemini · Your key stays in your browser
      </footer>

      <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
    </div>
  )
}

function labelFor(id) {
  return MODELS.find((m) => m.id === id)?.label || id
}

function EmptyState() {
  return (
    <div className="card glass empty">
      <div className="orb">
        <span>✦</span>
      </div>
      <h3>Your posts will appear here</h3>
      <p>Three unique angles, tailored to your voice, ready to copy or share straight to LinkedIn.</p>
      <ul>
        <li>⚡ Scroll-stopping hooks</li>
        <li>🎯 Distinct creative angles</li>
        <li>#️⃣ Relevant hashtags</li>
      </ul>
    </div>
  )
}

function Skeleton({ i }) {
  return (
    <div className="card glass post skeleton" style={{ animationDelay: `${i * 120}ms` }}>
      <div className="post-head">
        <div className="avatar sk" />
        <div style={{ flex: 1 }}>
          <div className="sk line" style={{ width: '40%' }} />
          <div className="sk line" style={{ width: '25%' }} />
        </div>
      </div>
      {[92, 85, 97, 70, 88, 55].map((w, j) => (
        <div key={j} className="sk line" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function PostCard({ post, index, profession, onCopied }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState(false)
  const full = `${post.body.trim()}\n\n${post.hashtags.map((h) => `#${h}`).join(' ')}`.trim()
  const isLong = post.body.length > 320
  const shown = !isLong || expanded ? post.body : post.body.slice(0, 300).trimEnd() + '…'
  const words = post.body.trim().split(/\s+/).length

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = full
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    onCopied()
    setTimeout(() => setCopied(false), 1800)
  }

  function share() {
    copy()
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(full)}`, '_blank', 'noopener')
  }

  return (
    <article className="card glass post reveal" style={{ animationDelay: `${index * 140}ms` }}>
      <div className="post-top">
        <span className="option">Option {index + 1}</span>
        <span className="angle">{post.angle}</span>
      </div>
      <div className="post-head">
        <div className="avatar">You</div>
        <div>
          <div className="name">You</div>
          <div className="role">{profession || 'Professional'} · now · 🌐</div>
        </div>
      </div>
      <p className="post-body">
        {shown}
        {isLong && (
          <button className="more" onClick={() => setExpanded((e) => !e)}>
            {expanded ? ' show less' : ' …see more'}
          </button>
        )}
      </p>
      <div className="tags">
        {post.hashtags.map((h) => <span key={h}>#{h}</span>)}
      </div>
      <div className="stats">
        <span>{words} words</span>
        <span>{full.length} / 3000 chars</span>
      </div>
      <div className="actions">
        <button className={`act ${liked ? 'liked' : ''}`} onClick={() => setLiked((l) => !l)}>
          {liked ? '💙' : '👍'} {liked ? 'Liked' : 'Like'}
        </button>
        <button className={`act primary ${copied ? 'done' : ''}`} onClick={copy}>
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
        <button className="act" onClick={share}>
          🚀 Post on LinkedIn
        </button>
      </div>
    </article>
  )
}
