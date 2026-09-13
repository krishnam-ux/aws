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
  step?: number; // Step number in multi-step form (1-4)
  order: number;
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
  courseBranch?: string; // Course/Branch
  course?: string;
  yearSemester?: string; // Year/Semester
  studentId?: string; // Roll Number / Student ID (UID)
  photoUrl?: string; // Profile Photo URL / base64
  linkedin?: string;
  github?: string;
  portfolio?: string;
  domain?: string; // Domain / Area of Focus
  role?: string; // Role e.g. Founding Member
  skills?: string; // Skills description or comma-separated
  experience?: string; // Experience & contributions
  bio?: string; // Other relevant info / vision
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

export interface FoundingMemberFormData {
  fullName: string;
  email: string;
  phone: string;
  university: string;
  courseBranch: string;
  yearSemester: string;
  studentId: string;
  photoUrl?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  domain: string;
  skills: string;
  experience: string;
  bio?: string;
  customAnswers?: Record<string, any>;
}

export interface FoundingMemberPublicProfile {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  domain?: string;
  role?: string;
  formSubmitted: boolean;
  formSubmittedAt?: string;
  existingData?: Partial<FoundingMemberFormData>;
}

