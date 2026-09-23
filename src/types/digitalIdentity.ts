export type DigitalIdType =
  | 'Founding Member'
  | 'Core Team'
  | 'Anchor & Speaker'
  | 'Other';

export type DigitalIdStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface DigitalIdentity {
  id: string; // Internal unique ID (UUID or slug)
  publicId: string; // Permanent professional public ID (e.g. FMB-CUUP-001, CT-CUUP-014, AS-CUUP-002, DID-CUUP-005)
  memberType: DigitalIdType;
  fullName: string;
  photoUrl: string; // Validated data URL or secure image link
  role: string; // Position / Role (e.g. Community Lead, Technical Associate)
  domain?: string; // Optional domain (e.g. Cloud & Infrastructure, AI/ML, DevOps)
  university?: string; // Default: 'Chandigarh University – Uttar Pradesh'
  course?: string; // Optional course (e.g. B.Tech)
  branch?: string; // Optional branch (e.g. CSE)
  department?: string; // Optional department/branch alias
  currentYear?: string; // Optional year (e.g. 2nd Year)
  yearOrBatch?: string; // Optional year/batch alias
  email?: string;
  linkedin?: string;
  skills?: string[];
  joiningDate?: string;
  additionalInformation?: string;
  status: DigitalIdStatus;
  verificationToken?: string; // Cryptographic reference token
  issuedAt: string; // ISO string
  updatedAt: string; // ISO string
  suspendedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  revokedBy?: string;
  sourceType?: string; // Optional integration link (e.g. 'founding_member', 'core_team')
  sourceRecordId?: string; // Optional integration source ID
  createdAt: string;
}

export interface VerificationLog {
  id: string;
  digitalId: string;
  timestamp: string;
  result: 'VERIFIED' | 'SUSPENDED' | 'REVOKED' | 'NOT_FOUND';
  ip?: string;
  deviceType?: string;
  browser?: string;
}

export interface DigitalIdStats {
  total: number;
  active: number;
  suspended: number;
  revoked: number;
  recentlyIssued: DigitalIdentity[];
}

export interface DigitalIdFormData {
  fullName: string;
  photoUrl?: string;
  memberType: DigitalIdType;
  role: string;
  domain?: string;
  university?: string;
  course?: string;
  branch?: string;
  department?: string;
  currentYear?: string;
  yearOrBatch?: string;
  email?: string;
  linkedin?: string;
  skills?: string[] | string;
  joiningDate?: string;
  additionalInformation?: string;
}
