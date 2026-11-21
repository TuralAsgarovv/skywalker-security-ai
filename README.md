# Skywalker Security AI

An AI-powered cybersecurity assistant built for **learning and defensive security work**. It brings several security-analysis modules into a single, clean interface — from HTTP security-header audits and OWASP Top 10 guidance to CVE intelligence, vulnerability explanations and an AI chat advisor — on top of a small serverless AI backend.

> **Educational use only.** Please read the [Disclaimer](#-disclaimer) before using this project.(For testing tool https://skywalker-security-ai.vercel.app/)

---

## Purpose

Cybersecurity knowledge is usually scattered across dozens of tabs, blogs and docs. Skywalker Security AI was built to make the core ideas easier to explore in one place. The goal is **understanding and awareness** — helping students, developers and junior security engineers reason about security — not to attack anything.

With this tool you can:

- audit the HTTP security headers of a website,
- study the OWASP Top 10 and modern AppSec practices,
- follow recent CVE intelligence,
- learn how a specific vulnerability works and how to defend against it,
- practise security reasoning with an AI assistant.

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Overview with a security radar, domain analysis and a threat-intel queue. |
| **Protocol & Policy Auditor** | Paste raw HTTP response headers and get a security/privacy score with concrete recommendations. |
| **OWASP Top 10 Reference** | Structured guidance on the most critical web-app risks and their mitigations. |
| **Security Knowledge Engine** | Ask about a vulnerability class (e.g. SQL injection, XSS) and get a clear explanation of how it works and how to defend against it. |
| **CVE Intelligence** | AI-assisted overview of recent CVEs with severity filtering. |
| **Intel Explorer** | Deeper analysis of a specific CVE or a security article. |
| **Bounty Hunter** | A guided workspace: recon → lab notes → report → checklist, for authorized bug-bounty practice. |
| **Exploit Architect** | A learning sandbox for reasoning about payload structure and mitigation in authorized, lab-only contexts. |
| **Cyber Arsenal** | Concept-level explanations of security tooling for study purposes. |
| **AI Chat** | Free-form security Q&A with the Skywalker AI assistant. |
| **Settings** | Choose the AI provider (Gemini or DeepSeek) and see whether a key is configured. |

The interface supports **English and Azerbaijani**.

## Tech stack

- **React 19 + TypeScript** (Vite)
- **Tailwind CSS** (loaded via CDN in `index.html`)
- **Recharts** for dashboard charts
- **Vercel Serverless Functions** (`/api/ai/*`) as the AI backend — provider keys come from the deployment environment variables **or** from the visitor's browser (Settings). No key is ever committed to the repository.
- AI providers: **Google Gemini** and **DeepSeek** (at least one is required)

## Run locally

**Prerequisites:** Node.js 18+ and an API key for at least one provider.

```bash
npm install
```

Create `.env.local` from the example and add a key:

```bash
cp .env.local.example .env.local
```

```env
# add one or both:
DEEPSEEK_API_KEY=your_deepseek_key
GEMINI_API_KEY=your_gemini_key

# optional
DEEPSEEK_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=58000
```

Start the dev server:

```bash
npm run dev
```

During local development the Vite server handles `/api/ai/*` itself (see `vite.config.ts`).

## Deploy to Vercel

The production AI backend lives in `api/ai/` as Vercel Serverless Functions, so the deployed site works without any extra server.

1. Import this repository into Vercel (the framework auto-detects **Vite**; `vercel.json` sets the build command and output directory).
2. *(Optional, recommended)* Add **Environment Variables** to the Vercel project: `DEEPSEEK_API_KEY` and/or `GEMINI_API_KEY` (optionally `DEEPSEEK_MODEL`, `AI_REQUEST_TIMEOUT_MS`).
3. Deploy — or redeploy after changing environment variables.

> **No environment variables? It still works.** Open **Settings** in the deployed app, paste your DeepSeek (or Gemini) key and press **Save key**. The key is stored only in that browser's `localStorage` and is attached to every `/api/ai/generate` request; a key entered there takes precedence over the deployment variables. Clearing site data / using another device means pasting it again. This is also how visitors of a public deployment can use their own key.
> Vercel's Hobby plan caps function execution at 60s (the DeepSeek request timeout defaults to 58s).

## Project structure

```
api/ai/       # serverless AI backend (generate / status / keys)
components/   # UI modules
services/     # AI client + prompt/schema helpers
App.tsx       # app shell, routing, i18n
vercel.json   # Vercel build + function config
```

## ⚠️ Disclaimer

This project is provided **for educational and research purposes only**.

- Use it **only** on systems you own or have **explicit written permission** to test.
- The authors do **not** condone or support unauthorized access, attacks or any illegal activity.
- You are solely responsible for how you use this software and for complying with all applicable laws and the terms of any AI provider you configure.
- This software is provided "as is", without warranty of any kind; use it at your own risk.
