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

  // Serverless functions do not keep in-memory state between requests, so a key
  // sent from the browser cannot be persisted on the server. The browser stores
  // it (localStorage) and includes it with every /api/ai/generate request, so
  // this endpoint simply confirms how server-side keys are provided.
  sendJson(res, 200, {
    gemini: Boolean(getGeminiKey()),
    deepseek: Boolean(getDeepseekKey()),
    persisted: false,
    storage: 'browser',
    message: 'API keys are stored in this browser and sent with each AI request. To use a server-side key instead, set DEEPSEEK_API_KEY / GEMINI_API_KEY as Vercel environment variables and redeploy.'
  });
}
