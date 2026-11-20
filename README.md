<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6b0ba203-b6d0-4e85-a40f-a03499569bd4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` or `DEEPSEEK_API_KEY` in the Settings page, or copy [.env.local.example](.env.local.example) to `.env.local` and set one or both keys there.
3. Run the app:
   `npm run dev`

4. Choose Google AI Studio (Gemini) or DeepSeek under Settings.

The local Vite server proxies AI requests so provider keys are not embedded in the browser bundle. Gemini grounding sources are available only when Gemini is selected. Provider quotas and pricing depend on each provider's current terms. The Vite proxy is for local development; public deployments need a separately secured server-side API.
