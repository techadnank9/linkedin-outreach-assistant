const onboardingBlock = document.getElementById('onboardingBlock');
const onboardingScreen = document.getElementById('onboardingScreen');
const workspace = document.getElementById('workspace');
const candidateForm = document.getElementById('candidateForm');
const targetForm = document.getElementById('targetForm');
const composeTitleRow = document.getElementById('composeTitleRow');
const generateBtn = document.getElementById('generateBtn');
const refreshProfileBtn = document.getElementById('refreshProfileBtn');
const loadingBanner = document.getElementById('loadingBanner');
const loadingText = document.getElementById('loadingText');
const variantsEl = document.getElementById('variants');
const showTargetInputBtn = document.getElementById('showTargetInputBtn');
const targetInputCard = document.getElementById('targetInputCard');
const skillsChipsEl = document.getElementById('skillsChips');
const snapshotNameEl = document.getElementById('snapshotName');
const snapshotHeadlineEl = document.getElementById('snapshotHeadline');
const snapshotLocationEl = document.getElementById('snapshotLocation');
const snapshotExperienceEl = document.getElementById('snapshotExperience');
const snapshotSkillsEl = document.getElementById('snapshotSkills');
const targetSnapshotEl = document.getElementById('targetSnapshot');
const targetSnapshotNameEl = document.getElementById('targetSnapshotName');
const targetSnapshotRoleEl = document.getElementById('targetSnapshotRole');
const targetSnapshotCompanyEl = document.getElementById('targetSnapshotCompany');
const targetSnapshotFocusEl = document.getElementById('targetSnapshotFocus');
const jobSnapshotEl = document.getElementById('jobSnapshot');
const jobSnapshotRoleEl = document.getElementById('jobSnapshotRole');
const jobSnapshotCompanyEl = document.getElementById('jobSnapshotCompany');
const jobSnapshotLocationEl = document.getElementById('jobSnapshotLocation');
const jobSnapshotWorkModeEl = document.getElementById('jobSnapshotWorkMode');
const skillInputEl = document.getElementById('skillInput');
const addSkillBtnEl = document.getElementById('addSkillBtn');

const state = {
  candidate: null,
  target: null,
  jobContext: null,
  draftSessionId: null,
  userAddedSkills: new Set()
};
let skillPersistTimer = null;

function setGlobalLoading(isLoading, message = 'Processing request...') {
  if (!loadingBanner || !loadingText) return;
  if (isLoading) {
    loadingText.textContent = message;
    loadingBanner.classList.remove('hidden');
    return;
  }
  loadingBanner.classList.add('hidden');
}

function setButtonLoading(button, isLoading, defaultLabel, loadingLabel) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.textContent = loadingLabel;
    return;
  }
  button.disabled = false;
  button.textContent = defaultLabel;
}

function updateTargetEntryUI() {
  if (state.target) {
    composeTitleRow.classList.add('hidden');
    targetInputCard.classList.add('hidden');
    showTargetInputBtn.classList.add('hidden');
  } else {
    composeTitleRow.classList.remove('hidden');
    targetInputCard.classList.remove('hidden');
    showTargetInputBtn.classList.add('hidden');
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Request failed');
  }

  return response.json();
}

function hydrateCandidateForm(profile) {
  document.getElementById('candidateName').value = profile.name || '';
  document.getElementById('candidateNameInline').value = profile.name || '';
  document.getElementById('candidateHeadline').value = profile.headline || '';
  document.getElementById('candidateLocation').value = profile.location || '';
  document.getElementById('candidateEmail').value = profile.email || '';
  document.getElementById('candidatePhone').value = profile.phone || '';
  document.getElementById('candidateEducation').value = profile.highestEducation || '';
  document.getElementById('candidateEducationInline').value = profile.highestEducation || '';
  document.getElementById('candidateYearsExperience').value =
    profile.yearsOfExperience != null && profile.yearsOfExperience !== ''
      ? `${profile.yearsOfExperience} years`
      : '';
  const skillsList = Array.isArray(profile.skillsList) ? profile.skillsList : profile.skills || [];
  document.getElementById('candidateSkillsList').value = skillsList.join(', ');
  renderSkillChips(skillsList);
  state.userAddedSkills = new Set();
  document.getElementById('candidateAchievement').value = profile.achievements?.[0] || '';
  onboardingBlock.classList.add('hidden');
  candidateForm.classList.remove('hidden');
}

function renderSkillChips(skills) {
  skillsChipsEl.innerHTML = '';
  const list = Array.isArray(skills) ? skills : [];
  list.forEach(skill => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    const safeSkill = escapeHtml(skill);
    chip.innerHTML = `<span>${safeSkill}</span><button type="button" data-skill="${safeSkill}">×</button>`;
    skillsChipsEl.appendChild(chip);
  });
}

function currentSkills() {
  return document.getElementById('candidateSkillsList').value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function setSkills(skills) {
  const unique = [...new Set(skills.map(s => s.trim()).filter(Boolean))];
  document.getElementById('candidateSkillsList').value = unique.join(', ');
  renderSkillChips(unique);
}

function addSkillFromInput() {
  const value = (skillInputEl?.value || '').trim();
  if (!value) return;
  state.userAddedSkills.add(value);
  setSkills([...currentSkills(), value]);
  queuePersistSkills();
  skillInputEl.value = '';
  skillInputEl.focus();
}

function queuePersistSkills() {
  if (skillPersistTimer) {
    clearTimeout(skillPersistTimer);
  }
  skillPersistTimer = setTimeout(async () => {
    if (candidateForm.classList.contains('hidden')) return;
    const profile = collectCandidateFromForm();
    if (!profile.linkedinUrl) return;
    try {
      const payload = await postJson('/api/profile/save', {
        profile,
        addedSkills: profile.skillsList
      });
      state.candidate = payload.profile;
      renderProfileSnapshot(payload.profile);
    } catch (error) {
      console.warn('Failed to persist skills:', error.message);
    }
  }, 250);
}

function renderProfileSnapshot(profile) {
  if (!profile) {
    snapshotNameEl.textContent = '-';
    snapshotHeadlineEl.textContent = '-';
    snapshotLocationEl.textContent = 'Location: -';
    snapshotExperienceEl.textContent = 'Experience: -';
    snapshotSkillsEl.innerHTML = '';
    return;
  }

  snapshotNameEl.textContent = profile.name || 'Candidate';
  snapshotHeadlineEl.textContent = profile.headline || 'No headline provided';
  snapshotLocationEl.textContent = `Location: ${profile.location || '-'}`;
  snapshotExperienceEl.textContent = `Experience: ${
    profile.yearsOfExperience != null && profile.yearsOfExperience !== ''
      ? `${profile.yearsOfExperience} years`
      : '-'
  }`;

  const list = Array.isArray(profile.skillsList) && profile.skillsList.length > 0
    ? profile.skillsList
    : (profile.skills || []);

  snapshotSkillsEl.innerHTML = '';
  list.slice(0, 10).forEach(skill => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.textContent = skill;
    snapshotSkillsEl.appendChild(chip);
  });
}

function showWorkspace() {
  onboardingScreen.classList.add('hidden');
  workspace.classList.remove('hidden');
}

function showOnboarding() {
  onboardingScreen.classList.remove('hidden');
  workspace.classList.add('hidden');
}

function hydrateTargetForm(profile) {
  document.getElementById('targetName').value = profile.name || '';
  document.getElementById('targetRole').value = profile.role || '';
  document.getElementById('targetCompany').value = profile.company || '';
  document.getElementById('targetFocus').value = profile.focusAreas?.[0] || '';
}

function renderTargetSnapshot(profile) {
  if (!profile) {
    targetSnapshotEl.classList.add('hidden');
    targetSnapshotNameEl.textContent = '-';
    targetSnapshotRoleEl.textContent = '-';
    targetSnapshotCompanyEl.textContent = 'Company: -';
    targetSnapshotFocusEl.textContent = '';
    targetSnapshotFocusEl.classList.add('hidden');
    return;
  }

  targetSnapshotNameEl.textContent = profile.name || 'Hiring Manager';
  targetSnapshotRoleEl.textContent = profile.role || 'Role not available';
  targetSnapshotCompanyEl.textContent = `Company: ${profile.company || '-'}`;
  const focus = profile.focusAreas?.[0] || '';
  if (focus) {
    targetSnapshotFocusEl.textContent = `Focus: ${focus}`;
    targetSnapshotFocusEl.classList.remove('hidden');
  } else {
    targetSnapshotFocusEl.textContent = '';
    targetSnapshotFocusEl.classList.add('hidden');
  }
  targetSnapshotEl.classList.remove('hidden');
}

function renderJobSnapshot(jobContext) {
  if (!jobContext) {
    jobSnapshotEl.classList.add('hidden');
    jobSnapshotRoleEl.textContent = 'Role: -';
    jobSnapshotCompanyEl.textContent = 'Company: -';
    jobSnapshotLocationEl.textContent = 'Location: -';
    jobSnapshotWorkModeEl.textContent = 'Work mode: -';
    return;
  }

  jobSnapshotRoleEl.textContent = `Role: ${jobContext.roleTitle || '-'}`;
  jobSnapshotCompanyEl.textContent = `Company: ${jobContext.company || '-'}`;
  jobSnapshotLocationEl.textContent = `Location: ${jobContext.location || '-'}`;
  jobSnapshotWorkModeEl.textContent = `Work mode: ${jobContext.workMode || '-'}`;
  jobSnapshotEl.classList.remove('hidden');
}

function collectCandidateFromForm() {
  const candidateName = document.getElementById('candidateNameInline').value.trim();
  document.getElementById('candidateName').value = candidateName;
  const candidateEducation = document.getElementById('candidateEducationInline').value.trim();
  document.getElementById('candidateEducation').value = candidateEducation;
  const yearsRaw = document.getElementById('candidateYearsExperience').value.trim();
  const yearsMatch = yearsRaw.match(/(\d+(?:\.\d+)?)/);
  const yearsOfExperience = yearsMatch ? Number(yearsMatch[1]) : 0;
  const skillsList = document.getElementById('candidateSkillsList').value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    id: state.candidate?.id,
    linkedinUrl: state.candidate?.linkedinUrl || document.getElementById('candidateUrl').value.trim() || null,
    name: candidateName,
    headline: document.getElementById('candidateHeadline').value.trim(),
    location: document.getElementById('candidateLocation').value.trim(),
    email: document.getElementById('candidateEmail').value.trim(),
    phone: document.getElementById('candidatePhone').value.trim(),
    highestEducation: candidateEducation,
    yearsOfExperience,
    skillsList,
    achievements: [document.getElementById('candidateAchievement').value.trim()].filter(Boolean),
    skills: [...new Set(skillsList.filter(Boolean))]
  };
}

function collectTargetFromForm() {
  const target = {
    id: state.target?.id,
    linkedinUrl: state.target?.linkedinUrl || null,
    name: document.getElementById('targetName').value.trim(),
    role: document.getElementById('targetRole').value.trim(),
    company: document.getElementById('targetCompany').value.trim(),
    focusAreas: [document.getElementById('targetFocus').value.trim()].filter(Boolean)
  };
  const hasMeaningfulTarget =
    Boolean(target.linkedinUrl || target.name || target.role || target.company || target.focusAreas.length);
  return hasMeaningfulTarget ? target : null;
}

function canDraftEmail() {
  return Boolean(state.candidate && (state.target || state.jobContext));
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderVariants(variants) {
  variantsEl.innerHTML = '';
  variants.forEach((variant, index) => {
    const card = document.createElement('article');
    card.className = 'variant';
    const safeTone = escapeHtml(variant.tone || `Option ${index + 1}`);
    const safeSubject = escapeHtml(variant.subject || 'Personalized outreach');
    const safeBody = escapeHtml(variant.body || '').replaceAll('\n', '<br>');

    card.innerHTML = `
      <div class="variant-hero">
        <span class="variant-label">${safeTone}</span>
        <span class="variant-index">Draft ${index + 1}</span>
      </div>
      <div class="variant-content">
        <p class="variant-subject">${safeSubject}</p>
        <p class="variant-body">${safeBody}</p>
      </div>
      <div class="variant-actions">
        <button class="copy-btn" type="button">Copy</button>
        <button class="select-btn" type="button">Use This Draft</button>
      </div>
    `;

    card.querySelector('.copy-btn').addEventListener('click', async () => {
      await navigator.clipboard.writeText(`Subject: ${variant.subject}\n\n${variant.body}`);
      card.querySelector('.copy-btn').textContent = 'Copied';
      setTimeout(() => {
        card.querySelector('.copy-btn').textContent = 'Copy';
      }, 1200);
    });

    card.querySelector('.select-btn').addEventListener('click', () => {
      variantsEl.querySelectorAll('.variant').forEach(node => node.classList.remove('active'));
      card.classList.add('active');
    });

    variantsEl.appendChild(card);
  });
}

async function loadSavedProfile() {
  const response = await fetch('/api/profile');
  const data = await response.json();

  if (data.profile) {
    state.candidate = data.profile;
    renderProfileSnapshot(data.profile);
    showWorkspace();
    generateBtn.disabled = !canDraftEmail();
    return;
  }

  showOnboarding();
}

document.getElementById('extractCandidateBtn').addEventListener('click', async () => {
  const button = document.getElementById('extractCandidateBtn');
  try {
    setGlobalLoading(true, 'Extracting your LinkedIn profile...');
    setButtonLoading(button, true, 'Extract & Fill', 'Extracting...');
    const url = document.getElementById('candidateUrl').value.trim();
    const data = await postJson('/api/extract', { url, profileType: 'candidate' });
    state.candidate = data.profile;
    hydrateCandidateForm(data.profile);
    renderProfileSnapshot(data.profile);
  } catch (error) {
    alert(error.message);
  } finally {
    setGlobalLoading(false);
    setButtonLoading(button, false, 'Extract & Fill', 'Extracting...');
  }
});

document.getElementById('candidateSkillsList').addEventListener('input', event => {
  const skills = event.target.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  renderSkillChips(skills);
});

if (addSkillBtnEl && skillInputEl) {
  addSkillBtnEl.addEventListener('click', addSkillFromInput);
  skillInputEl.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkillFromInput();
    }
  });
}

skillsChipsEl.addEventListener('click', event => {
  const removeBtn = event.target.closest('button[data-skill]');
  if (!removeBtn) return;
  const skill = removeBtn.dataset.skill;
  state.userAddedSkills.delete(skill);
  setSkills(currentSkills().filter(item => item !== skill));
  queuePersistSkills();
});

document.getElementById('candidateNameInline').addEventListener('input', event => {
  document.getElementById('candidateName').value = event.target.value;
});

document.getElementById('candidateEducationInline').addEventListener('input', event => {
  document.getElementById('candidateEducation').value = event.target.value;
});

candidateForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = candidateForm.querySelector('button[type="submit"]');
  try {
    setGlobalLoading(true, 'Saving your profile...');
    setButtonLoading(button, true, 'Save & Continue', 'Saving...');
    state.candidate = collectCandidateFromForm();
    const payload = await postJson('/api/profile/save', {
      profile: state.candidate,
      addedSkills: state.candidate.skillsList
    });
    state.candidate = payload.profile;
    state.userAddedSkills = new Set();
    renderProfileSnapshot(payload.profile);
    showWorkspace();
    generateBtn.disabled = !canDraftEmail();
  } catch (error) {
    alert(error.message);
  } finally {
    setGlobalLoading(false);
    setButtonLoading(button, false, 'Save & Continue', 'Saving...');
  }
});

document.getElementById('extractTargetBtn').addEventListener('click', async () => {
  const button = document.getElementById('extractTargetBtn');
  try {
    setGlobalLoading(true, 'Analyzing hiring manager profile...');
    setButtonLoading(button, true, 'Analyze Hiring Profile', 'Analyzing...');
    const url = document.getElementById('targetUrl').value.trim();
    const data = await postJson('/api/extract', { url, profileType: 'target' });
    state.target = data.profile;
    hydrateTargetForm(data.profile);
    renderTargetSnapshot(data.profile);
    updateTargetEntryUI();
    generateBtn.disabled = !canDraftEmail();
  } catch (error) {
    alert(error.message);
  } finally {
    setGlobalLoading(false);
    setButtonLoading(button, false, 'Analyze Hiring Profile', 'Analyzing...');
  }
});

document.getElementById('extractJobBtn').addEventListener('click', async () => {
  const button = document.getElementById('extractJobBtn');
  try {
    setGlobalLoading(true, 'Analyzing job post...');
    setButtonLoading(button, true, 'Analyze Job Post', 'Analyzing...');
    const jobPostUrl = document.getElementById('jobPostUrl').value.trim();
    const jobText = document.getElementById('jobPostText').value.trim();
    const data = await postJson('/api/job/extract', { jobPostUrl, jobText });
    state.jobContext = data.jobContext;
    renderJobSnapshot(state.jobContext);
    generateBtn.disabled = !canDraftEmail();
  } catch (error) {
    alert(error.message);
  } finally {
    setGlobalLoading(false);
    setButtonLoading(button, false, 'Analyze Job Post', 'Analyzing...');
  }
});

showTargetInputBtn.addEventListener('click', () => {
  targetInputCard.classList.remove('hidden');
  document.getElementById('targetUrl').focus();
});

refreshProfileBtn.addEventListener('click', async () => {
  try {
    setGlobalLoading(true, 'Clearing saved profile...');
    setButtonLoading(refreshProfileBtn, true, 'Refresh Profile', 'Refreshing...');
    await postJson('/api/profile/reset', {
      linkedinUrl: state.candidate?.linkedinUrl || null
    });
  } catch (error) {
    alert(error.message);
    return;
  } finally {
    setGlobalLoading(false);
    setButtonLoading(refreshProfileBtn, false, 'Refresh Profile', 'Refreshing...');
  }

  showOnboarding();
  onboardingBlock.classList.remove('hidden');
  candidateForm.classList.add('hidden');
  targetForm.classList.add('hidden');
  targetInputCard.classList.add('hidden');
  variantsEl.innerHTML = '';
  document.getElementById('candidateUrl').value = '';
  document.getElementById('targetUrl').value = '';
  state.candidate = null;
  state.target = null;
  state.jobContext = null;
  state.draftSessionId = null;
  renderProfileSnapshot(null);
  renderTargetSnapshot(null);
  renderJobSnapshot(null);
  updateTargetEntryUI();
  generateBtn.disabled = true;
});

generateBtn.addEventListener('click', async () => {
  try {
    setGlobalLoading(true, 'Generating personalized email drafts...');
    setButtonLoading(generateBtn, true, 'Draft Email', 'Generating...');
    if (!candidateForm.classList.contains('hidden')) {
      state.candidate = collectCandidateFromForm();
    }
    state.target = collectTargetFromForm();
    const data = await postJson('/api/generate', {
      candidate: state.candidate,
      target: state.target,
      jobContext: state.jobContext
    });
    state.draftSessionId = data.draftSessionId;
    renderVariants(data.variants);
  } catch (error) {
    alert(error.message);
  } finally {
    setGlobalLoading(false);
    setButtonLoading(generateBtn, false, 'Draft Email', 'Generating...');
    generateBtn.disabled = !canDraftEmail();
  }
});

loadSavedProfile();
updateTargetEntryUI();
renderJobSnapshot(null);
