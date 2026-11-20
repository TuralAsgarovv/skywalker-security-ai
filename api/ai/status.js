const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

const getGeminiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.API_KEY?.trim() || '';
const getDeepseekKey = () => process.env.DEEPSEEK_API_KEY?.trim() || '';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  sendJson(res, 200, {
    gemini: Boolean(getGeminiKey()),
    deepseek: Boolean(getDeepseekKey())
  });
}
