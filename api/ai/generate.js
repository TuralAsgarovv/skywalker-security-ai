import { GoogleGenAI } from '@google/genai';

class ProxyError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const safeModels = new Set(['gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3-pro-preview']);
const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 58000;

const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const isRecord = (value) => typeof value === 'object' && value !== null;

const getText = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getText).filter(Boolean).join('\n');
  if (!isRecord(value)) return '';
  if (typeof value.text === 'string') return value.text;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.parts)) return getText(value.parts);
  return '';
};

const describeSchema = (schema, depth = 0) => {
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
    case 'STRING': return '"string"';
    case 'NUMBER':
    case 'INTEGER': return '0';
    case 'BOOLEAN': return 'true';
    case 'ARRAY': return '[ ]';
    case 'OBJECT': return '{ }';
    default: return '';
  }
};

const readJson = async (req) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { throw new ProxyError('Request body must be valid JSON.', 400); }
    }
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > 1024 * 1024) throw new ProxyError('Request body is too large.', 413);
    chunks.push(data);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ProxyError('Request body must be valid JSON.', 400);
  }
};

const getEnvKeys = () => ({
  gemini: process.env.GEMINI_API_KEY?.trim() || process.env.API_KEY?.trim() || undefined,
  deepseek: process.env.DEEPSEEK_API_KEY?.trim() || undefined,
  deepseekModel: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-pro'
});

// A serverless function cannot persist a key submitted from the browser, so the
// client keeps it in localStorage and sends it with each request. That key takes
// precedence over the deployment environment variables.
const getClientKey = (rawBody) => {
  const candidate = typeof rawBody.apiKey === 'string'
    ? rawBody.apiKey.trim()
    : typeof rawBody.key === 'string'
      ? rawBody.key.trim()
      : '';
  if (!candidate) return '';
  if (candidate.length > 8192) throw new ProxyError('The API key in the request is too long.', 400);
  return candidate;
};

let geminiClient;
let geminiClientKey;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const rawBody = await readJson(req);
    if (!isRecord(rawBody)) throw new ProxyError('Request body must be a JSON object.', 400);

    const provider = rawBody.provider;
    const model = rawBody.model;
    if (provider !== 'gemini' && provider !== 'deepseek') {
      throw new ProxyError('Choose Gemini or DeepSeek in Settings.', 400);
    }
    if (provider === 'gemini' && (typeof model !== 'string' || !safeModels.has(model))) {
      throw new ProxyError('This model is unavailable for this AI integration.', 400);
    }
    if (rawBody.contents === undefined) {
      throw new ProxyError('Request contents are required.', 400);
    }

    const params = {
      model: typeof model === 'string' ? model : '',
      contents: rawBody.contents,
      ...(isRecord(rawBody.config) ? { config: rawBody.config } : {})
    };

    const clientKey = getClientKey(rawBody);
    const envKeys = getEnvKeys();
    const gemini = clientKey || envKeys.gemini;
    const deepseek = clientKey || envKeys.deepseek;
    const deepseekModel = envKeys.deepseekModel;

    if (provider === 'gemini') {
      if (!gemini) {
        throw new ProxyError(
          'Add a Google AI Studio key — click the key icon in the header (or open Settings) to paste it, or set GEMINI_API_KEY in the deployment environment.',
          503
        );
      }
      if (!geminiClient || geminiClientKey !== gemini) {
        geminiClient = new GoogleGenAI({ apiKey: gemini });
        geminiClientKey = gemini;
      }
      const result = await geminiClient.models.generateContent(params);
      sendJson(res, 200, { text: result.text || '', candidates: result.candidates || [] });
      return;
    }

    if (!deepseek) {
      throw new ProxyError(
        'Add a DeepSeek key — click the key icon in the header (or open Settings) to paste it, or set DEEPSEEK_API_KEY in the deployment environment.',
        503
      );
    }

    const config = isRecord(params.config) ? params.config : {};
    const messages = [];
    const systemInstruction = getText(config.systemInstruction);
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

    const contentItems = Array.isArray(params.contents) ? params.contents : [params.contents];
    for (const item of contentItems) {
      if (isRecord(item) && typeof item.role === 'string') {
        const content = getText(item.parts);
        if (content) messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content });
      } else {
        const content = getText(item);
        if (content) messages.push({ role: 'user', content });
      }
    }

    if (messages.length === 0) throw new ProxyError('Request contents are empty.', 400);

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
    // otherwise it fabricates search results, dates and CVEs.
    const webSearchNote = [
      'IMPORTANT: This environment has NO live web access.',
      'The user prompt may ask you to use Google Search — you cannot.',
      'Never fabricate search results, URLs, CVE IDs, dates or "latest" events.',
      'Base every statement on your trained knowledge and clearly say when a fact may be outdated.'
    ].join(' ');
    const usesWebSearch = Array.isArray(config.tools) && config.tools.some(tool => isRecord(tool) && 'googleSearch' in tool);
    if (usesWebSearch) {
      const firstMessage = messages[0];
      if (firstMessage && firstMessage.role === 'system') {
        firstMessage.content = `${firstMessage.content}\n\n${webSearchNote}`;
      } else {
        messages.unshift({ role: 'system', content: webSearchNote });
      }
    }

    // Map Gemini's thinking configuration onto DeepSeek's reasoning controls.
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

    const requestDeepseek = (withJsonMode, modelName = deepseekModel) =>
      fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deepseek}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          thinking: { type: 'enabled' },
          reasoning_effort: reasoningEffort,
          ...(withJsonMode ? { response_format: { type: 'json_object' } } : {})
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

    let deepseekResponse = await requestDeepseek(wantsJson);
    let result = await deepseekResponse.json();

    // Some thinking-mode deployments reject response_format=json_object. If that
    // happens, retry without JSON mode — the injected schema skeleton still
    // guarantees the exact field names the UI expects.
    if (!deepseekResponse.ok && wantsJson && deepseekResponse.status === 400) {
      const errorMessage = (result.error?.message || '').toLowerCase();
      if (errorMessage.includes('response_format') || errorMessage.includes('json') || errorMessage.includes('thinking')) {
        deepseekResponse = await requestDeepseek(false);
        result = await deepseekResponse.json();
      }
    }

    // A renamed/retired model id (e.g. a stale DEEPSEEK_MODEL value) must not look
    // like an invalid API key. Fall back once to DeepSeek's stable chat model.
    const modelErrorMessage = String(result?.error?.message || '').toLowerCase();
    const isModelError = !deepseekResponse.ok
      && (deepseekResponse.status === 400 || deepseekResponse.status === 404)
      && ['model not exist', 'model does not exist', 'model not found', 'invalid model', 'unknown model', 'unsupported model']
        .some(phrase => modelErrorMessage.includes(phrase));
    if (isModelError && deepseekModel !== 'deepseek-chat') {
      deepseekResponse = await requestDeepseek(wantsJson, 'deepseek-chat');
      result = await deepseekResponse.json();
    }

    if (!deepseekResponse.ok) {
      const keyErrorMessage = String(result?.error?.message || '');
      const isAuthError = deepseekResponse.status === 401 || deepseekResponse.status === 403;
      throw new ProxyError(
        isAuthError
          ? `DeepSeek rejected the API key. Click the key icon in the header (or open Settings) and paste a valid DeepSeek key (${keyErrorMessage || 'unauthorized'}).`
          : keyErrorMessage || `DeepSeek request failed (${deepseekResponse.status}).`,
        502
      );
    }

    // Thinking mode returns chain-of-thought in `reasoning_content` and the final
    // answer in `content`. Prefer `content`, but fall back to the reasoning text
    // so the user never sees an "empty response".
    const text = getText(result.choices?.[0]?.message?.content)
      || getText(result.choices?.[0]?.message?.reasoning_content);
    if (!text) throw new ProxyError('DeepSeek returned an empty response.', 502);

    sendJson(res, 200, { text, candidates: [] });
  } catch (error) {
    const statusCode = error instanceof ProxyError ? error.statusCode : 502;
    const message = error instanceof Error ? error.message : 'AI request failed.';
    sendJson(res, statusCode, { error: message });
  }
}
