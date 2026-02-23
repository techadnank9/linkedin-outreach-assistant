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

function extractHighestEducation(payload) {
  if (!Array.isArray(payload?.educations) || payload.educations.length === 0) return null;
  const edu = payload.educations[0] || {};
  const title = edu.title || '';
  const subtitle = edu.subtitle || '';
  const value = `${title}${title && subtitle ? ', ' : ''}${subtitle}`.trim();
  return value || null;
}

function extractYearsOfExperience(payload) {
  if (
    typeof payload?.totalExperienceYears === 'number' &&
    Number.isFinite(payload.totalExperienceYears) &&
    payload.totalExperienceYears > 0
  ) {
    return payload.totalExperienceYears;
  }

  const about = typeof payload?.about === 'string' ? payload.about : '';
  const aboutYearsMatch = about.match(/(\d+(?:\.\d+)?)\s*\+?\s*years?/i);
  if (aboutYearsMatch) {
    return Number(aboutYearsMatch[1]);
  }

  if (
    typeof payload?.currentJobDurationInYrs === 'number' &&
    Number.isFinite(payload.currentJobDurationInYrs) &&
    payload.currentJobDurationInYrs > 0
  ) {
    return Number(payload.currentJobDurationInYrs.toFixed(2));
  }

  if (typeof payload?.firstRoleYear === 'number') {
    const currentYear = new Date().getFullYear();
    return Math.max(0, currentYear - payload.firstRoleYear);
  }

  return null;
}

export function mapManualToCandidateProfile(payload, linkedinUrl) {
  return {
    linkedinUrl: linkedinUrl || payload?.linkedinUrl || payload?.linkedinPublicUrl || null,
    name: payload?.fullName || [payload?.firstName, payload?.lastName].filter(Boolean).join(' ') || null,
    headline: payload?.headline || payload?.jobTitle || null,
    summary: payload?.about || null,
    location:
      payload?.addressWithCountry ||
      payload?.addressWithoutCountry ||
      payload?.addressCountryOnly ||
      payload?.jobLocation ||
      null,
    email: payload?.email || null,
    phone: payload?.mobileNumber || null,
    highestEducation: extractHighestEducation(payload),
    yearsOfExperience: extractYearsOfExperience(payload),
    skillsList: extractSkills(payload),
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
