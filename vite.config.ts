import path from 'path';
import { GoogleGenAI } from '@google/genai';
import type { GenerateContentParameters } from '@google/genai';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';

type AIProvider = 'gemini' | 'deepseek';

class ProxyError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

const safeModels = new Set(['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3-pro-preview']);

const sendJson = (response: ServerResponse, statusCode: number, body: unknown) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getText).filter(Boolean).join('\n');
  if (!isRecord(value)) return '';
  if (typeof value.text === 'string') return value.text;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.parts)) return getText(value.parts);
  return '';
};

/**
 * Converts a Gemini response schema into a compact JSON skeleton so DeepSeek
 * (whose OpenAI-compatible API does not enforce response schemas) returns the
 * exact same field names the frontend expects.
 */
const describeSchema = (schema: unknown, depth = 0): string => {
  if (!isRecord(schema) || depth > 8) return '';
  const schemaType = typeof schema.type === 'string' ? schema.type.toUpperCase() : '';
  const properties = isRecord(schema.properties) ? schema.properties : undefined;

  if (properties) {
    const fields = Object.entries(properties).map(([key, value]) => {
      const child = describeSchema(value, depth + 1);
      return `"${key}": ${child || 'null'}`;
    });
    return `{ ${fields.join(', ')} }`;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map(option => JSON.stringify(option)).join(' | ');
  }

  if (isRecord(schema.items)) {
    const child = describeSchema(schema.items, depth + 1);
    return `[ ${child || 'null'} ]`;
  }

  switch (schemaType) {
    case 'STRING':
      return '"string"';
    case 'NUMBER':
    case 'INTEGER':
      return '0';
    case 'BOOLEAN':
      return 'true';
    case 'ARRAY':
      return '[ ]';
    case 'OBJECT':
      return '{ }';
    default:
      return '';
  }
};

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > 1024 * 1024) {
      throw new ProxyError('Request body is too large.', 413);
    }
    chunks.push(data);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ProxyError('Request body must be valid JSON.', 400);
  }
};

const localAIProxy = (
  geminiKey: string | undefined,
  deepseekKey: string | undefined,
  deepseekModel: string
) => {
  let geminiClient: GoogleGenAI | undefined;
  let activeGeminiKey = geminiKey;
  let activeDeepseekKey = deepseekKey;

  const assertLocalRequest = (request: IncomingMessage) => {
    const host = request.headers.host?.split(':')[0].toLowerCase();
    const origin = request.headers.origin ? new URL(request.headers.origin).hostname.toLowerCase() : undefined;
    const localHosts = new Set(['localhost', '127.0.0.1']);
    if ((host && !localHosts.has(host)) || (origin && !localHosts.has(origin))) {
      throw new ProxyError('This local AI endpoint only accepts localhost requests.', 403);
    }
  };

  return {
    name: 'local-ai-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (pathname === '/api/ai/status') {
          if (request.method !== 'GET') {
            sendJson(response, 405, { error: 'Method not allowed.' });
            return;
          }

          sendJson(response, 200, {
            gemini: Boolean(activeGeminiKey),
            deepseek: Boolean(activeDeepseekKey)
          });
          return;
        }

        if (pathname === '/api/ai/keys') {
          if (request.method !== 'PUT' && request.method !== 'DELETE') {
            sendJson(response, 405, { error: 'Method not allowed.' });
            return;
          }

          void (async () => {
            assertLocalRequest(request);
            const rawBody = await readJson(request);
            if (!isRecord(rawBody) || (rawBody.provider !== 'gemini' && rawBody.provider !== 'deepseek')) {
              throw new ProxyError('Choose Gemini or DeepSeek.', 400);
            }

            if (request.method === 'PUT') {
              if (typeof rawBody.key !== 'string' || !rawBody.key.trim() || rawBody.key.length > 8192) {
                throw new ProxyError('Enter a valid API key.', 400);
              }
              if (rawBody.provider === 'gemini') {
                activeGeminiKey = rawBody.key.trim();
                geminiClient = undefined;
              } else {
                activeDeepseekKey = rawBody.key.trim();
              }
            } else if (rawBody.provider === 'gemini') {
              activeGeminiKey = undefined;
              geminiClient = undefined;
            } else {
              activeDeepseekKey = undefined;
            }

            sendJson(response, 200, {
              gemini: Boolean(activeGeminiKey),
              deepseek: Boolean(activeDeepseekKey)
            });
          })().catch((error: unknown) => {
            const statusCode = error instanceof ProxyError ? error.statusCode : 400;
            const message = error instanceof Error ? error.message : 'Could not update provider key.';
            sendJson(response, statusCode, { error: message });
          });
          return;
        }

        if (pathname !== '/api/ai/generate') {
          next();
          return;
        }
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        void (async () => {
          assertLocalRequest(request);

          const rawBody = await readJson(request);
          if (!isRecord(rawBody)) {
            throw new ProxyError('Request body must be a JSON object.', 400);
          }

          const provider = rawBody.provider;
          const model = rawBody.model;
          if (provider !== 'gemini' && provider !== 'deepseek') {
            throw new ProxyError('Choose Gemini or DeepSeek in Settings.', 400);
          }
          // Model allowlist is only meaningful for Gemini. The DeepSeek path always
          // maps to its own model, so a Gemini model name must never block it with a 400.
          if (provider === 'gemini' && (typeof model !== 'string' || !safeModels.has(model))) {
            throw new ProxyError('This model is unavailable for this local AI integration.', 400);
          }
          if (rawBody.contents === undefined) {
            throw new ProxyError('Request contents are required.', 400);
          }

          const params = {
            model: typeof model === 'string' ? model : '',
            contents: rawBody.contents as GenerateContentParameters['contents'],
            ...(isRecord(rawBody.config)
              ? { config: rawBody.config as GenerateContentParameters['config'] }
              : {})
          } satisfies GenerateContentParameters;

          if (provider === 'gemini') {
            if (!activeGeminiKey) {
              throw new ProxyError('Add a Google AI Studio key in Settings.', 503);
            }

            geminiClient ??= new GoogleGenAI({ apiKey: activeGeminiKey });
            const result = await geminiClient.models.generateContent(params);
            sendJson(response, 200, {
              text: result.text || '',
              candidates: result.candidates || []
            });
            return;
          }

          if (!activeDeepseekKey) {
            throw new ProxyError('Add a DeepSeek key in Settings.', 503);
          }

          const config = isRecord(params.config) ? params.config : {};
          const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
          const systemInstruction = getText(config.systemInstruction);
          if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
          }

          const contentItems = Array.isArray(params.contents) ? params.contents : [params.contents];
          for (const item of contentItems) {
            if (isRecord(item) && typeof item.role === 'string') {
              const content = getText(item.parts);
              if (content) {
                messages.push({
                  role: item.role === 'model' ? 'assistant' : 'user',
                  content
                });
              }
            } else {
              const content = getText(item);
              if (content) messages.push({ role: 'user', content });
            }
          }

          if (messages.length === 0) {
            throw new ProxyError('Request contents are empty.', 400);
          }

          // DeepSeek does not enforce Gemini's responseSchema, so inject the exact
          // JSON structure into the prompt. Without this, DeepSeek invents its own
          // keys (e.g. "payloads" instead of "variants") and the UI renders nothing.
          const responseSchema = config.responseSchema;
          if (responseSchema) {
            const skeleton = describeSchema(responseSchema);
            if (skeleton) {
              const schemaInstruction = [
                'Return a single valid JSON object only — no markdown fences and no commentary.',
                'It must use exactly these keys and follow this structure:',
                skeleton
              ].join('\n');
              const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
              if (lastUserMessage) {
                lastUserMessage.content = `${lastUserMessage.content}\n\n${schemaInstruction}`;
              } else {
                messages.push({ role: 'user', content: schemaInstruction });
              }
            }
          }

          // DeepSeek cannot perform live web searches through this integration. When a
          // prompt asks for "Google Search" we must tell it to rely on trained knowledge;
          // otherwise it fabricates search results, dates and CVEs — the root cause of
          // the "illogical" answers.
          const webSearchNote = [
            'IMPORTANT: This environment has NO live web access.',
            'The user prompt may ask you to use Google Search — you cannot.',
            'Never fabricate search results, URLs, CVE IDs, dates or "latest" events.',
            'Base every statement on your trained knowledge and clearly say when a fact may be outdated.'
          ].join(' ');
          const usesWebSearch = Array.isArray(config.tools) && config.tools.some(
            tool => isRecord(tool) && 'googleSearch' in tool
          );
          if (usesWebSearch) {
            const firstMessage = messages[0];
            if (firstMessage && firstMessage.role === 'system') {
              firstMessage.content = `${firstMessage.content}\n\n${webSearchNote}`;
            } else {
              messages.unshift({ role: 'system', content: webSearchNote });
            }
          }

          // Map Gemini's thinking configuration onto DeepSeek's reasoning controls.
          // Thinking is on by default at "high" effort, but we set it explicitly so
          // every feature reasons as deeply as the original Gemini prompts intended.
          const thinkingConfig = isRecord(config.thinkingConfig) ? config.thinkingConfig : {};
          const rawThinkingLevel = typeof thinkingConfig.thinkingLevel === 'string'
            ? thinkingConfig.thinkingLevel.toLowerCase()
            : undefined;
          const thinkingBudget = typeof thinkingConfig.thinkingBudget === 'number'
            ? thinkingConfig.thinkingBudget
            : undefined;
          const reasoningEffort = rawThinkingLevel === 'low'
            || (thinkingBudget !== undefined && thinkingBudget > 0 && thinkingBudget < 4096)
            ? 'low'
            : 'high';
          const wantsJson = config.responseMimeType === 'application/json' || Boolean(responseSchema);

          const requestDeepseek = (withJsonMode: boolean) =>
            fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${activeDeepseekKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: deepseekModel,
                messages,
                thinking: { type: 'enabled' },
                reasoning_effort: reasoningEffort,
                ...(withJsonMode ? { response_format: { type: 'json_object' } } : {})
              }),
              signal: AbortSignal.timeout(90000)
            });

          type DeepseekResult = {
            choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
            error?: { message?: string };
          };

          let deepseekResponse = await requestDeepseek(wantsJson);
          let result = await deepseekResponse.json() as DeepseekResult;

          // Some thinking-mode deployments reject response_format=json_object. If that
          // happens, retry without JSON mode — the injected schema skeleton still
          // guarantees the exact field names the UI expects.
          if (!deepseekResponse.ok && wantsJson && deepseekResponse.status === 400) {
            const errorMessage = (result.error?.message || '').toLowerCase();
            if (errorMessage.includes('response_format') || errorMessage.includes('json') || errorMessage.includes('thinking')) {
              deepseekResponse = await requestDeepseek(false);
              result = await deepseekResponse.json() as DeepseekResult;
            }
          }

          if (!deepseekResponse.ok) {
            throw new ProxyError(
              result.error?.message || `DeepSeek request failed (${deepseekResponse.status}).`,
              502
            );
          }

          // Thinking mode returns chain-of-thought in `reasoning_content` and the final
          // answer in `content`. Prefer `content`, but fall back to the reasoning text
          // so the user never sees an "empty response".
          const text = getText(result.choices?.[0]?.message?.content)
            || getText(result.choices?.[0]?.message?.reasoning_content);
          if (!text) {
            throw new ProxyError('DeepSeek returned an empty response.', 502);
          }
          sendJson(response, 200, { text, candidates: [] });
        })().catch((error: unknown) => {
          const statusCode = error instanceof ProxyError ? error.statusCode : 502;
          const message = error instanceof Error ? error.message : 'AI request failed.';
          sendJson(response, statusCode, { error: message });
        });
      });
    }
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
    || env.GEMINI_API_KEY?.trim()
    || process.env.API_KEY?.trim()
    || env.API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim() || env.DEEPSEEK_API_KEY?.trim();
  const deepseekModel = process.env.DEEPSEEK_MODEL?.trim() || env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-pro';

  return {
    server: {
      port: 8081,
      host: '127.0.0.1',
      strictPort: true
    },
    plugins: [react(), localAIProxy(geminiKey, deepseekKey, deepseekModel)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
