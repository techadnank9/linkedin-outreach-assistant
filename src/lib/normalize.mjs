export function toClientCandidateProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url,
    name: row.name,
    headline: row.headline,
    summary: row.summary,
    location: row.location || null,
    email: row.email || null,
    phone: row.phone || null,
    highestEducation: row.highest_education || null,
    yearsOfExperience: row.years_of_experience == null ? null : Number(row.years_of_experience),
    skillsList: row.skills_list || [],
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
