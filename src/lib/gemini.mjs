import { requireEnv } from './env.mjs';

function geminiEndpoint() {
  const env = requireEnv();
  return `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`;
}

async function callGemini(prompt) {
  const response = await fetch(geminiEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return JSON.parse(text);
}

export async function extractCandidateProfile({ linkedinUrl, rawText }) {
  const prompt = `
Extract a candidate profile JSON from this LinkedIn text.
Return only valid JSON with keys:
name, headline, summary, achievements (array of strings), skills (array of strings), linkedinUrl.
linkedinUrl must be: ${linkedinUrl}
\nLinkedIn text:\n${rawText}
`;

  return callGemini(prompt);
}

export async function extractTargetProfile({ linkedinUrl, rawText }) {
  const prompt = `
Extract a hiring manager or founder profile JSON from this LinkedIn text.
Return only valid JSON with keys:
name, role, company, focusAreas (array of strings), linkedinUrl.
linkedinUrl must be: ${linkedinUrl}
\nLinkedIn text:\n${rawText}
`;

  return callGemini(prompt);
}

export async function generateEmailVariants({ candidate, target }) {
  const prompt = `
Generate exactly 3 outreach email variants as JSON array in field variants.
Use the same core narrative but different tones: professional, conversational, assertive.
Each variant object must include tone, subject, body.
Personalize with both candidate and target context.
Do not fabricate facts.

Candidate JSON:\n${JSON.stringify(candidate, null, 2)}

Target JSON:\n${JSON.stringify(target, null, 2)}
`;

  const payload = await callGemini(prompt);
  if (!Array.isArray(payload.variants) || payload.variants.length !== 3) {
    throw new Error('Gemini did not return exactly 3 variants');
  }
  return payload.variants;
}
