
import { ThinkingLevel, Type } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export interface ExploitOptions {
  injectionPoint?: string;
  evasionTechnique?: string;
  customContext?: string;
}

export interface ThreatReport {
  title: string;
  summary: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  date: string;
  tags: string[];
}

export interface CVEInfo {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cvss: number;
  affected: string;
  datePublished: string;
}

export type AIProvider = 'gemini' | 'deepseek';

export interface AIProviderStatus {
  gemini: boolean;
  deepseek: boolean;
}

export const getSavedAIProvider = (): AIProvider =>
  localStorage.getItem('skywalker_ai_provider') === 'deepseek' ? 'deepseek' : 'gemini';

export const getAIProviderStatus = async (): Promise<AIProviderStatus> => {
  const response = await fetch('/api/ai/status');
  if (!response.ok) {
    throw new Error(`Could not read AI provider status (${response.status}).`);
  }
  return response.json() as Promise<AIProviderStatus>;
};

const getAIProviderForRequest = async (): Promise<AIProvider> => {
  const stored = localStorage.getItem('skywalker_ai_provider');
  const savedProvider: AIProvider | null =
    stored === 'deepseek' ? 'deepseek' : stored === 'gemini' ? 'gemini' : null;

  let status: AIProviderStatus;
  try {
    status = await getAIProviderStatus();
  } catch {
    // If the status endpoint is unreachable, keep the saved/default provider.
    return savedProvider ?? 'gemini';
  }

  // This application runs entirely on the DeepSeek backend. Whenever a DeepSeek key
  // is configured, use it for every request — even if an older Gemini selection is
  // still saved — so no feature silently falls back to a provider without a key.
  if (status.deepseek) {
    if (savedProvider !== 'deepseek') {
      localStorage.setItem('skywalker_ai_provider', 'deepseek');
    }
    return 'deepseek';
  }

  // No DeepSeek key: fall back to Gemini when it is available.
  if (status.gemini) {
    if (savedProvider !== 'gemini') {
      localStorage.setItem('skywalker_ai_provider', 'gemini');
    }
    return 'gemini';
  }

  return savedProvider ?? 'gemini';
};

const updateAIProviderKey = async (
  provider: AIProvider,
  method: 'PUT' | 'DELETE',
  key?: string
): Promise<AIProviderStatus> => {
  const response = await fetch('/api/ai/keys', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...(key ? { key } : {}) })
  });
  const result = await response.json() as AIProviderStatus & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || `Could not update provider key (${response.status}).`);
  }
  return { gemini: result.gemini, deepseek: result.deepseek };
};

export const saveAIProviderKey = (provider: AIProvider, key: string) =>
  updateAIProviderKey(provider, 'PUT', key);

export const clearAIProviderKey = (provider: AIProvider) =>
  updateAIProviderKey(provider, 'DELETE');

const ai = {
  models: {
    async generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse> {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, provider: await getAIProviderForRequest() })
      });

      const result = await response.json() as GenerateContentResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || `AI request failed (${response.status}).`);
      }
      return result;
    }
  }
};

/**
 * Robustly extracts and parses JSON from a string that might contain markdown or conversational preambles.
 */
const cleanAndParseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (innerError) {
        console.error("Failed to parse extracted code block JSON", innerError);
      }
    }

    // Attempt to find the first { or [ and last } or ]
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

    if (start !== -1) {
      const lastBrace = text.lastIndexOf('}');
      const lastBracket = text.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);
      
      if (end !== -1 && end > start) {
        try {
          return JSON.parse(text.substring(start, end + 1));
        } catch (innerError) {
          console.error("Failed to parse substring JSON", innerError);
        }
      }
    }
    
    throw new Error(`Failed to parse JSON response. Raw text started with: ${text.substring(0, 50)}... Original error: ${e.message}`);
  }
};

export const generateBountyPayload = async (vulnType: string, filterContext: string) => {
  const prompt = `
    Act as a World-Class Bug Bounty Hunter specialized in filter evasion.
    Generate 3 distinct payload variants for: ${vulnType}.
    Context/Filter Behavior: ${filterContext}

    1. Simple: Direct, focused on the core logic.
    2. Obfuscated: Using encoding/hiding techniques.
    3. Advanced Bypass: Complex polyglots or logic-based bypasses.

    Respond STRICTLY in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.STRING },
                payload: { type: Type.STRING },
                explanation: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return cleanAndParseJson(response.text);
};

export const synthesizeBountyReport = async (vulnType: string, target: string, steps: string, evidence: string) => {
  const prompt = `
    Act as an elite Bug Bounty Hunter. Convert this vulnerability finding into a professional report for HackerOne/Bugcrowd.
    
    Target: ${target}
    Vulnerability: ${vulnType}
    Steps to Reproduce: ${steps}
    Evidence: ${evidence}

    Requirements:
    1. Professional markdown format.
    2. Detailed "Impact" section explaining business risk.
    3. Clear "Steps to Reproduce".
    4. Suggested CVSS 3.1 score and vector.
    5. Remediation advice.
    
    Respond STRICTLY in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: { type: Type.STRING },
          cvss: { type: Type.STRING },
          markdown: { type: Type.STRING },
          impactSummary: { type: Type.STRING }
        },
        required: ["title", "severity", "cvss", "markdown", "impactSummary"]
      }
    }
  });

  return cleanAndParseJson(response.text);
};

export const analyzeHeaders = async (rawHeaders: string) => {
  const prompt = `
    Act as a Senior Security Compliance Engineer. 
    Analyze these HTTP headers for security posture, privacy leaks, and best practices.
    Use Google Search to cross-reference these headers with the latest browser security requirements (2025+).
    
    Headers to analyze:
    ---
    ${rawHeaders}
    ---

    Respond STRICTLY in JSON format. Do not include any preamble or explanation outside the JSON structure.
    Return an object with: score (number), riskLevel (string), summary (string), missingHeaders (array of strings), findings (array of objects with header, status, impact, recommendation, remediationSnippet, category fields).
  `;

  // BUG FIX: googleSearch (grounding) ilə responseMimeType/responseSchema
  // birlikdə istifadə edilə bilməz — API error verir.
  // responseSchema silindi, cleanAndParseJson() JSON-u parse edir.
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  return cleanAndParseJson(response.text);
};

export const analyzeIntel = async (type: 'CVE' | 'ARTICLE', content: string) => {
  const prompt = type === 'CVE' 
    ? `Analyze the following CVE ID: ${content}. Provide a technical breakdown, impact analysis, and remediation steps. Use Google Search to find the most recent advisories and exploit reports.`
    : `Analyze the following cybersecurity article/text: \n\n${content}\n\n. Provide a technical summary, identify the core threats or vulnerabilities discussed, and suggest security best practices or mitigations. Use Google Search to verify claims or find related incidents.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];

  return { text: response.text, sources };
};

export const generateExploitPayload = async (vulnClass: string, context: string, targetTech: string) => {
  const prompt = `
    Act as a Senior Security Research Architect. 
    Design a technical research payload for: ${vulnClass}.
    Target Technology: ${targetTech}
    Context: ${context}

    Use Google Search to find the most recent bypass techniques for this technology stack, especially against modern WAFs (2025).
    Perform deep internal reasoning to ensure the payload is logically sound and avoids common filtering pitfalls.
    
    Respond STRICTLY in JSON format with fields: payload, mechanism, behavior (array), remediation (array).
    IMPORTANT: Respond ONLY with the JSON object. No conversational filler.
  `;

  // BUG FIX: googleSearch ilə responseMimeType/responseSchema birlikdə işləmir.
  // responseSchema silindi.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 },
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];

  return {
    ...cleanAndParseJson(response.text),
    sources
  };
};

export const improveExploitPayload = async (previousPayload: string, feedback: string, vulnClass: string, context: string, targetTech: string) => {
  const prompt = `
    Act as an Expert Exploit Development Specialist. 
    A previous research payload was blocked. Evolve it to bypass the restriction.
    
    Vulnerability: ${vulnClass}
    Stack: ${targetTech}
    Previous Payload: \`${previousPayload}\`
    Block Feedback: "${feedback}"

    Instructions:
    1. Use Google Search to research the specific block/filter behavior mentioned in the feedback.
    2. Apply deep reasoning to calculate a polyglot or obfuscated bypass.
    3. Explain the specific bypass logic.
    
    Respond STRICTLY in JSON format with fields: payload, mechanism, behavior (array), remediation (array).
    OUTPUT: Respond strictly in JSON format.
  `;

  // BUG FIX: googleSearch ilə responseMimeType/responseSchema birlikdə işləmir.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 },
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];

  return {
    ...cleanAndParseJson(response.text),
    sources
  };
};

export const generateCyberTool = async (toolType: string, os: string, language: string, features: string[], userConfig: Record<string, string> = {}) => {
  const configStr = Object.entries(userConfig)
    .filter(([_, v]) => v.trim() !== '')
    .map(([k, v]) => `${k}: "${v}"`)
    .join('\n');

  const prompt = `
    Act as a Master Security Tooling Architect. 
    Create a highly professional technical blueprint and implementation for an educational ${toolType}.
    Target OS: ${os}
    Language: ${language}
    Requested Features: ${features.join(', ')}

    USER-PROVIDED CONFIGURATION (MUST INTEGRATE DIRECTLY INTO CODE):
    ---
    ${configStr || 'No specific API tokens provided. Use placeholders like "YOUR_TOKEN_HERE" if needed, but prioritize any values provided above.'}
    ---

    Implementation Requirements:
    1. Direct Integration: If botToken, chatId, webhookUrl, or exfilEndpoint are provided, they MUST be hardcoded into the source implementation variables.
    2. Operational Logic:
       - Stealth: Platform-specific hiding (e.g., SetFileAttributes on Windows, prefixing with '.' on Unix).
       - Persistence: Registry (winreg), Startup folders, or systemd services.
       - Exfiltration: Using provided Telegram, Discord, or Webhook variables.
       - Surveillance: Capturing camera (cv2), screenshots (pyautogui), and device info.
    3. Production Quality: Code must be robust, asynchronous (asyncio/threading), and contain professional error handling and comments.
    
    OUTPUT MUST BE STRICT JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          blueprint: { type: Type.STRING },
          codeSample: { type: Type.STRING },
          workflow: { type: Type.ARRAY, items: { type: Type.STRING } },
          ethicalGuidelines: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["blueprint", "codeSample", "workflow", "ethicalGuidelines"]
      }
    }
  });

  return cleanAndParseJson(response.text);
};

export const analyzeDomain = async (domain: string, modules: string[] = []) => {
  const prompt = `
    Act as a high-level Penetration Tester and OSINT Specialist.
    Perform an advanced security audit for: ${domain}.
    
    Use Google Search to perform deep reconnaissance:
    - Search for exposed .git, .env, or configuration files.
    - Find subdomains and hidden API endpoints.
    - Check for recent breach data associated with this domain.
    
    Apply deep internal thinking to correlate findings into a high-precision risk assessment.
    Focus: ${modules.join(', ')}
    
    Respond STRICTLY in JSON format with fields: score, categoryScores (array of {category, score}), summary, reconnaissance (array of {type, value, status}), topRisks (array of {name, severity, category}), technologies (array of strings), remediation.
  `;

  // BUG FIX: googleSearch ilə responseMimeType/responseSchema birlikdə işləmir.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 },
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];

  return {
    ...cleanAndParseJson(response.text),
    sources
  };
};

export const getLiveCVEData = async () => {
  const prompt = `Find the 15 most recent and critical CVEs published in the last 7 days. Use Google Search.
  Respond STRICTLY in JSON format with a single "cves" array. Each item must have: id, title, description, severity, cvss (number), affected, datePublished.`;

  // BUG FIX: googleSearch ilə responseMimeType/responseSchema birlikdə işləmir.
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];
  return { cves: cleanAndParseJson(response.text).cves as CVEInfo[], sources };
};

export const generateVulnerabilityDeepDive = async (vulnName: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Provide a detailed technical deep dive for: ${vulnName}. Include root cause, attack vectors, and specific mitigation strategies.`,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
  });
  return response.text;
};

export const chatWithAdvisor = async (
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  message: string
) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      systemInstruction: "You are Skywalker AI, a world-class Cybersecurity Assistant. Use Google Search to verify recent threats."
    }
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];
  if (!response.text) {
    throw new Error('Gemini returned an empty response.');
  }
  return { text: response.text, sources };
};

export const getLatestThreatIntel = async () => {
  const prompt = `Identify the 10 most significant cybersecurity threats, breaches, or zero-days from the last 72 hours.
  Respond STRICTLY in JSON format with a "threats" array. Each item must have: title, summary, impact, date, tags (array of strings).`;

  // BUG FIX: googleSearch ilə responseMimeType/responseSchema birlikdə işləmir.
  // Yalnız tools saxlanıldı, schema silindi.
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
    }
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter(chunk => chunk.web)
    ?.map(chunk => ({ title: chunk.web!.title, uri: chunk.web!.uri })) || [];
  return { threats: cleanAndParseJson(response.text).threats as ThreatReport[], sources };
};

export const analyzeThreatImpact = async (report: ThreatReport) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze the potential infrastructure impact and provide mitigation strategies for this threat: ${report.title}. Summary: ${report.summary}`,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
  });
  return response.text;
};

export const explainVulnerability = async (vulnName: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Explain the technical mechanics of the ${vulnName} vulnerability. Include history, variants, and remediation.`,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
  });
  return response.text;
};

export const generateComplianceAdvice = async (rank: string, title: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Provide a detailed mitigation and testing guide for the OWASP Top 10 risk: ${rank} - ${title}.`,
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
  });
  return response.text;
};

export const generateExecutiveSummary = async (vulnName: string, diveData: any) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `Create a concise executive summary (CISO level) for the following vulnerability analysis: ${vulnName}. Data: ${JSON.stringify(diveData)}`
  });
  return response.text;
}
