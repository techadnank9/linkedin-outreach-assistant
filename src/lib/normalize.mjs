export function toClientCandidateProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url,
    name: row.name,
    headline: row.headline,
    summary: row.summary,
    achievements: row.achievements || [],
    skills: row.skills || []
  };
}

export function toClientTargetProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url,
    name: row.name,
    role: row.role,
    company: row.company,
    focusAreas: row.focus_areas || []
  };
}
