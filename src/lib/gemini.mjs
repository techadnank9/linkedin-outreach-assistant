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

function cleanText(value) {
  return String(value || '').trim();
}

function fallbackYears(candidate) {
  const years = Number(candidate?.yearsOfExperience);
  if (Number.isFinite(years) && years > 0) return `${years} years`;
  return 'several years';
}

function replacePlaceholders(text, { candidate, target, jobContext }) {
  if (!text) return text;
  const map = {
    '[Candidate Name]': cleanText(candidate?.name) || 'the candidate',
    '[Your Name]': cleanText(candidate?.name) || 'the candidate',
    '[Headline]': cleanText(candidate?.headline) || 'software engineer',
    '[X years]': fallbackYears(candidate),
    '[Hiring Team/Hiring Manager]':
      cleanText(target?.name) || 'Hiring Team',
    '[Hiring Team]': cleanText(target?.name) || 'Hiring Team',
    '[Company]': cleanText(jobContext?.company || target?.company) || 'your company'
  };

  let out = String(text);
  Object.entries(map).forEach(([token, replacement]) => {
    out = out.split(token).join(replacement);
  });
  out = out.replace(/\*\*/g, '');
  return out;
}

function enforceSenderPerspective(text, candidate) {
  const badPatterns = [
    /\bI'?m\s+\[?Your Name\]?/i,
    /\bmyself\s+/i,
    /\bwe'?re\s+(actively\s+)?hiring/i,
    /\bI'?m\s+a recruiter\b/i,
    /\bfrom\s+[A-Z][\w& ]+\s+and\s+I\s+stumbled\b/i
  ];
  const hasBadPattern = badPatterns.some(pattern => pattern.test(text || ''));
  if (!hasBadPattern) return text;
  const intro = `Hi Hiring Team,\n\nI'm ${cleanText(candidate?.name) || 'a candidate'}, a ${cleanText(candidate?.headline) || 'software engineer'} with ${fallbackYears(candidate)} of experience.`;
  const remaining = String(text || '')
    .split('\n')
    .slice(2)
    .join('\n')
    .trim();
  return `${intro}\n\n${remaining}`;
}

function finalizeVariants(variants, { candidate, target, jobContext }) {
  return variants.map(variant => {
    const subject = enforceSenderPerspective(
      replacePlaceholders(variant.subject, { candidate, target, jobContext }),
      candidate
    );
    const body = enforceSenderPerspective(
      replacePlaceholders(variant.body, { candidate, target, jobContext }),
      candidate
    );
    return {
      ...variant,
      subject: subject.replace(/\s+/g, ' ').trim(),
      body: body.trim()
    };
  });
}

export async function extractCandidateProfile({ linkedinUrl, rawText }) {
  const prompt = `
Extract a candidate profile JSON from this LinkedIn text.
Return only valid JSON with keys:
name, headline, summary, location, email, phone, highestEducation, yearsOfExperience,
skillsList (array of strings), achievements (array of strings), skills (array of strings), linkedinUrl.
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

export async function extractJobContext({ jobPostUrl, rawText }) {
  const prompt = `
Extract a job context JSON from this job post content.
Return only valid JSON with keys:
roleTitle, company, location, workMode, seniority,
mustHaveSkills (array of strings), niceToHaveSkills (array of strings), keyResponsibilities (array of strings).
Do not fabricate facts.
jobPostUrl must be: ${jobPostUrl || ''}
\nJob post content:\n${rawText}
`;

  return callGemini(prompt);
}

export async function generateEmailVariants({ candidate, target, jobContext = null }) {
  const prompt = `
Generate exactly 3 outreach email variants as JSON array in field variants.
Use the same core narrative but different tones: professional, conversational, assertive.
Each variant object must include tone, subject, body.
Personalize with candidate context.
Use target context when provided.
If Job Context is provided, each email must include:
- exactly 2 matched candidate skills relevant to the role
- exactly 1 role responsibility
- exactly 1 concrete proof point from candidate experience
Writing perspective and opening rules:
- The sender is always the job seeker (candidate), in first person.
- In job-context mode, open with a direct professional intro like:
  "Hi Hiring Team, I’m <candidate name>, a <headline> with <years> of experience in <skill area>."
- Do not use phrasing like "myself [name]".
Output quality rules:
- Never use placeholders or bracket tokens like [Candidate Name], [X years], [Your Name].
- Never use markdown markers like **bold**.
Do not fabricate facts.

Candidate JSON:\n${JSON.stringify(candidate, null, 2)}

Target JSON:\n${JSON.stringify(target, null, 2)}

Job Context JSON (optional):\n${JSON.stringify(jobContext, null, 2)}
`;

  const payload = await callGemini(prompt);
  if (!Array.isArray(payload.variants) || payload.variants.length !== 3) {
    throw new Error('Gemini did not return exactly 3 variants');
  }
  return finalizeVariants(payload.variants, { candidate, target, jobContext });
}
