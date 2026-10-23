# PostCraft AI — LinkedIn Post Generator

Enter a topic, tone, length and your profession, and get **3 distinct LinkedIn post options** from Google's latest Gemini models.

- 🔑 **Bring your own key**: you enter your Gemini API key in the UI. It goes straight from your browser to Google and never passes through a backend. You can choose to remember it on your device.
- 🧠 **Latest models**: defaults to `gemini-4-argon`, with `gemini-3.8-flash` and `gemini-3.5-flash-lite` as one-click options. You can also type any model id under *Advanced options*.
- ✨ The UI has an animated aurora background, glass cards, gradient tone chips, a sliding length control, loading skeletons, and post previews styled like LinkedIn.
- 📋 Copy a post with one click, or **Post on LinkedIn**, which copies the post and opens the LinkedIn composer.

Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project** and import the repo. Vercel detects Vite automatically (`npm run build`, output `dist`).
3. Click **Deploy**. You don't need any environment variables, because each user enters their own key in the app.

Or use the CLI: `npx vercel --prod`.

## Stack

Vite + React 19, plain CSS, and the Gemini REST `generateContent` endpoint with structured JSON output.
