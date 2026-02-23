import test from 'node:test';
import assert from 'node:assert/strict';
import { mapManualToCandidateProfile, mapManualToTargetProfile } from '../src/lib/manual-mapper.mjs';

const payload = {
  linkedinUrl: 'https://www.linkedin.com/in/techadnank9',
  email: 'adnan@example.com',
  mobileNumber: '+1-555-111',
  fullName: 'Mohammed Adnan',
  headline: 'Full Stack Developer (MERN)',
  about: 'About text',
  addressWithCountry: 'San Francisco, California, United States',
  totalExperienceYears: 5,
  companyName: 'Centific',
  jobTitle: 'Full Stack Developer',
  skills: [{ title: 'Wordpress Development' }, { title: 'Microsoft Azure' }],
  experiences: [{ title: 'Full Stack Developer', companyName: 'Centific' }],
  educations: [
    {
      title: 'TKR College of Engineering and Technology',
      subtitle: "Bachelor's degree, Computer Science"
    }
  ]
};

test('mapManualToCandidateProfile maps manual payload to candidate row shape', () => {
  const mapped = mapManualToCandidateProfile(payload, payload.linkedinUrl);
  assert.equal(mapped.linkedinUrl, payload.linkedinUrl);
  assert.equal(mapped.name, 'Mohammed Adnan');
  assert.equal(mapped.headline, 'Full Stack Developer (MERN)');
  assert.equal(mapped.location, 'San Francisco, California, United States');
  assert.equal(mapped.email, 'adnan@example.com');
  assert.equal(mapped.phone, '+1-555-111');
  assert.equal(
    mapped.highestEducation,
    "TKR College of Engineering and Technology, Bachelor's degree, Computer Science"
  );
  assert.equal(mapped.yearsOfExperience, 5);
  assert.deepEqual(mapped.skillsList, ['Wordpress Development', 'Microsoft Azure']);
  assert.deepEqual(mapped.skills, ['Wordpress Development', 'Microsoft Azure']);
});

test('mapManualToTargetProfile maps manual payload to target row shape', () => {
  const mapped = mapManualToTargetProfile(payload, payload.linkedinUrl);
  assert.equal(mapped.linkedinUrl, payload.linkedinUrl);
  assert.equal(mapped.name, 'Mohammed Adnan');
  assert.equal(mapped.role, 'Full Stack Developer');
  assert.equal(mapped.company, 'Centific');
  assert.deepEqual(mapped.focusAreas, ['Wordpress Development', 'Microsoft Azure']);
});
