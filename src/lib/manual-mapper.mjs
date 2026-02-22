function extractSkills(payload) {
  if (!Array.isArray(payload?.skills)) return [];
  return payload.skills
    .map(item => (typeof item === 'string' ? item : item?.title || item?.name))
    .filter(Boolean)
    .slice(0, 10);
}

function extractAchievements(payload) {
  if (!Array.isArray(payload?.experiences)) return [];
  return payload.experiences
    .map(exp => {
      const title = exp?.title || '';
      const company = exp?.companyName || '';
      const v = `${title}${title && company ? ' at ' : ''}${company}`.trim();
      return v || null;
    })
    .filter(Boolean)
    .slice(0, 5);
}

export function mapManualToCandidateProfile(payload, linkedinUrl) {
  return {
    linkedinUrl: linkedinUrl || payload?.linkedinUrl || payload?.linkedinPublicUrl || null,
    name: payload?.fullName || [payload?.firstName, payload?.lastName].filter(Boolean).join(' ') || null,
    headline: payload?.headline || payload?.jobTitle || null,
    summary: payload?.about || null,
    achievements: extractAchievements(payload),
    skills: extractSkills(payload)
  };
}

export function mapManualToTargetProfile(payload, linkedinUrl) {
  return {
    linkedinUrl: linkedinUrl || payload?.linkedinUrl || payload?.linkedinPublicUrl || null,
    name: payload?.fullName || [payload?.firstName, payload?.lastName].filter(Boolean).join(' ') || null,
    role: payload?.jobTitle || payload?.headline || null,
    company: payload?.companyName || null,
    focusAreas: extractSkills(payload)
  };
}
