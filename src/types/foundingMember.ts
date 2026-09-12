export interface FoundingMember {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  university?: string;
  courseBranch?: string; // Course/Branch
  course?: string;
  yearSemester?: string; // Year/Semester
  studentId?: string; // Roll Number / Student ID
  photoUrl?: string; // Profile Photo URL / base64
  linkedin?: string;
  github?: string;
  portfolio?: string;
  domain?: string; // Domain / Area
  role?: string; // Role e.g. Founding Member
  skills?: string; // Skills description or comma-separated
  experience?: string; // Experience & contributions
  bio?: string; // Other relevant info
  formToken: string; // Unique secure token for the form link
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
}

export interface FoundingMemberPublicProfile {
  id: string;
  fullName: string;
  email: string;
  domain?: string;
  role?: string;
  formSubmitted: boolean;
  formSubmittedAt?: string;
  existingData?: Partial<FoundingMemberFormData>;
}
