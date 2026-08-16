export interface EventRegistrationValidationInput {
  eventId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  university?: string;
  customUniversity?: string;
  program?: string;
  year?: string;
  studentId?: string;
  interests?: string[] | string;
  experienceLevel?: string;
  linkedin?: string;
  github?: string;
  motivation?: string;
  consent?: boolean;
}

export function validateEventRegistrationInput(input: EventRegistrationValidationInput) {
  const errors: Record<string, string> = {};

  if (!input.fullName?.trim()) errors.fullName = 'Full Name is required';

  if (!input.email?.trim()) {
    errors.email = 'Email Address is required';
  } else if (!/\S+@\S+\.\S+/.test(input.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!input.phone?.trim()) {
    errors.phone = 'Mobile Number is required';
  } else if (!/^\+?[0-9\s\-()]{10,15}$/.test(input.phone)) {
    errors.phone = 'Please enter a valid phone number (10 to 15 digits)';
  }

  const universityValue = input.university === 'Other' ? input.customUniversity : input.university;
  if (input.university === 'Other') {
    if (!input.customUniversity?.trim()) {
      errors.customUniversity = 'Please specify your university';
    }
  } else if (!universityValue?.trim()) {
    errors.university = 'University name is required';
  }

  if (!input.program?.trim()) errors.program = 'Program or course is required';

  if (!input.studentId?.trim()) {
    errors.studentId = 'Student ID / UID is required.';
  }

  const interests = Array.isArray(input.interests) ? input.interests : input.interests ? [input.interests] : [];
  if (interests.length === 0) {
    errors.interests = 'Please select at least one technical interest';
  }

  if (input.linkedin && !/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/.test(input.linkedin.trim())) {
    errors.linkedin = 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/username)';
  }

  if (input.github && !/^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(input.github.trim())) {
    errors.github = 'Please enter a valid GitHub profile URL (e.g., github.com/username)';
  }

  if (!input.motivation?.trim()) {
    errors.motivation = 'Please tell us why you want to attend';
  }

  if (!input.consent) {
    errors.consent = 'You must consent to sharing registration details';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
