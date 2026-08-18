import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEventRegistrationInput } from '../src/lib/eventRegistrationValidation.ts';

test('allows registration with empty LinkedIn and GitHub when student ID is provided', () => {
  const result = validateEventRegistrationInput({
    eventId: 'evt-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1234567890',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '1st Year',
    studentId: '21BCS1234',
    interests: ['AWS Cloud'],
    experienceLevel: 'Beginner',
    linkedin: '',
    github: '',
    motivation: 'I want to learn cloud skills.',
    consent: true,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('rejects registration when student ID is empty', () => {
  const result = validateEventRegistrationInput({
    eventId: 'evt-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1234567890',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '1st Year',
    studentId: '',
    interests: ['AWS Cloud'],
    experienceLevel: 'Beginner',
    linkedin: '',
    github: '',
    motivation: 'I want to learn cloud skills.',
    consent: true,
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.studentId, 'Student ID / UID is required.');
});

test('accepts a fully populated valid registration', () => {
  const result = validateEventRegistrationInput({
    eventId: 'evt-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1234567890',
    university: 'Chandigarh University – Uttar Pradesh',
    program: 'B.Tech CSE',
    year: '1st Year',
    studentId: '21BCS1234',
    interests: ['AWS Cloud', 'AI / ML'],
    experienceLevel: 'Beginner',
    linkedin: 'https://linkedin.com/in/janedoe',
    github: 'https://github.com/janedoe',
    motivation: 'I want to attend this event.',
    consent: true,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});
