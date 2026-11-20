const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const getGeminiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.API_KEY?.trim() || '';
const getDeepseekKey = () => process.env.DEEPSEEK_API_KEY?.trim() || '';

export default function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  // Serverless functions do not keep in-memory state between requests, so API
  // keys must be configured once as Vercel environment variables. Report the
  // current status honestly instead of pretending a browser-submitted key was
  // persisted.
  sendJson(res, 400, {
    error: 'On this Vercel deployment, API keys are configured as project environment variables (DEEPSEEK_API_KEY / GEMINI_API_KEY) and cannot be changed from the browser.',
    gemini: Boolean(getGeminiKey()),
    deepseek: Boolean(getDeepseekKey())
  });
}
