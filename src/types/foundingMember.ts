export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'url'
  | 'file'
  | 'photo';

export interface FormQuestion {
  id: string; // Unique question identifier (e.g. 'q_skills', 'q_why_aws', etc.)
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  enabled: boolean;
  options?: string[]; // Used for dropdown, radio, checkbox
  step?: number; // Step number in multi-step form (1-6)
  order: number;
  conditionRole?: string[]; // Optional conditional visibility by role
}

export interface FoundingMemberFormConfig {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  purpose?: string;
  introMessage?: string;
  instructions?: string;
  organizationName?: string;
  headerText?: string;
  footerText?: string;
  submitButtonText?: string;
  successTitle?: string;
  successMessage?: string;
  consentText?: string;
  status: 'Published' | 'Draft';
  publishedUrl: string;
  version: number;
  updatedAt: string;
  questions: FormQuestion[];
  draftConfig?: Partial<FoundingMemberFormConfig> | null;
}

export interface FoundingMember {
  id: string; // Internal db ID (e.g. 'fm-001' or uuid)
  memberId: string; // Permanent professional ID e.g. 'FMB-CUUP-001'
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  university?: string;
  courseBranch?: string; // Course/Branch/Program
  course?: string;
  yearSemester?: string; // Year/Semester/Year of Study
  studentId?: string; // Roll Number / Student ID (UID)
  photoUrl?: string; // Profile Photo URL / base64
  linkedin?: string;
  github?: string;
  portfolio?: string;
  domain?: string; // Team / Domain
  role?: string; // Member Type / Role e.g. Founding Member, Core Team, Event Speaker, Anchor, Technical, etc.
  memberRole?: string; // Explicit member type
  designation?: string; // Current Designation/Role in AWS SBG
  dateOfJoining?: string; // Date of Joining/Selection
  membershipStatus?: 'Active' | 'Probation / Onboarding' | 'Alumni / Senior Advisor' | 'Inactive';
  skills?: string; // Primary Skills
  interests?: string; // Technical / Professional Interests

  // Anchor / Speaker Details
  speakerRoleType?: 'Anchor' | 'Speaker' | 'Both (Anchor & Speaker)' | string;
  speakingExperience?: string;
  demoVideoUrl?: string;
  speakingTopics?: string;
  languages?: string;
  eventAvailability?: string;

  // Experience & Contribution
  previousExperience?: string;
  contributionAreas?: string;
  assignedResponsibilities?: string;
  majorAchievements?: string;
  experience?: string; // Legacy / Combined Experience field

  // Recognition & Records
  certifications?: string;
  digitalBadges?: string;
  eventsParticipated?: string;
  additionalNotes?: string;
  bio?: string; // Legacy / Vision field

  // Consent & Audit
  consentGiven?: boolean;
  consentText?: string;

  customAnswers?: Record<string, any>; // Dynamic question answers keyed by question ID
  formToken?: string; // Unique token (maintained for backward compatibility)
  formTokenExpiresAt?: string;
  formSubmitted: boolean;
  formSubmittedAt?: string;
  status: 'Active' | 'Invited' | 'Pending' | 'Inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberRecord = FoundingMember;

export interface FoundingMemberFormData {
  fullName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  university: string;
  courseBranch: string;
  yearSemester: string;
  studentId: string;
  memberRole?: string;
  domain: string;
  designation?: string;
  memberId?: string;
  dateOfJoining?: string;
  membershipStatus?: string;
  skills: string;
  interests?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  speakerRoleType?: string;
  speakingExperience?: string;
  demoVideoUrl?: string;
  speakingTopics?: string;
  languages?: string;
  eventAvailability?: string;
  previousExperience?: string;
  contributionAreas?: string;
  assignedResponsibilities?: string;
  majorAchievements?: string;
  experience?: string;
  certifications?: string;
  digitalBadges?: string;
  eventsParticipated?: string;
  additionalNotes?: string;
  bio?: string;
  consent?: boolean;
  customAnswers?: Record<string, any>;
}

export interface FoundingMemberPublicProfile {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  domain?: string;
  role?: string;
  memberRole?: string;
  designation?: string;
  photoUrl?: string;
  formSubmitted: boolean;
  formSubmittedAt?: string;
  existingData?: Partial<FoundingMemberFormData>;
}


