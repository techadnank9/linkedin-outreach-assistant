const onboardingBlock = document.getElementById('onboardingBlock');
const onboardingScreen = document.getElementById('onboardingScreen');
const workspace = document.getElementById('workspace');
const candidateForm = document.getElementById('candidateForm');
const targetForm = document.getElementById('targetForm');
const generateBtn = document.getElementById('generateBtn');
const variantsEl = document.getElementById('variants');

const state = {
  candidate: null,
  target: null,
  draftSessionId: null
};

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
  document.getElementById('candidateHeadline').value = profile.headline || '';
  document.getElementById('candidateAchievement').value = profile.achievements?.[0] || '';
  document.getElementById('candidateSkill').value = profile.skills?.[0] || '';
  onboardingBlock.classList.add('hidden');
  candidateForm.classList.remove('hidden');
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
  targetForm.classList.remove('hidden');
}

function collectCandidateFromForm() {
  return {
    id: state.candidate?.id,
    linkedinUrl: state.candidate?.linkedinUrl || null,
    name: document.getElementById('candidateName').value.trim(),
    headline: document.getElementById('candidateHeadline').value.trim(),
    achievements: [document.getElementById('candidateAchievement').value.trim()].filter(Boolean),
    skills: [document.getElementById('candidateSkill').value.trim()].filter(Boolean)
  };
}

function collectTargetFromForm() {
  return {
    id: state.target?.id,
    linkedinUrl: state.target?.linkedinUrl || null,
    name: document.getElementById('targetName').value.trim(),
    role: document.getElementById('targetRole').value.trim(),
    company: document.getElementById('targetCompany').value.trim(),
    focusAreas: [document.getElementById('targetFocus').value.trim()].filter(Boolean)
  };
}

function renderVariants(variants) {
  variantsEl.innerHTML = '';
  variants.forEach(variant => {
    const card = document.createElement('article');
    card.className = 'variant';
    card.innerHTML = `
      <h4>${variant.tone.toUpperCase()}</h4>
      <p><strong>Subject:</strong> ${variant.subject}</p>
      <p>${variant.body}</p>
      <button class="copy-btn">Copy</button>
    `;

    card.querySelector('.copy-btn').addEventListener('click', async () => {
      await navigator.clipboard.writeText(`Subject: ${variant.subject}\n\n${variant.body}`);
      card.querySelector('.copy-btn').textContent = 'Copied';
      setTimeout(() => {
        card.querySelector('.copy-btn').textContent = 'Copy';
      }, 1200);
    });

    variantsEl.appendChild(card);
  });
}

async function loadSavedProfile() {
  const response = await fetch('/api/profile');
  const data = await response.json();

  if (data.profile) {
    state.candidate = data.profile;
    showWorkspace();
    generateBtn.disabled = !state.target;
    return;
  }

  showOnboarding();
}

document.getElementById('extractCandidateBtn').addEventListener('click', async () => {
  try {
    const url = document.getElementById('candidateUrl').value.trim();
    const data = await postJson('/api/extract', { url, profileType: 'candidate' });
    state.candidate = data.profile;
    hydrateCandidateForm(data.profile);
  } catch (error) {
    alert(error.message);
  }
});

candidateForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    state.candidate = collectCandidateFromForm();
    const payload = await postJson('/api/profile/save', { profile: state.candidate });
    state.candidate = payload.profile;
    showWorkspace();
    generateBtn.disabled = !state.target;
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('extractTargetBtn').addEventListener('click', async () => {
  try {
    const url = document.getElementById('targetUrl').value.trim();
    const data = await postJson('/api/extract', { url, profileType: 'target' });
    state.target = data.profile;
    hydrateTargetForm(data.profile);
    generateBtn.disabled = !state.candidate;
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('refreshProfileBtn').addEventListener('click', () => {
  showOnboarding();
  onboardingBlock.classList.remove('hidden');
  candidateForm.classList.add('hidden');
  targetForm.classList.add('hidden');
  variantsEl.innerHTML = '';
  document.getElementById('candidateUrl').value = '';
  state.candidate = null;
  state.target = null;
  state.draftSessionId = null;
  generateBtn.disabled = true;
});

generateBtn.addEventListener('click', async () => {
  try {
    state.candidate = collectCandidateFromForm();
    state.target = collectTargetFromForm();
    const data = await postJson('/api/generate', {
      candidate: state.candidate,
      target: state.target
    });
    state.draftSessionId = data.draftSessionId;
    renderVariants(data.variants);
  } catch (error) {
    alert(error.message);
  }
});

loadSavedProfile();
