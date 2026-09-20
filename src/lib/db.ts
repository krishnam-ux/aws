import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import postgres from 'postgres';
import { normalizeOpportunityApplication } from './opportunityApplication';

const DB_DIR = path.join(process.cwd(), 'src', 'data', 'db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Helper to hash password with salt
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

const IS_NETLIFY = process.env.NETLIFY === 'true' || !!process.env.NETLIFY_DEV || !!process.env.SITE_ID;

// Helper to get Netlify Blobs store
async function getBlobStore() {
  if (IS_NETLIFY) {
    try {
      const { getStore } = await import('@netlify/blobs');
      return getStore('awssbg-db');
    } catch (e) {
      console.error('Failed to import @netlify/blobs:', e);
    }
  }
  return null;
}

export function getPostgresCandidates(): string[] {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL_NO_SSL,
  ].filter((value): value is string => 
    typeof value === 'string' && 
    value.trim().length > 0 && 
    value.trim() !== '[SENSITIVE]'
  );
}

export function hasConfiguredDatabase(): boolean {
  return getPostgresCandidates().length > 0;
}

function requireDatabaseAvailability(): void {
  if (hasConfiguredDatabase() && !sql) {
    throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
  }
}

// PostgreSQL integration
let sql: any = null;
const postgresCandidates = getPostgresCandidates();

for (const connectionString of postgresCandidates) {
  try {
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30
    });
    break;
  } catch (err) {
    console.error(`Failed to initialize postgres client with candidate ${connectionString.slice(0, 24)}...:`, err);
    sql = null;
  }
}

if (!sql && postgresCandidates.length > 0) {
  console.warn('No valid PostgreSQL connection string could be initialized. Falling back to JSON storage.');
}

async function ensurePostgresTable() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `;
    await ensureExamsTables();
    await ensureEmailTables();
  } catch (err) {
    console.error('Failed to ensure kv_store table exists in PostgreSQL:', err);
  }
}

async function ensureEmailTables() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id VARCHAR(255) PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        subject VARCHAR(500) NOT NULL,
        type VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE,
        provider_id VARCHAR(255),
        error_message TEXT,
        triggered_by VARCHAR(255) NOT NULL,
        admin_id VARCHAR(255),
        template_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at)`;

    await sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT NOT NULL,
        variables JSONB NOT NULL DEFAULT '[]'::jsonb,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type)`;

    await sql`
      CREATE TABLE IF NOT EXISTS email_automation_settings (
        id VARCHAR(255) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        event_type VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        default_template_id VARCHAR(255),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_automation_event_type ON email_automation_settings(event_type)`;
  } catch (err) {
    console.error('Failed to ensure email tables exist in PostgreSQL:', err);
  }
}

async function ensureExamsTables() {
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(255) PRIMARY KEY,
        exam_code VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255),
        duration_minutes INTEGER NOT NULL,
        passing_percentage INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'Live',
        password VARCHAR(255),
        require_secure_browser BOOLEAN NOT NULL DEFAULT true,
        max_security_violations INTEGER NOT NULL DEFAULT 3,
        questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_exams_code ON exams(exam_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status)`;

    await sql`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id VARCHAR(255) PRIMARY KEY,
        exam_id VARCHAR(255) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        roll_number VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        session_token VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'LOCKED',
        started_at TIMESTAMP WITH TIME ZONE,
        submitted_at TIMESTAMP WITH TIME ZONE,
        extended_minutes INTEGER NOT NULL DEFAULT 0,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        marked_for_review JSONB NOT NULL DEFAULT '[]'::jsonb,
        score INTEGER NOT NULL DEFAULT 0,
        total_marks INTEGER NOT NULL DEFAULT 0,
        percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        passed BOOLEAN NOT NULL DEFAULT false,
        submission_reason VARCHAR(100),
        security_violations_count INTEGER NOT NULL DEFAULT 0,
        verified_by VARCHAR(255),
        verified_at TIMESTAMP WITH TIME ZONE,
        unlocked_by VARCHAR(255),
        unlocked_at TIMESTAMP WITH TIME ZONE,
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_roll_number ON exam_attempts(roll_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_session_token ON exam_attempts(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status)`;

    await sql`
      CREATE TABLE IF NOT EXISTS exam_security_logs (
        id VARCHAR(255) PRIMARY KEY,
        attempt_id VARCHAR(255) NOT NULL,
        exam_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_security_logs_attempt ON exam_security_logs(attempt_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_security_logs_exam ON exam_security_logs(exam_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS exam_audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        exam_id VARCHAR(255) NOT NULL,
        attempt_id VARCHAR(255),
        admin_user VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_exam_audit_logs_exam ON exam_audit_logs(exam_id)`;
  } catch (err) {
    console.error('Failed to ensure exam tables exist in PostgreSQL:', err);
  }
}


async function ensureRegistrationsTable() {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    await sql`
      CREATE TABLE IF NOT EXISTS registrations (
        id VARCHAR(255) PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        university VARCHAR(255) NOT NULL,
        program VARCHAR(255) NOT NULL,
        year VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        interests TEXT NOT NULL,
        experience_level VARCHAR(255) NOT NULL,
        linkedin VARCHAR(255) NOT NULL,
        github VARCHAR(255) NOT NULL,
        motivation TEXT NOT NULL,
        consent BOOLEAN NOT NULL,
        status VARCHAR(255) NOT NULL DEFAULT 'New',
        attendance VARCHAR(50) NOT NULL DEFAULT 'Registered',
        certificate_id VARCHAR(255),
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendance VARCHAR(50) NOT NULL DEFAULT 'Registered'`;
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS certificate_id VARCHAR(255)`;
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`;

    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_attendance ON registrations(attendance)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_certificate_id ON registrations(certificate_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at)`;
    
    // Run migration checks
    await migrateRegistrationsToPostgres();
  } catch (err) {
    console.error('Failed to ensure registrations table exists in PostgreSQL:', err);
  }
}

async function ensureFeedbackTable() {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    await sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(255) PRIMARY KEY,
        event_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        university VARCHAR(255),
        rating INTEGER NOT NULL,
        experience VARCHAR(100),
        feedback TEXT NOT NULL,
        liked TEXT,
        improvements TEXT,
        recommendation VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'New',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_event_id ON feedback(event_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)`;
  } catch (err) {
    console.error('Failed to ensure feedback table exists in PostgreSQL:', err);
  }
}

async function ensureCareersTable() {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    await sql`
      CREATE TABLE IF NOT EXISTS careers (
        id VARCHAR(255) PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        organization_name VARCHAR(255) NOT NULL,
        organization_logo TEXT,
        opportunity_type VARCHAR(80) NOT NULL,
        location VARCHAR(255) NOT NULL,
        work_mode VARCHAR(50) NOT NULL,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        responsibilities TEXT,
        required_skills TEXT,
        preferred_skills TEXT,
        eligibility TEXT,
        benefits TEXT,
        additional_information TEXT,
        application_deadline TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        published BOOLEAN NOT NULL DEFAULT false,
        internal_applications BOOLEAN NOT NULL DEFAULT true,
        application_link TEXT,
        max_applications INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_careers_slug ON careers(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_careers_status ON careers(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_careers_published ON careers(published)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_careers_deadline ON careers(application_deadline)`;
  } catch (err) {
    console.error('Failed to ensure careers table exists in PostgreSQL:', err);
  }
}

async function ensureCareerApplicationsTable() {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    await sql`
      CREATE TABLE IF NOT EXISTS career_applications (
        id VARCHAR(255) PRIMARY KEY,
        opportunity_id VARCHAR(255) NOT NULL,
        opportunity_slug VARCHAR(255),
        form_type VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        personal_email VARCHAR(255),
        phone VARCHAR(255),
        university VARCHAR(255),
        program VARCHAR(255),
        department VARCHAR(255),
        branch VARCHAR(255),
        current_year VARCHAR(50),
        graduation_year VARCHAR(50),
        student_id VARCHAR(255),
        roll_number VARCHAR(255),
        resume_url TEXT,
        introduction_video_url TEXT,
        video_url TEXT,
        linkedin VARCHAR(255),
        github VARCHAR(255),
        portfolio VARCHAR(255),
        preferred_domain VARCHAR(255),
        preferred_role VARCHAR(255),
        skills TEXT,
        primary_skill_level VARCHAR(100),
        experience TEXT,
        previous_experience TEXT,
        role_and_impact TEXT,
        exact_responsibility TEXT,
        teamwork_situation TEXT,
        leadership_experience VARCHAR(50),
        leadership_details TEXT,
        why_founding_member TEXT,
        why_core_team TEXT,
        personal_contribution TEXT,
        domain_contribution TEXT,
        community_growth_ideas TEXT,
        scenario_answer TEXT,
        scenario_drop_participation TEXT,
        scenario_unavailable_members TEXT,
        availability_hours VARCHAR(100),
        consistent_contribution VARCHAR(100),
        contribution_duration VARCHAR(100),
        academic_balance TEXT,
        available_days VARCHAR(255),
        active_participation VARCHAR(100),
        involvement_duration VARCHAR(100),
        motivation TEXT,
        cover_letter TEXT,
        additional_information TEXT,
        consent BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'New',
        admin_notes TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS opportunity_slug VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS form_type VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS department VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS branch VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS current_year VARCHAR(50)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS roll_number VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS preferred_domain VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS preferred_role VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS skills TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS primary_skill_level VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS experience TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS previous_experience TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS role_and_impact TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS exact_responsibility TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS teamwork_situation TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS leadership_experience VARCHAR(50)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS leadership_details TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS why_founding_member TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS why_core_team TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS personal_contribution TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS domain_contribution TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS community_growth_ideas TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS scenario_answer TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS scenario_drop_participation TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS scenario_unavailable_members TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS availability_hours VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS consistent_contribution VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS contribution_duration VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS academic_balance TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS available_days VARCHAR(255)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS active_participation VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS involvement_duration VARCHAR(100)`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS introduction_video_url TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS video_url TEXT`;
    await sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS details JSONB`;

    await sql`CREATE INDEX IF NOT EXISTS idx_career_applications_opportunity_id ON career_applications(opportunity_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_career_applications_email ON career_applications(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_career_applications_status ON career_applications(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_career_applications_created_at ON career_applications(created_at)`;
  } catch (err) {
    console.error('Failed to ensure career applications table exists in PostgreSQL:', err);
  }
}

async function ensureCertificatesTable() {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    await sql`
      CREATE TABLE IF NOT EXISTS certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        certificate_id VARCHAR(255) NOT NULL UNIQUE,
        event_id VARCHAR(255) NOT NULL,
        registration_id VARCHAR(255) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        event_date VARCHAR(255),
        venue VARCHAR(255),
        issue_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Valid',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_certificates_registration_id ON certificates(registration_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_certificates_certificate_id ON certificates(certificate_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at)`;
  } catch (err) {
    console.error('Failed to ensure certificates table exists in PostgreSQL:', err);
  }
}

async function migrateRegistrationsToPostgres() {
  if (!sql) return;
  try {
    const oldRows = await sql`
      SELECT value FROM kv_store WHERE key = 'event_registrations.json'
    `;
    if (!oldRows || oldRows.length === 0) {
      return;
    }

    const oldData = JSON.parse(oldRows[0].value);
    if (!Array.isArray(oldData) || oldData.length === 0) {
      return;
    }

    console.log(`Migration: Found ${oldData.length} registrations in event_registrations.json to migrate.`);

    const existingRows = await sql`
      SELECT id FROM registrations
    `;
    const existingIds = new Set(existingRows.map((r: any) => r.id));

    let migratedCount = 0;
    for (const reg of oldData) {
      if (existingIds.has(reg.id)) {
        continue;
      }
      
      const interestsStr = Array.isArray(reg.interests) ? JSON.stringify(reg.interests) : JSON.stringify([reg.interests]);
      const emailVal = reg.email || reg.emailAddress || '';
      
      await sql`
        INSERT INTO registrations (
          id, event_id, name, email, phone, university, program, year, student_id,
          interests, experience_level, linkedin, github, motivation, consent,
          status, notes, created_at
        ) VALUES (
          ${reg.id}, ${reg.eventId || reg.event_id}, ${reg.name}, ${emailVal}, ${reg.phone || ''},
          ${reg.university}, ${reg.program}, ${reg.year}, ${reg.studentId || reg.student_id || ''},
          ${interestsStr}, ${reg.experienceLevel || 'Beginner'}, ${reg.linkedin || ''},
          ${reg.github || ''}, ${reg.motivation || ''}, ${!!reg.consent},
          ${reg.status || 'New'}, ${reg.notes || ''}, ${reg.date || reg.created_at || new Date().toISOString()}
        )
      `;
      migratedCount++;
    }

    if (migratedCount > 0) {
      console.log(`Migration: Successfully imported ${migratedCount} registrations into the registrations table.`);
    }
  } catch (err) {
    console.error('Migration error in migrateRegistrationsToPostgres:', err);
  }
}

async function readPostgres<T>(filename: string, defaultValue: T): Promise<T> {
  if (!sql) return defaultValue;
  try {
    await ensurePostgresTable();
    const rows = await sql`
      SELECT value FROM kv_store WHERE key = ${filename}
    `;
    if (rows && rows.length > 0) {
      return JSON.parse(rows[0].value) as T;
    }
  } catch (err) {
    console.error(`Postgres error reading key ${filename}:`, err);
  }
  return defaultValue;
}

async function writePostgres<T>(filename: string, data: T): Promise<void> {
  if (!sql) return;
  try {
    await ensurePostgresTable();
    const strValue = JSON.stringify(data);
    await sql`
      INSERT INTO kv_store (key, value)
      VALUES (${filename}, ${strValue})
      ON CONFLICT (key)
      DO UPDATE SET value = ${strValue}
    `;
  } catch (err) {
    console.error(`Postgres error writing key ${filename}:`, err);
  }
}

// Vercel KV integration
async function readKv<T>(filename: string, defaultValue: T): Promise<T> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return defaultValue;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', filename]),
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result) {
        return JSON.parse(data.result) as T;
      }
    } else {
      console.error(`Vercel KV GET error for ${filename}:`, await res.text());
    }
  } catch (err) {
    console.error(`Vercel KV fetch error for ${filename}:`, err);
  }
  return defaultValue;
}

async function writeKv<T>(filename: string, data: T): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', filename, JSON.stringify(data)])
    });
    if (!res.ok) {
      console.error(`Vercel KV SET error for ${filename}:`, await res.text());
    }
  } catch (err) {
    console.error(`Vercel KV fetch error for ${filename}:`, err);
  }
}

// Memory cache to hide eventual consistency latency in production/serverless environments
const memoryDbCache: Record<string, { data: any; expiresAt: number }> = {};
const CACHE_TTL_MS = 5000; // 5 seconds cache TTL

function isRealtimeCollection(filename: string): boolean {
  return (
    filename === 'exams.json' ||
    filename === 'exam_attempts.json' ||
    filename === 'exam_security_logs.json' ||
    filename === 'exam_audit_logs.json' ||
    filename === 'email_logs.json' ||
    filename === 'email_templates.json' ||
    filename === 'email_automation_settings.json' ||
    filename === 'founding_members.json' ||
    filename === 'founding_member_form_config.json'
  );
}

function invalidateMemoryCache(filename: string): void {
  delete memoryDbCache[filename];
}

const collectionLocks: Record<string, Promise<any>> = {};

function withCollectionLock<T>(collection: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = collectionLocks[collection] || Promise.resolve();
  const nextLock = currentLock.then(() => fn(), () => fn());
  collectionLocks[collection] = nextLock;
  return nextLock;
}

// Generic read/write functions
async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  if (hasConfiguredDatabase() && !sql) {
    throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
  }

  // Fast memory cache check
  const cached = memoryDbCache[filename];
  if (cached !== undefined && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  // 1. Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const val = await readKv(filename, defaultValue);
    memoryDbCache[filename] = {
      data: val,
      expiresAt: Date.now() + CACHE_TTL_MS
    };
    return val;
  }

  // 2. Try PostgreSQL
  if (hasConfiguredDatabase()) {
    if (!sql) {
      console.warn(`A PostgreSQL connection string is configured but the PG client is unavailable for ${filename}; falling back to local JSON storage.`);
    } else {
      try {
        const val = await readPostgres(filename, defaultValue);
        memoryDbCache[filename] = {
          data: val,
          expiresAt: Date.now() + CACHE_TTL_MS
        };
        return val;
      } catch (err) {
        console.error(`PostgreSQL read failed for ${filename}:`, err);
      }
    }
  }

  // 3. Try Netlify Blobs
  if (IS_NETLIFY) {
    const store = await getBlobStore();
    if (store) {
      try {
        const val = await store.get(filename, { type: 'text' });
        if (val) {
          const parsed = JSON.parse(val) as T;
          memoryDbCache[filename] = {
            data: parsed,
            expiresAt: Date.now() + CACHE_TTL_MS
          };
          return parsed;
        }
      } catch (err) {
        console.error(`Error reading from blob: ${filename}`, err);
      }
    }
  }

  // 4. Local file fallback only when no database backend is configured.
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    if (memoryDbCache[filename]?.data) return memoryDbCache[filename].data as T;
    await writeJsonFile(filename, defaultValue);
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!data || !data.trim()) {
      if (memoryDbCache[filename]?.data) return memoryDbCache[filename].data as T;
      return defaultValue;
    }
    const parsed = JSON.parse(data) as T;
    memoryDbCache[filename] = {
      data: parsed,
      expiresAt: Date.now() + CACHE_TTL_MS
    };
    return parsed;
  } catch (err) {
    if (memoryDbCache[filename]?.data) {
      return memoryDbCache[filename].data as T;
    }
    console.error(`Error reading database file: ${filename}`, err);
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  if (hasConfiguredDatabase() && !sql) {
    throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
  }

  // Immediately update in-memory cache to guarantee sequential read consistency
  memoryDbCache[filename] = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  // 1. Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    await writeKv(filename, data);
    return;
  }

  // 2. Try PostgreSQL
  if (hasConfiguredDatabase()) {
    if (!sql) {
      console.warn(`A PostgreSQL connection string is configured but the PG client is unavailable for ${filename}; falling back to local JSON storage.`);
    } else {
      try {
        await writePostgres(filename, data);
        return;
      } catch (err) {
        console.error(`PostgreSQL write failed for ${filename}:`, err);
      }
    }
  }

  // 3. Try Netlify Blobs
  if (IS_NETLIFY) {
    const store = await getBlobStore();
    if (store) {
      try {
        await store.set(filename, JSON.stringify(data, null, 2));
        return;
      } catch (err) {
        console.error(`Error writing to blob: ${filename}`, err);
      }
    }
  }

  // 4. Local file fallback - non-blocking async write
  const filePath = path.join(DB_DIR, filename);
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.error(`Error writing database file: ${filename}`, err);
  }
}

// Initial/default configurations
const DEFAULT_ADMINS = () => {
  const salt = generateSalt();
  const passwordHash = hashPassword('awssbgadmin123', salt);
  return [
    {
      username: 'awsadmin@culko.in',
      salt,
      passwordHash
    }
  ];
};

const DEFAULT_EVENTS = [
  {
    id: 'event-01',
    number: 'Event 01',
    month: 'August',
    title: 'AWS Student Builder Group Inauguration & Cloud Kickstart',
    focus: 'Community Launch, Cloud Computing, AWS Fundamentals, Live Demo',
    outcome: 'Students understand cloud fundamentals, join the community, and create an AWS Skill Builder account.',
    overview: 'The official launch event introducing students to the AWS Student Builder Group community and exploring the path to cloud learning.',
    format: 'Community Inaugural & Keynote Kickstart',
    whatYouWillLearn: [
      'AWS Student Builder Group vision and local roadmap',
      'Introduction to the global AWS Cloud ecosystem',
      'Getting started with AWS Skill Builder learning resources',
      'Setting up your cloud learning dashboard'
    ],
    status: 'Upcoming',
    date: 'August 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'Vishnu Rachapudi',
    attendees: 80,
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  },
  {
    id: 'event-02',
    number: 'Event 02',
    month: 'September',
    title: 'AWS Core Services Workshop',
    focus: 'IAM, EC2, S3, AWS Console, Static Website Hosting',
    outcome: 'Students deploy their first static website on AWS and understand core AWS services.',
    overview: 'A hands-on technical workshop focused on the core AWS infrastructure components and console administration.',
    format: 'Hands-on Technical Workshop',
    whatYouWillLearn: [
      'Designing virtual compute instances with Amazon EC2',
      'Setting up secure storage containers using Amazon S3',
      'Deploying a static web application to public endpoints',
      'Implementing Identity Access Management (IAM) permissions'
    ],
    status: 'Upcoming',
    date: 'September 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  },
  {
    id: 'event-03',
    number: 'Event 03',
    month: 'November',
    title: 'Build with AI on AWS',
    focus: 'Generative AI, Amazon Bedrock, Amazon Q, Prompt Engineering',
    outcome: 'Students build a simple AI-powered application and understand AI services on AWS.',
    overview: 'An introductory session on deploying artificial intelligence workloads using Amazon Bedrock and AWS AI tools.',
    format: 'Guided Lab & Technical Session',
    whatYouWillLearn: [
      'Foundations of Generative AI on AWS architecture',
      'Exploring model endpoint scaling with Amazon Bedrock',
      'Automating developer workflows using Amazon Q assistants',
      'Designing efficient prompt workflows for foundation models'
    ],
    status: 'Upcoming',
    date: 'November 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  },
  {
    id: 'event-04',
    number: 'Event 04',
    month: 'January',
    title: 'Build Modern Applications with AWS (Serverless)',
    focus: 'AWS Lambda, API Gateway, S3 Events, Event-Driven Architecture',
    outcome: 'Students create their first serverless application and learn modern cloud architecture.',
    overview: 'Deploying event-driven serverless architectures to handle dynamic web APIs without server management.',
    format: 'Developer Build Session',
    whatYouWillLearn: [
      'Writing serverless microservices inside AWS Lambda',
      'Designing API routes using Amazon API Gateway endpoints',
      'Triggering functions from Amazon S3 storage events',
      'Scaling database connections under event-driven architectures'
    ],
    status: 'Upcoming',
    date: 'January 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  },
  {
    id: 'event-05',
    number: 'Event 05',
    month: 'February',
    title: 'AWS Cloud Practitioner Certification Workshop & Mock Exam',
    focus: 'Certification Strategy, AWS Service Revision, Mock Test, Career Guidance',
    outcome: 'Students assess their certification readiness and create a structured learning plan.',
    overview: 'A guided exam readiness cohort covering AWS security, core services, support tiers, and pricing models.',
    format: 'Certification Preparation & Mock Review',
    whatYouWillLearn: [
      'Detailed breakdown of the AWS Certified Cloud Practitioner domains revision',
      'Revising VPC structures, security groups, and billing models revision',
      'Attempting mock questions and reviewing incorrect answers revision',
      'Career guidance and certification discount strategies revision'
    ],
    status: 'Upcoming',
    date: 'February 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  },
  {
    id: 'event-06',
    number: 'Event 06',
    month: 'April',
    title: 'AWS Buildathon',
    focus: 'Team-Based Innovation, AWS Services, AI, Cloud Solutions, Project Presentation',
    outcome: 'Students build and present a real-world cloud solution using AWS services.',
    overview: 'A team hackathon where students collaborate to design, develop, and present cloud-based prototypes.',
    format: 'Team Innovation Hackathon',
    whatYouWillLearn: [
      'Architecting cloud-native solutions in response to real-world prompts',
      'Integrating AWS databases, AI, and backend services under time constraints',
      'Working in cross-functional student engineering teams',
      'Presenting architectural diagrams to peer panels'
    ],
    status: 'Upcoming',
    date: 'April 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: '',
    registrationStatus: 'Open',
    maxRegistrations: -1
  }
];

const DEFAULT_OPPORTUNITIES = [
  {
    id: 'opp-core-members',
    slug: 'founding-core-members-aws-student-builder-group',
    title: 'Founding Core Members — AWS Student Builder Group',
    organizationName: 'AWS Student Builder Group',
    organizationLogo: '',
    opportunityType: 'Leadership',
    location: 'Chandigarh University – Uttar Pradesh',
    workMode: 'Hybrid',
    shortDescription: 'Students who want to contribute to and help build the campus cloud and technology community can apply to become founding core members.',
    description: 'Due to an overwhelming number of requests from students who missed the initial deadline, the application opportunity for Founding Core Members of the AWS Student Builder Group is being reopened. Encourage students who want to contribute to and help build the campus cloud and technology community to apply.',
    responsibilities: 'Support event planning and execution\nCoordinate student outreach and onboarding\nHelp build community initiatives and collaboration opportunities\nAssist with technical workshops and volunteer operations',
    requiredSkills: 'Leadership potential\nCommunication and teamwork\nInterest in cloud, AI, and student community building\nWillingness to contribute time and ideas',
    preferredSkills: 'Event coordination\nDesign, content, or technical support\nPublic speaking and community engagement',
    eligibility: 'Open to current students of Chandigarh University – Uttar Pradesh\nStrong interest in cloud, technology, and community building\nMust be willing to contribute actively',
    benefits: '🎤 Real Event Hosting & Speaking Experience\n🗣️ Improve Public Speaking & Communication Skills\n🚀 Build Leadership & Confidence\n🤝 Networking Opportunities with Students & Industry Speakers\n🏆 Exciting Prizes & Recognition for Outstanding Contributions\n🎁 Gifts & Community Rewards\n💼 Potential Internship & Career Opportunities based on performance and eligibility\n📜 Certificates & Recognition for active contribution\n🌐 Opportunity to represent and contribute to AWS Student Builder Group events\n💡 Platform to showcase your skills, ideas, and talent',
    additionalInformation: 'This opportunity is designed for students eager to contribute to a growing student-led technology community. Applications are open for a limited time and will be reviewed by the organizing team.',
    applicationDeadline: '2026-08-25T23:59:59.000Z',
    status: 'Open',
    published: true,
    internalApplications: true,
    applicationLink: '',
    maxApplications: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_CORE_TEAM = [
  {
    id: 'team-krishnam',
    name: 'Krishnam Dwivedi',
    email: 'krishnamdwivedi17@gmail.com',
    role: 'Technical Lead, Cloud & Infrastructure',
    domain: 'Cloud & Infrastructure',
    bio: 'Manages core cloud repositories, VPC infrastructures, server deployment environments, and local builder laboratories.',
    initials: 'KD',
    displayOrder: 1,
    status: 'Published'
  },
  {
    id: 'team-ayush',
    name: 'Ayush Pandey',
    email: 'ayush@culko.in',
    role: 'Events & Operations Lead',
    domain: 'Events & Operations',
    bio: 'Coordinates event registration clearances, technical workshop layouts, logistics schedules, and local project mock reviews.',
    initials: 'AP',
    displayOrder: 2,
    status: 'Published'
  },
  {
    id: 'team-priyanshu',
    name: 'Priyanshu Kumar',
    email: 'priyanshu@culko.in',
    role: 'Marketing & Community Outreach Lead',
    domain: 'Marketing & Community Outreach',
    bio: 'Manages outreach communications, educational platform partners, panel liaison schedules, and student enrollment pipelines.',
    initials: 'PK',
    displayOrder: 3,
    status: 'Published'
  },
  {
    id: 'team-aakarshan',
    name: 'Aakarshan Agnihotri',
    email: 'aakarshan@culko.in',
    role: 'Content & Documentation Lead',
    domain: 'Content & Documentation',
    bio: 'Drafts learning resource listings, event slide repositories, documentation templates, and official community logs.',
    initials: 'AA',
    displayOrder: 4,
    status: 'Published'
  },
  {
    id: 'team-ananya',
    name: 'Ananya Shukla',
    email: 'ananya@culko.in',
    role: 'Design & Creative Lead',
    domain: 'Design & Creative',
    bio: 'Reviews website interface styles, community visuals, event presentation layouts, and branding design systems.',
    initials: 'AS',
    displayOrder: 5,
    status: 'Published'
  }
];

const DEFAULT_CONTENT = {
  heroTitle: 'Build. Learn. Explore.',
  heroSubtitle: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
  heroDescription: 'A student-led technology community focused on cloud computing, artificial intelligence, data, DevOps and hands-on technology learning.',
  aboutHeading: 'Learn. Build. Collaborate.',
  aboutDescription: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh is a student-led technology community focused on learning, experimentation, collaboration and project building across cloud computing, artificial intelligence, data, DevOps and emerging technologies.'
};

const DEFAULT_EXAMS = [
  {
    id: 'exam-aws-ccp-01',
    examCode: 'AWS-CCP-01',
    password: 'builder-cloud-2026',
    title: 'AWS Certified Cloud Practitioner Assessment',
    description: 'Comprehensive foundational certification mock examination assessing core AWS cloud architecture, security, billing models, compute, storage, and networking.',
    category: 'Cloud Foundations',
    durationMinutes: 30,
    passingPercentage: 70,
    maxAttempts: 2,
    status: 'Live',
    requireSecureBrowser: true,
    maxSecurityViolations: 3,
    questions: [
      {
        id: 'q-01',
        question: 'Under the AWS Shared Responsibility Model, which of the following is the customer responsible for managing?',
        options: [
          'Physical security of data center facilities',
          'Customer data encryption and IAM user access permissions',
          'Hypervisor patch management',
          'Decommissioning of failed physical storage drives'
        ],
        correctOptionIndex: 1,
        marks: 10,
        explanation: 'Customers are responsible for security IN the cloud, including data encryption, identity access management, and OS configurations.'
      },
      {
        id: 'q-02',
        question: 'Which AWS service provides low-latency content delivery worldwide through a global network of edge locations?',
        options: [
          'Amazon CloudFront',
          'AWS Direct Connect',
          'Amazon Route 53',
          'AWS Global Accelerator'
        ],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'Amazon CloudFront is a fast Content Delivery Network (CDN) service that securely delivers data, videos, and APIs via edge locations.'
      },
      {
        id: 'q-03',
        question: 'Which AWS storage service provides object storage with virtually unlimited scalability and 99.999999999% (11 9s) durability?',
        options: [
          'Amazon Elastic Block Store (EBS)',
          'Amazon Elastic File System (EFS)',
          'Amazon Simple Storage Service (S3)',
          'AWS Storage Gateway'
        ],
        correctOptionIndex: 2,
        marks: 10,
        explanation: 'Amazon S3 is an industry-leading object storage service offering 11 9s of data durability.'
      },
      {
        id: 'q-04',
        question: 'A builder needs to run application code in response to events without provisioning or managing servers. Which service should they choose?',
        options: [
          'Amazon EC2',
          'AWS Lambda',
          'AWS Elastic Beanstalk',
          'Amazon ECS'
        ],
        correctOptionIndex: 1,
        marks: 10,
        explanation: 'AWS Lambda lets you run code serverless in response to triggers without provisioning servers.'
      },
      {
        id: 'q-05',
        question: 'Which AWS service allows you to provision logically isolated virtual networks where you can launch AWS resources?',
        options: [
          'Amazon Virtual Private Cloud (VPC)',
          'AWS Direct Connect',
          'Amazon Route 53',
          'AWS VPN'
        ],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'Amazon VPC lets you launch AWS resources into a virtual network that you have defined with total control over IP ranges, subnets, and routing.'
      },
      {
        id: 'q-06',
        question: 'Which security principle recommends granting users only the minimum permissions necessary to perform their job tasks?',
        options: [
          'Principle of Defense in Depth',
          'Principle of Least Privilege',
          'Root Account Delegation',
          'Open Access Security Policy'
        ],
        correctOptionIndex: 1,
        marks: 10,
        explanation: 'Principle of Least Privilege is granting only the permissions required to complete the required task.'
      },
      {
        id: 'q-07',
        question: 'Which AWS pricing model offers significant discounts (up to 72%) in exchange for a committed term of 1 or 3 years of steady-state usage?',
        options: [
          'On-Demand Instances',
          'Spot Instances',
          'Savings Plans & Reserved Instances',
          'Dedicated Hosts on Demand'
        ],
        correctOptionIndex: 2,
        marks: 10,
        explanation: 'Savings Plans and Reserved Instances provide significant savings over On-Demand in exchange for a committed usage term.'
      },
      {
        id: 'q-08',
        question: 'Which AWS service enables developers to build and scale generative AI applications with foundation models from leading AI startups and Amazon?',
        options: [
          'Amazon Bedrock',
          'Amazon SageMaker Canvas',
          'AWS Rekognition',
          'Amazon Comprehend'
        ],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'Amazon Bedrock is a fully managed service that offers a choice of high-performing foundation models via a unified API.'
      },
      {
        id: 'q-09',
        question: 'Which monitoring and observability service collects operational metrics, logs, and triggers automated alarms across AWS resources?',
        options: [
          'AWS CloudTrail',
          'Amazon CloudWatch',
          'AWS Config',
          'AWS Trusted Advisor'
        ],
        correctOptionIndex: 1,
        marks: 10,
        explanation: 'Amazon CloudWatch monitors applications, responds to performance changes, and provides actionable insights.'
      },
      {
        id: 'q-10',
        question: 'Which pillar of the AWS Well-Architected Framework focuses on running workloads effectively, gaining insight into operations, and continuously improving processes?',
        options: [
          'Operational Excellence',
          'Security',
          'Reliability',
          'Performance Efficiency'
        ],
        correctOptionIndex: 0,
        marks: 10,
        explanation: 'The Operational Excellence pillar focuses on running and monitoring systems to deliver business value and continually improving processes.'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_WEEKLY_QUIZZES = [
  {
    id: 'quiz-aws-week-01',
    quizCode: 'AWS-WEEK-01',
    title: 'Weekly AWS Quiz #01',
    topic: 'Amazon S3 Storage Classes, Bucket Policies & CloudFront Edge Distribution',
    description: 'Post-session assessment on S3 storage tiering, lifecycle configurations, cross-region replication, and Amazon CloudFront CDN architecture.',
    sessionId: 'event-01',
    sessionTitle: 'Event 01 - AWS Student Builder Group Inauguration & Cloud Kickstart',
    scheduledDate: '2026-09-25',
    startTime: '10:00',
    endTime: '23:59',
    timezone: 'Asia/Kolkata',
    scheduledStartAt: new Date(Date.now() - 3600000).toISOString(),
    scheduledEndAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    availableFrom: new Date(Date.now() - 86400000).toISOString(),
    availableUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
    durationMinutes: 20,
    totalQuestionsToSelect: 20,
    passingPercentage: 60,
    maxAttempts: 1,
    status: 'Live',
    settings: {
      requireWebcam: true,
      requireMicrophone: true,
      requireFaceDetection: true,
      detectMultipleFaces: true,
      requireFullscreen: true,
      monitorFocus: true,
      noFaceThresholdSeconds: 6,
      multipleFacesThresholdSeconds: 4,
      cameraGracePeriodSeconds: 30,
      fullscreenGracePeriodSeconds: 15
    },
    questionBank: [
      {
        id: 'wq-01',
        question: 'Which Amazon S3 storage class provides millisecond retrieval latency for data accessed infrequently, without paying retrieval transition penalties of traditional archive tiers?',
        options: [
          'S3 Glacier Flexible Retrieval',
          'S3 Glacier Instant Retrieval',
          'S3 Glacier Deep Archive',
          'S3 Standard-Infrequent Access with 1-minute expedited retrieval'
        ],
        correctOptionIndex: 1,
        marks: 5,
        explanation: 'S3 Glacier Instant Retrieval delivers lowest cost storage for rarely accessed data that requires immediate retrieval in milliseconds.',
        topicTag: 'S3 Storage Classes'
      },
      {
        id: 'wq-02',
        question: 'What is a mandatory prerequisite on an Amazon S3 bucket before Cross-Region Replication (CRR) can be enabled?',
        options: [
          'Object Lock must be enabled in Governance mode',
          'Versioning must be explicitly enabled on both source and destination buckets',
          'Static website hosting must be enabled on both buckets',
          'SSE-C custom encryption keys must be configured on the destination bucket'
        ],
        correctOptionIndex: 1,
        marks: 5,
        explanation: 'Both the source and destination S3 buckets must have Versioning enabled for Replication (CRR/SRR) to function.',
        topicTag: 'S3 Replication'
      },
      {
        id: 'wq-03',
        question: 'Which Amazon CloudFront feature allows you to securely restrict access to an Amazon S3 origin bucket so that users cannot access S3 objects directly via S3 URLs?',
        options: [
          'Origin Access Control (OAC)',
          'AWS Shield Advanced DDoS bypass token',
          'CloudFront Key Groups with S3 bucket public IP whitelisting',
          'S3 Presigned Post credentials embedded in CloudFront response headers'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'Origin Access Control (OAC) is the recommended modern method to restrict access to S3 origins to only authorized CloudFront distributions.',
        topicTag: 'CloudFront Security'
      },
      {
        id: 'wq-04',
        question: 'An application needs to process lightweight HTTP request headers and URL rewrites at ultra-low latency (<1ms) across global CloudFront edge locations. Which solution is most cost-effective?',
        options: [
          'Lambda@Edge with Node.js runtime',
          'CloudFront Functions',
          'AWS Lambda behind an Application Load Balancer',
          'Amazon API Gateway regional edge endpoint'
        ],
        correctOptionIndex: 1,
        marks: 5,
        explanation: 'CloudFront Functions is an ultra-lightweight, sub-millisecond compute environment for simple header manipulations and URL rewrites executed across all CloudFront edge locations.',
        topicTag: 'CloudFront Functions'
      },
      {
        id: 'wq-05',
        question: 'Under Amazon S3 Object Lock, what is the key difference between Governance Mode and Compliance Mode?',
        options: [
          'Governance mode allows authorized IAM users with specific permissions to alter retention or delete the object; Compliance mode cannot be overridden by any user, including the root account',
          'Compliance mode requires multi-factor authentication for each read operation',
          'Governance mode only works on unversioned buckets',
          'Compliance mode deletes objects automatically after 30 days'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'In Governance mode, users with `s3:BypassGovernanceRetention` can override lock settings, whereas in Compliance mode, no user (not even AWS root) can delete the object until the retention period expires.',
        topicTag: 'S3 Object Lock'
      },
      {
        id: 'wq-06',
        question: 'When uploading large files (>100 MB to 5 TB) to Amazon S3, what mechanism should you use to maximize upload throughput, support pause/resume, and improve network resilience?',
        options: [
          'S3 Single-part PUT with chunked transfer encoding',
          'S3 Multipart Upload API',
          'S3 Batch Copy with byte-range headers',
          'Amazon Kinesis Data Firehose streaming directly into S3'
        ],
        correctOptionIndex: 1,
        marks: 5,
        explanation: 'The Multipart Upload API allows uploading single objects as a set of parts in parallel, recommended for objects greater than 100 MB.',
        topicTag: 'S3 Performance'
      },
      {
        id: 'wq-07',
        question: 'Which Amazon S3 feature automatically moves data between access tiers based on changing access patterns without operational overhead or retrieval fees?',
        options: [
          'S3 Intelligent-Tiering',
          'S3 Lifecycle Transition to Glacier Flexible',
          'S3 Storage Lens automated archiving',
          'AWS Glue Data Catalog compaction'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Intelligent-Tiering automatically optimizes storage costs by moving data across frequent, infrequent, and archive access tiers without retrieval fees.',
        topicTag: 'S3 Intelligent-Tiering'
      },
      {
        id: 'wq-08',
        question: 'A builder wants to grant a mobile client temporary, time-limited permission to download a private S3 object directly without creating IAM credentials for the client. What should they generate?',
        options: [
          'S3 Pre-signed URL',
          'STS Temporary Access Key in local storage',
          'IAM Instance Profile policy document',
          'S3 Bucket Access Point ARN'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'An S3 Pre-signed URL gives temporary read/write access to a specific object using the credentials of the creator, expiring after a configured duration.',
        topicTag: 'S3 Security'
      },
      {
        id: 'wq-09',
        question: 'Which destinations can receive real-time Amazon S3 Event Notifications directly when new objects are created in a bucket?',
        options: [
          'Amazon SNS topics, Amazon SQS queues, AWS Lambda functions, and Amazon EventBridge',
          'Only Amazon DynamoDB streams',
          'Only Amazon CloudWatch Logs log groups',
          'AWS Step Functions state machines directly without EventBridge'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 can publish event notifications directly to SNS topics, SQS queues, AWS Lambda functions, or to Amazon EventBridge for advanced routing.',
        topicTag: 'S3 Event Notifications'
      },
      {
        id: 'wq-10',
        question: 'How can you enforce that all objects uploaded to an S3 bucket are encrypted in transit via TLS/HTTPS?',
        options: [
          'Add a Bucket Policy with a Deny effect when `aws:SecureTransport` is false',
          'Enable S3 Transfer Acceleration on port 443 only',
          'Disable HTTP on the AWS VPC gateway endpoint',
          'Attach an IAM Role with `s3:RequireSSL` permission'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'A bucket policy with `"Effect": "Deny"`, `"Action": "s3:*"`, `"Condition": {"Bool": {"aws:SecureTransport": "false"}}` enforces HTTPS for all operations.',
        topicTag: 'S3 Security'
      },
      {
        id: 'wq-11',
        question: 'Which Amazon CloudFront feature provides fine-grained caching control by allowing headers, query strings, and cookies to be defined separately from origin request forwarding parameters?',
        options: [
          'CloudFront Cache Policies and Origin Request Policies',
          'CloudFront Invalidation batches',
          'CloudFront Field-Level Encryption profiles',
          'CloudFront Custom SSL SNI configurations'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'Cache Policies define what keys are included in the CloudFront cache key, while Origin Request Policies control what headers/cookies/query strings are forwarded to origin without diluting cache hit ratios.',
        topicTag: 'CloudFront Caching'
      },
      {
        id: 'wq-12',
        question: 'What happens when a user requests the deletion of a specific object version in an S3 Versioning-enabled bucket without specifying a Version ID?',
        options: [
          'Amazon S3 inserts a Delete Marker, which becomes the current version of the object',
          'All historical versions of the object are permanently erased',
          'The request is rejected with a 403 Access Denied error',
          'The oldest version of the object is removed from storage'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'When deleting without a Version ID in a versioned bucket, S3 places a Delete Marker on top of the version stack. Specifying the exact Version ID permanently removes that specific version.',
        topicTag: 'S3 Versioning'
      },
      {
        id: 'wq-13',
        question: 'Which S3 server-side encryption mechanism uses customer-managed keys stored in AWS KMS, providing an audit trail in AWS CloudTrail for every key decryption call?',
        options: [
          'SSE-KMS (Server-Side Encryption with AWS Key Management Service)',
          'SSE-S3 (Server-Side Encryption with Amazon S3 Managed Keys)',
          'SSE-C (Server-Side Encryption with Customer-Provided Keys)',
          'Client-side RSA public key encryption'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'SSE-KMS encrypts data using AWS KMS keys and logs key usage events to AWS CloudTrail for security auditability.',
        topicTag: 'S3 Encryption'
      },
      {
        id: 'wq-14',
        question: 'A media company wants to distribute paid streaming content through Amazon CloudFront to subscribed users accessing hundreds of protected video segments. Which mechanism is most appropriate?',
        options: [
          'CloudFront Signed Cookies',
          'Individual S3 Pre-signed URLs generated for each video segment',
          'CloudFront Geo-Restriction with public S3 bucket',
          'Basic HTTP Authentication headers cached at edge locations'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'CloudFront Signed Cookies provide access to multiple restricted files (such as HLS/DASH video streams containing thousands of chunks) with a single cookie payload.',
        topicTag: 'CloudFront Security'
      },
      {
        id: 'wq-15',
        question: 'Which AWS service and feature provides organization-wide visibility into object storage usage, cost-optimization recommendations, and 14-month trend metrics across all buckets in an AWS account?',
        options: [
          'S3 Storage Lens',
          'S3 Inventory CSV exports',
          'Amazon Athena queries over S3 server access logs',
          'AWS CloudTrail Insights'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Storage Lens is a cloud storage analytics tool that delivers organization-wide visibility into object storage usage and activity trends.',
        topicTag: 'S3 Management'
      },
      {
        id: 'wq-16',
        question: 'To perform asynchronous batch transformations, metadata updates, or replication across billions of objects in an S3 bucket based on an S3 Inventory manifest, which feature should be used?',
        options: [
          'S3 Batch Operations',
          'AWS Glue Crawler with step functions',
          'S3 Multi-Region Access Points',
          'Amazon EMR cluster writing single object PUT requests'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Batch Operations performs large-scale batch actions (such as copying, tagging, encrypting, or invoking Lambda) across billions of objects using an S3 inventory list.',
        topicTag: 'S3 Batch Operations'
      },
      {
        id: 'wq-17',
        question: 'Which Amazon S3 feature speeds up long-distance uploads over the public internet from worldwide clients to a centralized S3 bucket by routing traffic through AWS edge locations?',
        options: [
          'S3 Transfer Acceleration',
          'S3 Express One Zone',
          'AWS Direct Connect dedicated circuit',
          'Amazon Route 53 latency-based routing'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Transfer Acceleration utilizes the globally distributed edge locations in Amazon CloudFront to route traffic over the optimized AWS private network backbone.',
        topicTag: 'S3 Performance'
      },
      {
        id: 'wq-18',
        question: 'How can you configure Amazon CloudFront to serve custom HTML error pages (e.g., friendly 404 or 503 pages) instead of default origin error codes, along with customized caching TTLs for errors?',
        options: [
          'Configure Custom Error Responses on the CloudFront distribution settings',
          'Write custom Apache `.htaccess` rewrite rules on S3 static hosting',
          'Attach an AWS WAF rule that returns custom JSON bodies on 4xx codes',
          'Configure Route 53 failover health check records pointing to S3'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'CloudFront Custom Error Responses allow mapping HTTP status codes (like 403, 404, 500) to custom error response pages and setting specific error caching minimum TTLs.',
        topicTag: 'CloudFront Error Handling'
      },
      {
        id: 'wq-19',
        question: 'What is the purpose of Amazon S3 Block Public Access at the AWS Account level?',
        options: [
          'Provides a centralized, overriding safeguard to prevent public access across all current and future S3 buckets in the account regardless of individual bucket policies',
          'Disables internet gateways in all VPCs within the account',
          'Blocks all external IP addresses from accessing AWS Management Console',
          'Forces all buckets to use S3 Glacier storage tier only'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Block Public Access provides centralized controls for public access across an entire AWS account, overriding any individual permissive bucket or object ACLs/policies.',
        topicTag: 'S3 Security'
      },
      {
        id: 'wq-20',
        question: 'When configuring an S3 bucket for Static Website Hosting, what is the key difference between the REST API endpoint and the Website endpoint?',
        options: [
          'Website endpoints support index document redirection and custom error documents via HTTP; REST API endpoints require explicit object keys and do not perform HTML redirection',
          'REST API endpoints only accept TLS 1.0 connections',
          'Website endpoints can only be accessed from within an AWS VPC',
          'REST API endpoints do not support bucket policies'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Website endpoints support index documents (e.g. index.html) and subfolder routing, while standard REST API endpoints require full object paths.',
        topicTag: 'S3 Static Hosting'
      },
      {
        id: 'wq-21',
        question: 'Which Amazon CloudFront feature provides additional encryption of sensitive user data (such as credit card numbers or PII) at edge locations before the request reaches the origin application server?',
        options: [
          'Field-Level Encryption using asymmetric encryption public keys',
          'Standard HTTPS TLS handshake termination',
          'AWS Certificate Manager wildcard SSL/TLS certificates',
          'Origin Request Policy with Base64 payload encoding'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'Field-Level Encryption in CloudFront allows encrypting sensitive fields using public keys configured at edge locations before forwarding the payload to the origin server.',
        topicTag: 'CloudFront Security'
      },
      {
        id: 'wq-22',
        question: 'An S3 Lifecycle configuration has a rule to transition objects to S3 Standard-IA after 30 days and expire objects after 365 days. How are days calculated by S3?',
        options: [
          'From the object creation (LastModified) date rounded to midnight UTC',
          'From the last time the object was downloaded by a client',
          'From the date the Lifecycle rule was created by the administrator',
          'Based on client local device timezone timestamps'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Lifecycle transitions calculate elapsed days from object creation date (LastModified) rounded up to midnight UTC.',
        topicTag: 'S3 Lifecycle'
      },
      {
        id: 'wq-23',
        question: 'Which SQL-like query feature allows applications to extract small subsets of data from CSV, JSON, or Apache Parquet objects stored in S3 without retrieving the entire multi-gigabyte object?',
        options: [
          'Amazon S3 Select',
          'Amazon S3 Direct Index',
          'Amazon CloudSearch S3 Plugin',
          'Amazon EFS Sparse Read'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Select uses simple SQL expressions to filter the contents of an S3 object and retrieve only the required subset of data.',
        topicTag: 'S3 Querying'
      },
      {
        id: 'wq-24',
        question: 'How can an administrator instantly clear all cached content from all global CloudFront edge locations for a path pattern like `/assets/*` after a new release?',
        options: [
          'Create a CloudFront Invalidation with the pattern `/assets/*`',
          'Delete and recreate the CloudFront distribution',
          'Disable the S3 origin bucket for 60 seconds',
          'Modify the DNS CNAME record in Route 53'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'Creating an Invalidation in CloudFront immediately purges cached objects matching the specified path pattern across all edge locations.',
        topicTag: 'CloudFront Operations'
      },
      {
        id: 'wq-25',
        question: 'Which Amazon S3 storage class provides single-zone high-performance storage with sub-10-millisecond latency specifically optimized for compute-intensive workloads and directory-bucket architecture?',
        options: [
          'S3 Express One Zone',
          'S3 Outposts',
          'S3 Standard Single-AZ',
          'S3 Reduced Redundancy Storage (RRS)'
        ],
        correctOptionIndex: 0,
        marks: 5,
        explanation: 'S3 Express One Zone is a high-performance, single-Availability Zone storage class purpose-built to deliver consistent single-digit millisecond data access for latency-sensitive applications.',
        topicTag: 'S3 Express One Zone'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function readSettingsStore(): Promise<Record<string, any>> {
  requireDatabaseAvailability();
  if (sql) {
    return await readPostgres<Record<string, any>>('settings.json', {});
  }
  return await readJsonFile<Record<string, any>>('settings.json', {});
}

async function writeSettingsStore(data: Record<string, any>): Promise<void> {
  requireDatabaseAvailability();
  if (sql) {
    await writePostgres('settings.json', data);
    return;
  }
  await writeJsonFile('settings.json', data);
}

// Database APIs
export const db = {
  settings: {
    getFeedbackPagePublished: async (): Promise<boolean> => {
      const settings = await readSettingsStore();
      const value = settings.feedbackPagePublished;
      return value === undefined ? true : Boolean(value);
    },
    setFeedbackPagePublished: async (published: boolean): Promise<void> => {
      const settings = await readSettingsStore();
      await writeSettingsStore({ ...settings, feedbackPagePublished: Boolean(published) });
    },
    getExamPortalPublished: async (): Promise<boolean> => {
      const settings = await readSettingsStore();
      const value = settings.examPortalPublished;
      return value === undefined ? false : Boolean(value);
    },
    setExamPortalPublished: async (published: boolean): Promise<void> => {
      const settings = await readSettingsStore();
      await writeSettingsStore({ ...settings, examPortalPublished: Boolean(published) });
    },
    get: async (key: string, defaultValue: any = null): Promise<any> => {
      const settings = await readSettingsStore();
      return settings[key] !== undefined ? settings[key] : defaultValue;
    },
    set: async (key: string, value: any): Promise<void> => {
      const settings = await readSettingsStore();
      await writeSettingsStore({ ...settings, [key]: value });
    }
  },
  admins: {
    getAll: async () => {
      let data = await readJsonFile<any[]>('admin_users.json', DEFAULT_ADMINS());
      let migrated = false;
      data = data.map(admin => {
        if (admin.username === 'admin') {
          admin.username = 'awsadmin@culko.in';
          migrated = true;
        }
        return admin;
      });
      if (migrated) {
        await writeJsonFile('admin_users.json', data);
      }
      return data;
    },
    saveAll: async (data: any) => await writeJsonFile('admin_users.json', data)
  },
  registrations: {
    getAll: async () => await readJsonFile<any[]>('registrations.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('registrations.json', data)
  },
  eventRegistrations: {
    getAll: async (): Promise<any[]> => {
      if (sql) {
        await ensureRegistrationsTable();
        try {
          const rows = await sql`
            SELECT * FROM registrations ORDER BY created_at DESC
          `;
          return rows.map((r: any) => ({
            id: r.id,
            eventId: r.event_id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            university: r.university,
            program: r.program,
            year: r.year,
            studentId: r.student_id,
            interests: (() => {
              try {
                return JSON.parse(r.interests);
              } catch(e) {
                return [r.interests];
              }
            })(),
            experienceLevel: r.experience_level,
            linkedin: r.linkedin,
            github: r.github,
            motivation: r.motivation,
            consent: r.consent,
            status: r.status,
            attendance: r.attendance || 'Registered',
            certificateId: r.certificate_id || null,
            notes: r.notes,
            date: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          }));
        } catch (err) {
          console.error('Postgres error in eventRegistrations.getAll:', err);
          return await readJsonFile<any[]>('event_registrations.json', []);
        }
      }
      return await readJsonFile<any[]>('event_registrations.json', []);
    },

    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const list = await db.eventRegistrations.getAll();
      return list.find((r: any) => r.id === id) || null;
    },

    getByEmail: async (email: string): Promise<any[]> => {
      if (!email) return [];
      const clean = String(email).trim().toLowerCase();
      const list = await db.eventRegistrations.getAll();
      return list.filter((r: any) => String(r.email || '').trim().toLowerCase() === clean);
    },

    insertOne: async (reg: any): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        const interestsStr = Array.isArray(reg.interests) ? JSON.stringify(reg.interests) : JSON.stringify([reg.interests]);
        try {
          await sql`
            INSERT INTO registrations (
              id, event_id, name, email, phone, university, program, year, student_id,
              interests, experience_level, linkedin, github, motivation, consent,
              status, attendance, certificate_id, notes, created_at
            ) VALUES (
              ${reg.id}, ${reg.eventId}, ${reg.name}, ${reg.email}, ${reg.phone || ''},
              ${reg.university}, ${reg.program}, ${reg.year}, ${reg.studentId || ''},
              ${interestsStr}, ${reg.experienceLevel || 'Beginner'}, ${reg.linkedin || ''},
              ${reg.github || ''}, ${reg.motivation || ''}, ${!!reg.consent},
              ${reg.status || 'New'}, ${reg.attendance || 'Registered'}, ${reg.certificateId || null}, ${reg.notes || ''}, ${reg.date || new Date().toISOString()}
            )
          `;
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.insertOne:', err);
        }
      }
      const data = await readJsonFile<any[]>('event_registrations.json', []);
      data.push({ ...reg, attendance: reg.attendance || 'Registered', certificateId: reg.certificateId || null });
      await writeJsonFile('event_registrations.json', data);
    },

    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        try {
          const hasStatus = fields.status !== undefined;
          const hasNotes = fields.notes !== undefined;
          const hasAttendance = fields.attendance !== undefined;
          const hasCertificateId = fields.certificateId !== undefined;

          if (hasStatus || hasNotes || hasAttendance || hasCertificateId) {
            await sql`
              UPDATE registrations
              SET
                status = ${hasStatus ? fields.status : sql`status`},
                notes = ${hasNotes ? fields.notes : sql`notes`},
                attendance = ${hasAttendance ? fields.attendance : sql`attendance`},
                certificate_id = ${hasCertificateId ? (fields.certificateId ?? null) : sql`certificate_id`}
              WHERE id = ${id}
            `;
          }
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.updateOne:', err);
          throw err;
        }
      }
      const data = await readJsonFile<any[]>('event_registrations.json', []);
      const idx = data.findIndex(r => r.id === id);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...fields };
        if (fields.eventId) data[idx].eventId = fields.eventId;
        if (fields.attendance) data[idx].attendance = fields.attendance;
        if (fields.certificateId !== undefined) data[idx].certificateId = fields.certificateId;
        await writeJsonFile('event_registrations.json', data);
      }
    },

    deleteOne: async (id: string): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        try {
          const deleted = await sql`
            DELETE FROM registrations
            WHERE id = ${id}
            RETURNING id
          `;
          if (!deleted || deleted.length === 0) {
            throw new Error(`Registration ${id} was not found in the production database.`);
          }
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.deleteOne:', err);
          throw err;
        }
      }
      let data = await readJsonFile<any[]>('event_registrations.json', []);
      const hadMatch = data.some(r => r.id === id);
      data = data.filter(r => r.id !== id);
      await writeJsonFile('event_registrations.json', data);
      if (!hadMatch) {
        throw new Error(`Registration ${id} was not found in the local storage.`);
      }
    },

    deleteByEventId: async (eventId: string): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        try {
          await sql`
            DELETE FROM registrations WHERE event_id = ${eventId}
          `;
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.deleteByEventId:', err);
          throw err;
        }
      }
      let data = await readJsonFile<any[]>('event_registrations.json', []);
      data = data.filter(r => r.eventId !== eventId);
      await writeJsonFile('event_registrations.json', data);
    },

    deleteBulk: async (ids: string[]): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        try {
          await sql`
            DELETE FROM registrations WHERE id = ANY(${ids})
          `;
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.deleteBulk:', err);
          throw err;
        }
      }
      let data = await readJsonFile<any[]>('event_registrations.json', []);
      data = data.filter(r => !ids.includes(r.id));
      await writeJsonFile('event_registrations.json', data);
    },

    saveAll: async (data: any[]): Promise<void> => {
      invalidateMemoryCache('event_registrations.json');
      if (sql) {
        await ensureRegistrationsTable();
        try {
          await sql`DELETE FROM registrations`;
          for (const reg of data) {
            const interestsStr = Array.isArray(reg.interests) ? JSON.stringify(reg.interests) : JSON.stringify([reg.interests]);
            await sql`
              INSERT INTO registrations (
                id, event_id, name, email, phone, university, program, year, student_id,
                interests, experience_level, linkedin, github, motivation, consent,
                status, attendance, certificate_id, notes, created_at
              ) VALUES (
                ${reg.id}, ${reg.eventId || reg.event_id}, ${reg.name}, ${reg.email}, ${reg.phone || ''},
                ${reg.university}, ${reg.program}, ${reg.year}, ${reg.studentId || reg.student_id || ''},
                ${interestsStr}, ${reg.experienceLevel || 'Beginner'}, ${reg.linkedin || ''},
                ${reg.github || ''}, ${reg.motivation || ''}, ${!!reg.consent},
                ${reg.status || 'New'}, ${reg.attendance || 'Registered'}, ${reg.certificateId || null}, ${reg.notes || ''}, ${reg.date || reg.created_at || new Date().toISOString()}
              )
            `;
          }
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.saveAll:', err);
          throw err;
        }
      }
      await writeJsonFile('event_registrations.json', data.map((reg: any) => ({ ...reg, attendance: reg.attendance || 'Registered', certificateId: reg.certificateId || null })));
    }
  },
  certificates: {
    getAll: async (): Promise<any[]> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCertificatesTable();
        const rows = await sql`SELECT * FROM certificates ORDER BY created_at DESC`;
        return rows.map((row: any) => ({
          id: row.id,
          certificateId: row.certificate_id,
          eventId: row.event_id,
          registrationId: row.registration_id,
          studentName: row.student_name,
          eventName: row.event_name,
          eventDate: row.event_date,
          venue: row.venue,
          issueDate: row.issue_date ? new Date(row.issue_date).toISOString().slice(0, 10) : null,
          status: row.status,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
        }));
      }
      return await readJsonFile<any[]>('certificates.json', []);
    },

    getByCertificateId: async (certificateId: string): Promise<any | null> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCertificatesTable();
        const rows = await sql`SELECT * FROM certificates WHERE certificate_id = ${certificateId} LIMIT 1`;
        if (!rows || rows.length === 0) {
          return null;
        }
        const row = rows[0];
        return {
          id: row.id,
          certificateId: row.certificate_id,
          eventId: row.event_id,
          registrationId: row.registration_id,
          studentName: row.student_name,
          eventName: row.event_name,
          eventDate: row.event_date,
          venue: row.venue,
          issueDate: row.issue_date ? new Date(row.issue_date).toISOString().slice(0, 10) : null,
          status: row.status,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
        };
      }
      const all = await readJsonFile<any[]>('certificates.json', []);
      return all.find((item: any) => item.certificateId === certificateId) || null;
    },

    getByRegistrationId: async (registrationId: string): Promise<any | null> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCertificatesTable();
        const rows = await sql`SELECT * FROM certificates WHERE registration_id = ${registrationId} LIMIT 1`;
        return rows && rows.length > 0 ? rows[0] : null;
      }
      const all = await readJsonFile<any[]>('certificates.json', []);
      return all.find((item: any) => item.registrationId === registrationId) || null;
    },

    insertOne: async (record: any): Promise<any> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCertificatesTable();
        const result = await sql`
          INSERT INTO certificates (
            certificate_id, event_id, registration_id, student_name, event_name, event_date, venue, issue_date, status, created_at, updated_at
          ) VALUES (
            ${record.certificateId}, ${record.eventId}, ${record.registrationId}, ${record.studentName}, ${record.eventName}, ${record.eventDate || null}, ${record.venue || null}, ${record.issueDate || new Date().toISOString().slice(0, 10)}, ${record.status || 'Valid'}, ${record.createdAt || new Date().toISOString()}, ${record.updatedAt || new Date().toISOString()}
          ) RETURNING *
        `;
        return result[0];
      }
      const all = await readJsonFile<any[]>('certificates.json', []);
      all.push({
        id: record.id || `cert-${Date.now()}`,
        certificateId: record.certificateId,
        eventId: record.eventId,
        registrationId: record.registrationId,
        studentName: record.studentName,
        eventName: record.eventName,
        eventDate: record.eventDate,
        venue: record.venue,
        issueDate: record.issueDate || new Date().toISOString().slice(0, 10),
        status: record.status || 'Valid',
        createdAt: record.createdAt || new Date().toISOString()
      });
      await writeJsonFile('certificates.json', all);
      return all[all.length - 1];
    },

    updateOne: async (certificateId: string, fields: Partial<any>): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCertificatesTable();
        if (fields.status !== undefined) {
          await sql`UPDATE certificates SET status = ${fields.status}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.eventId !== undefined) {
          await sql`UPDATE certificates SET event_id = ${fields.eventId}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.studentName !== undefined) {
          await sql`UPDATE certificates SET student_name = ${fields.studentName}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.eventName !== undefined) {
          await sql`UPDATE certificates SET event_name = ${fields.eventName}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.eventDate !== undefined) {
          await sql`UPDATE certificates SET event_date = ${fields.eventDate}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.venue !== undefined) {
          await sql`UPDATE certificates SET venue = ${fields.venue}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        if (fields.issueDate !== undefined) {
          await sql`UPDATE certificates SET issue_date = ${fields.issueDate}, updated_at = ${new Date().toISOString()} WHERE certificate_id = ${certificateId}`;
        }
        return;
      }
      const all = await readJsonFile<any[]>('certificates.json', []);
      const idx = all.findIndex((item: any) => item.certificateId === certificateId);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...fields };
        await writeJsonFile('certificates.json', all);
      }
    },

    revoke: async (certificateId: string): Promise<void> => {
      await db.certificates.updateOne(certificateId, { status: 'Revoked' });
    },

    restore: async (certificateId: string): Promise<void> => {
      await db.certificates.updateOne(certificateId, { status: 'Valid' });
    }
  },
  events: {
    getAll: async () => await readJsonFile<any[]>('events.json', DEFAULT_EVENTS),
    saveAll: async (data: any[]) => await writeJsonFile('events.json', data)
  },
  announcements: {
    getAll: async () => await readJsonFile<any[]>('announcements.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('announcements.json', data)
  },
  resources: {
    getAll: async () => await readJsonFile<any[]>('resources.json', [
      {
        id: 'res-01',
        title: 'AWS Ramp-Up Guide: Cloud Practitioner',
        description: 'Comprehensive pathway to preparing for your first AWS foundational certification.',
        category: 'AWS Cloud',
        difficulty: 'Beginner',
        officialSource: 'AWS Training',
        url: 'https://aws.amazon.com/training/ramp-up-guides/',
        status: 'Published'
      },
      {
        id: 'res-02',
        title: 'Amazon Bedrock Foundations',
        description: 'A developer guide to orchestrating generative AI pipelines and security models.',
        category: 'Generative AI',
        difficulty: 'Intermediate',
        officialSource: 'AWS Builders',
        url: 'https://aws.amazon.com/bedrock/',
        status: 'Published'
      }
    ]),
    saveAll: async (data: any[]) => await writeJsonFile('resources.json', data)
  },
  verificationRequests: {
    getAll: async () => await readJsonFile<any[]>('verification_requests.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('verification_requests.json', data)
  },
  coreTeam: {
    getAll: async () => await readJsonFile<any[]>('core_team.json', DEFAULT_CORE_TEAM),
    saveAll: async (data: any[]) => await writeJsonFile('core_team.json', data)
  },
  collaborationRequests: {
    getAll: async () => await readJsonFile<any[]>('collaboration_requests.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('collaboration_requests.json', data)
  },
  websiteContent: {
    get: async () => await readJsonFile('website_content.json', DEFAULT_CONTENT),
    save: async (data: any) => await writeJsonFile('website_content.json', data)
  },
  notifications: {
    getAll: async () => await readJsonFile<any[]>('notifications.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('notifications.json', data),
    insertOne: async (notif: any) => {
      const all = await readJsonFile<any[]>('notifications.json', []);
      all.unshift(notif);
      await writeJsonFile('notifications.json', all);
    }
  },
  contactMessages: {
    getAll: async () => await readJsonFile<any[]>('contact_messages.json', []),
    saveAll: async (data: any[]) => await writeJsonFile('contact_messages.json', data)
  },
  logos: {
    getMap: async () => await readJsonFile<Record<string, string>>('collaboration_logos.json', {}),
    saveMap: async (data: Record<string, string>) => await writeJsonFile('collaboration_logos.json', data)
  },
  eventPhotos: {
    getMap: async () => await readJsonFile<Record<string, { id: string; data: string; mimeType: string; fileName?: string; caption?: string; uploadedAt?: string; size?: number }>>('event_photos.json', {}),
    saveMap: async (data: Record<string, any>) => await writeJsonFile('event_photos.json', data),
    get: async (id: string) => {
      const map = await db.eventPhotos.getMap();
      return map[id] || null;
    },
    save: async (id: string, photo: any) => {
      const map = await db.eventPhotos.getMap();
      map[id] = photo;
      await db.eventPhotos.saveMap(map);
    },
    delete: async (id: string) => {
      const map = await db.eventPhotos.getMap();
      if (map[id]) {
        delete map[id];
        await db.eventPhotos.saveMap(map);
      }
    }
  },
  resumeFiles: {
    getMap: async () => await readJsonFile<Record<string, { data: string; mimeType: string; fileName: string; size: number }>>('career_resume_files.json', {}),
    saveMap: async (data: Record<string, { data: string; mimeType: string; fileName: string; size: number }>) => await writeJsonFile('career_resume_files.json', data)
  },
  feedback: {
    getAll: async (): Promise<any[]> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureFeedbackTable();
        try {
          const rows = await sql`
            SELECT * FROM feedback ORDER BY created_at DESC
          `;
          return rows.map((r: any) => ({
            id: r.id,
            eventId: r.event_id,
            name: r.name,
            email: r.email,
            university: r.university || '',
            rating: Number(r.rating),
            experience: r.experience || '',
            feedback: r.feedback || '',
            liked: r.liked || '',
            improvements: r.improvements || '',
            recommendation: r.recommendation || '',
            status: r.status || 'New',
            adminNotes: r.admin_notes || '',
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          }));
        } catch (err) {
          console.error('Postgres error in feedback.getAll:', err);
          throw err;
        }
      }
      return await readJsonFile<any[]>('feedback.json', []);
    },

    insertOne: async (f: any): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureFeedbackTable();
        try {
          await sql`
            INSERT INTO feedback (
              id, event_id, name, email, university, rating, experience,
              feedback, liked, improvements, recommendation, status, admin_notes,
              created_at, updated_at
            ) VALUES (
              ${f.id}, ${f.eventId || null}, ${f.name}, ${f.email}, ${f.university || ''},
              ${Number(f.rating)}, ${f.experience || ''}, ${f.feedback || ''},
              ${f.liked || ''}, ${f.improvements || ''}, ${f.recommendation || ''},
              ${f.status || 'New'}, ${f.adminNotes || ''},
              ${f.createdAt || new Date().toISOString()}, ${f.updatedAt || new Date().toISOString()}
            )
          `;
          return;
        } catch (err) {
          console.error('Postgres error in feedback.insertOne:', err);
          throw err;
        }
      }
      const data = await readJsonFile<any[]>('feedback.json', []);
      data.push(f);
      await writeJsonFile('feedback.json', data);
    },

    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureFeedbackTable();
        try {
          await sql`
            UPDATE feedback
            SET 
              name = ${fields.name !== undefined ? fields.name : sql`name`},
              email = ${fields.email !== undefined ? fields.email : sql`email`},
              university = ${fields.university !== undefined ? fields.university : sql`university`},
              event_id = ${fields.eventId !== undefined ? (fields.eventId || null) : sql`event_id`},
              rating = ${fields.rating !== undefined ? Number(fields.rating) : sql`rating`},
              experience = ${fields.experience !== undefined ? fields.experience : sql`experience`},
              feedback = ${fields.feedback !== undefined ? fields.feedback : sql`feedback`},
              liked = ${fields.liked !== undefined ? fields.liked : sql`liked`},
              improvements = ${fields.improvements !== undefined ? fields.improvements : sql`improvements`},
              recommendation = ${fields.recommendation !== undefined ? fields.recommendation : sql`recommendation`},
              status = ${fields.status !== undefined ? fields.status : sql`status`},
              admin_notes = ${fields.adminNotes !== undefined ? fields.adminNotes : sql`admin_notes`},
              updated_at = ${new Date().toISOString()}
            WHERE id = ${id}
          `;
          return;
        } catch (err) {
          console.error('Postgres error in feedback.updateOne:', err);
          throw err;
        }
      }
      const data = await readJsonFile<any[]>('feedback.json', []);
      const idx = data.findIndex(r => r.id === id);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...fields, updatedAt: new Date().toISOString() };
        await writeJsonFile('feedback.json', data);
      }
    },

    deleteOne: async (id: string): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureFeedbackTable();
        try {
          await sql`
            DELETE FROM feedback WHERE id = ${id}
          `;
          return;
        } catch (err) {
          console.error('Postgres error in feedback.deleteOne:', err);
          throw err;
        }
      }
      let data = await readJsonFile<any[]>('feedback.json', []);
      data = data.filter(r => r.id !== id);
      await writeJsonFile('feedback.json', data);
    },

    saveAll: async (data: any[]): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureFeedbackTable();
        try {
          await sql`DELETE FROM feedback`;
          for (const f of data) {
            await sql`
              INSERT INTO feedback (
                id, event_id, name, email, university, rating, experience,
                feedback, liked, improvements, recommendation, status, admin_notes,
                created_at, updated_at
              ) VALUES (
                ${f.id}, ${f.eventId || null}, ${f.name}, ${f.email}, ${f.university || ''},
                ${Number(f.rating)}, ${f.experience || ''}, ${f.feedback || ''},
                ${f.liked || ''}, ${f.improvements || ''}, ${f.recommendation || ''},
                ${f.status || 'New'}, ${f.adminNotes || ''},
                ${f.createdAt || new Date().toISOString()}, ${f.updatedAt || new Date().toISOString()}
              )
            `;
          }
          return;
        } catch (err) {
          console.error('Postgres error in feedback.saveAll:', err);
          throw err;
        }
      }
      await writeJsonFile('feedback.json', data);
    }
  },
  careers: {
    getAll: async (): Promise<any[]> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareersTable();
        const rows = await sql`SELECT * FROM careers ORDER BY created_at DESC`;
        const data = rows.map((r: any) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          organizationName: r.organization_name,
          organizationLogo: r.organization_logo || '',
          opportunityType: r.opportunity_type,
          location: r.location,
          workMode: r.work_mode,
          shortDescription: r.short_description,
          description: r.description,
          responsibilities: r.responsibilities || '',
          requiredSkills: r.required_skills || '',
          preferredSkills: r.preferred_skills || '',
          eligibility: r.eligibility || '',
          benefits: r.benefits || '',
          additionalInformation: r.additional_information || '',
          applicationDeadline: r.application_deadline ? new Date(r.application_deadline).toISOString() : '',
          status: r.status || 'Draft',
          published: Boolean(r.published),
          internalApplications: Boolean(r.internal_applications),
          applicationLink: r.application_link || '',
          maxApplications: r.max_applications ?? null,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        }));
        if (data.length === 0) {
          await db.careers.saveAll(DEFAULT_OPPORTUNITIES);
          return DEFAULT_OPPORTUNITIES;
        }
        return data;
      }
      const data = await readJsonFile<any[]>('careers.json', DEFAULT_OPPORTUNITIES);
      if (data.length === 0) {
        await writeJsonFile('careers.json', DEFAULT_OPPORTUNITIES);
        return DEFAULT_OPPORTUNITIES;
      }
      return data;
    },
    getBySlug: async (slug: string): Promise<any | null> => {
      const careers = await db.careers.getAll();
      return careers.find((career: any) => career.slug === slug) || null;
    },
    insertOne: async (career: any): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareersTable();
        await sql`
          INSERT INTO careers (
            id, slug, title, organization_name, organization_logo, opportunity_type, location, work_mode,
            short_description, description, responsibilities, required_skills, preferred_skills,
            eligibility, benefits, additional_information, application_deadline, status, published,
            internal_applications, application_link, max_applications, created_at, updated_at
          ) VALUES (
            ${career.id}, ${career.slug}, ${career.title}, ${career.organizationName}, ${career.organizationLogo || ''}, ${career.opportunityType}, ${career.location}, ${career.workMode},
            ${career.shortDescription}, ${career.description}, ${career.responsibilities || ''}, ${career.requiredSkills || ''}, ${career.preferredSkills || ''},
            ${career.eligibility || ''}, ${career.benefits || ''}, ${career.additionalInformation || ''}, ${career.applicationDeadline || null}, ${career.status || 'Draft'}, ${Boolean(career.published)},
            ${Boolean(career.internalApplications)}, ${career.applicationLink || ''}, ${career.maxApplications ?? null}, ${career.createdAt || new Date().toISOString()}, ${career.updatedAt || new Date().toISOString()}
          )
        `;
        return;
      }
      const data = await readJsonFile<any[]>('careers.json', []);
      data.unshift(career);
      await writeJsonFile('careers.json', data);
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareersTable();
        await sql`
          UPDATE careers
          SET
            slug = ${fields.slug !== undefined ? fields.slug : sql`slug`},
            title = ${fields.title !== undefined ? fields.title : sql`title`},
            organization_name = ${fields.organizationName !== undefined ? fields.organizationName : sql`organization_name`},
            organization_logo = ${fields.organizationLogo !== undefined ? (fields.organizationLogo || '') : sql`organization_logo`},
            opportunity_type = ${fields.opportunityType !== undefined ? fields.opportunityType : sql`opportunity_type`},
            location = ${fields.location !== undefined ? fields.location : sql`location`},
            work_mode = ${fields.workMode !== undefined ? fields.workMode : sql`work_mode`},
            short_description = ${fields.shortDescription !== undefined ? fields.shortDescription : sql`short_description`},
            description = ${fields.description !== undefined ? fields.description : sql`description`},
            responsibilities = ${fields.responsibilities !== undefined ? fields.responsibilities : sql`responsibilities`},
            required_skills = ${fields.requiredSkills !== undefined ? fields.requiredSkills : sql`required_skills`},
            preferred_skills = ${fields.preferredSkills !== undefined ? fields.preferredSkills : sql`preferred_skills`},
            eligibility = ${fields.eligibility !== undefined ? fields.eligibility : sql`eligibility`},
            benefits = ${fields.benefits !== undefined ? fields.benefits : sql`benefits`},
            additional_information = ${fields.additionalInformation !== undefined ? fields.additionalInformation : sql`additional_information`},
            application_deadline = ${fields.applicationDeadline !== undefined ? (fields.applicationDeadline || null) : sql`application_deadline`},
            status = ${fields.status !== undefined ? fields.status : sql`status`},
            published = ${fields.published !== undefined ? Boolean(fields.published) : sql`published`},
            internal_applications = ${fields.internalApplications !== undefined ? Boolean(fields.internalApplications) : sql`internal_applications`},
            application_link = ${fields.applicationLink !== undefined ? (fields.applicationLink || '') : sql`application_link`},
            max_applications = ${fields.maxApplications !== undefined ? (fields.maxApplications ?? null) : sql`max_applications`},
            updated_at = ${new Date().toISOString()}
          WHERE id = ${id}
        `;
        return;
      }
      const data = await readJsonFile<any[]>('careers.json', []);
      const idx = data.findIndex((career: any) => career.id === id);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...fields, updatedAt: new Date().toISOString() };
        await writeJsonFile('careers.json', data);
      }
    },
    deleteOne: async (id: string): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareersTable();
        await sql`DELETE FROM careers WHERE id = ${id}`;
        return;
      }
      let data = await readJsonFile<any[]>('careers.json', []);
      data = data.filter((career: any) => career.id !== id);
      await writeJsonFile('careers.json', data);
    },
    saveAll: async (data: any[]): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareersTable();
        await sql`DELETE FROM careers`;
        for (const career of data) {
          await db.careers.insertOne(career);
        }
        return;
      }
      await writeJsonFile('careers.json', data);
    }
  },
  careerApplications: {
    getAll: async (): Promise<any[]> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareerApplicationsTable();
        const rows = await sql`SELECT * FROM career_applications ORDER BY created_at DESC`;
        return rows.map((r: any) => {
          const details = r.details && typeof r.details === 'object' ? r.details : {};
          const mapped = {
            id: r.id,
            opportunityId: r.opportunity_id,
            opportunitySlug: r.opportunity_slug || details.opportunitySlug || '',
            formType: r.form_type || details.formType || '',
            name: r.name,
            email: r.email,
            personalEmail: r.personal_email || details.personalEmail || '',
            phone: r.phone || '',
            university: r.university || '',
            program: r.program || '',
            department: r.department || details.department || r.branch || details.branch || '',
            branch: r.branch || details.branch || r.department || details.department || '',
            currentYear: r.current_year || details.currentYear || r.year || details.year || '',
            graduationYear: r.graduation_year || details.graduationYear || '',
            studentId: r.student_id || details.studentId || r.roll_number || details.rollNumber || '',
            rollNumber: r.roll_number || details.rollNumber || r.student_id || details.studentId || '',
            resumeUrl: r.resume_url || details.resumeUrl || '',
            introductionVideoUrl: r.introduction_video_url || r.video_url || details.introductionVideoUrl || details.videoUrl || '',
            videoUrl: r.introduction_video_url || r.video_url || details.introductionVideoUrl || details.videoUrl || '',
            linkedin: r.linkedin || details.linkedin || '',
            github: r.github || details.github || '',
            portfolio: r.portfolio || details.portfolio || '',
            preferredDomain: r.preferred_domain || details.preferredDomain || details.domain || '',
            preferredRole: r.preferred_role || details.preferredRole || details.role || '',
            skills: r.skills || details.skills || '',
            primarySkillLevel: r.primary_skill_level || details.primarySkillLevel || '',
            experience: r.experience || details.experience || r.previous_experience || details.previousExperience || '',
            previousExperience: r.previous_experience || details.previousExperience || r.experience || details.experience || '',
            roleAndImpact: r.role_and_impact || details.roleAndImpact || r.exact_responsibility || details.exactResponsibility || '',
            exactResponsibility: r.exact_responsibility || details.exactResponsibility || r.role_and_impact || details.roleAndImpact || '',
            teamworkSituation: r.teamwork_situation || details.teamworkSituation || '',
            leadershipExperience: r.leadership_experience || details.leadershipExperience || '',
            leadershipDetails: r.leadership_details || details.leadershipDetails || '',
            whyFoundingMember: r.why_founding_member || details.whyFoundingMember || '',
            whyCoreTeam: r.why_core_team || details.whyCoreTeam || '',
            personalContribution: r.personal_contribution || details.personalContribution || details.contribution || '',
            domainContribution: r.domain_contribution || details.domainContribution || details.personalContribution || details.contribution || '',
            communityGrowthIdeas: r.community_growth_ideas || details.communityGrowthIdeas || details.growthIdeas || '',
            scenarioAnswer: r.scenario_answer || details.scenarioAnswer || r.scenario_drop_participation || details.scenarioDropParticipation || r.scenario_unavailable_members || details.scenarioUnavailableMembers || '',
            scenarioDropParticipation: r.scenario_drop_participation || details.scenarioDropParticipation || r.scenario_answer || details.scenarioAnswer || '',
            scenarioUnavailableMembers: r.scenario_unavailable_members || details.scenarioUnavailableMembers || r.scenario_answer || details.scenarioAnswer || '',
            availabilityHours: r.availability_hours || details.availabilityHours || details.weeklyAvailability || '',
            consistentContribution: r.consistent_contribution || details.consistentContribution || details.consistentCommitment || '',
            contributionDuration: r.contribution_duration || details.contributionDuration || details.involvementDuration || details.duration || '',
            academicBalance: r.academic_balance || details.academicBalance || '',
            availableDays: r.available_days || details.availableDays || '',
            activeParticipation: r.active_participation || details.activeParticipation || '',
            involvementDuration: r.involvement_duration || details.involvementDuration || details.contributionDuration || details.duration || '',
            motivation: r.motivation || details.motivation || r.why_founding_member || details.whyFoundingMember || r.why_core_team || details.whyCoreTeam || '',
            coverLetter: r.cover_letter || details.coverLetter || '',
            additionalInformation: r.additional_information || details.additionalInformation || '',
            consent: Boolean(r.consent),
            status: r.status || details.status || 'New',
            adminNotes: r.admin_notes || details.adminNotes || '',
            ...details,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          };
          return normalizeOpportunityApplication(mapped);
        });
      }
      const data = await readJsonFile<any[]>('career_applications.json', []);
      return data.map((item: any) => normalizeOpportunityApplication(item));
    },
    getByOpportunityId: async (opportunityId: string): Promise<any[]> => {
      const rows = await db.careerApplications.getAll();
      return rows.filter((application: any) => application.opportunityId === opportunityId);
    },
    insertOne: async (rawApp: any): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      const application = normalizeOpportunityApplication(rawApp);
      const videoLink = application.introductionVideoUrl || application.videoUrl || '';
      if (sql) {
        await ensureCareerApplicationsTable();
        const detailsJson = JSON.stringify(application);
        await sql`
          INSERT INTO career_applications (
            id, opportunity_id, opportunity_slug, form_type, name, email, personal_email, phone, university, program,
            department, branch, current_year, graduation_year, student_id, roll_number,
            resume_url, introduction_video_url, video_url, linkedin, github, portfolio,
            preferred_domain, preferred_role, skills, primary_skill_level,
            experience, previous_experience, role_and_impact, exact_responsibility,
            teamwork_situation, leadership_experience, leadership_details,
            why_founding_member, why_core_team, personal_contribution, domain_contribution,
            community_growth_ideas, scenario_answer, scenario_drop_participation, scenario_unavailable_members,
            availability_hours, consistent_contribution, contribution_duration, academic_balance,
            available_days, active_participation, involvement_duration,
            motivation, cover_letter, additional_information, consent, status, admin_notes, details,
            created_at, updated_at
          ) VALUES (
            ${application.id}, ${application.opportunityId}, ${application.opportunitySlug || ''}, ${application.formType || ''}, ${application.name}, ${application.email}, ${application.personalEmail || ''}, ${application.phone || ''}, ${application.university || ''}, ${application.program || ''},
            ${application.department || ''}, ${application.branch || ''}, ${application.currentYear || ''}, ${application.graduationYear || ''}, ${application.studentId || ''}, ${application.rollNumber || ''},
            ${application.resumeUrl || ''}, ${videoLink}, ${videoLink}, ${application.linkedin || ''}, ${application.github || ''}, ${application.portfolio || ''},
            ${application.preferredDomain || ''}, ${application.preferredRole || ''}, ${application.skills || ''}, ${application.primarySkillLevel || ''},
            ${application.experience || ''}, ${application.previousExperience || ''}, ${application.roleAndImpact || ''}, ${application.exactResponsibility || ''},
            ${application.teamworkSituation || ''}, ${application.leadershipExperience || ''}, ${application.leadershipDetails || ''},
            ${application.whyFoundingMember || ''}, ${application.whyCoreTeam || ''}, ${application.personalContribution || ''}, ${application.domainContribution || ''},
            ${application.communityGrowthIdeas || ''}, ${application.scenarioAnswer || ''}, ${application.scenarioDropParticipation || ''}, ${application.scenarioUnavailableMembers || ''},
            ${application.availabilityHours || ''}, ${application.consistentContribution || ''}, ${application.contributionDuration || ''}, ${application.academicBalance || ''},
            ${application.availableDays || ''}, ${application.activeParticipation || ''}, ${application.involvementDuration || ''},
            ${application.motivation || ''}, ${application.coverLetter || ''}, ${application.additionalInformation || ''}, ${Boolean(application.consent)}, ${application.status || 'New'}, ${application.adminNotes || ''}, ${detailsJson},
            ${application.createdAt || new Date().toISOString()}, ${application.updatedAt || new Date().toISOString()}
          )
        `;
        return;
      }
      const data = await readJsonFile<any[]>('career_applications.json', []);
      data.unshift(application);
      await writeJsonFile('career_applications.json', data);
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareerApplicationsTable();
        const existingRows = await sql`SELECT details FROM career_applications WHERE id = ${id}`;
        let updatedDetailsJson = null;
        if (existingRows.length > 0 && existingRows[0].details) {
          const oldDetails = typeof existingRows[0].details === 'object' ? existingRows[0].details : {};
          updatedDetailsJson = JSON.stringify({ ...oldDetails, ...fields });
        }
        await sql`
          UPDATE career_applications
          SET
            status = ${fields.status !== undefined ? fields.status : sql`status`},
            admin_notes = ${fields.adminNotes !== undefined ? fields.adminNotes : sql`admin_notes`},
            details = ${updatedDetailsJson !== null ? updatedDetailsJson : sql`details`},
            updated_at = ${new Date().toISOString()}
          WHERE id = ${id}
        `;
        return;
      }
      const data = await readJsonFile<any[]>('career_applications.json', []);
      const idx = data.findIndex((application: any) => application.id === id);
      if (idx !== -1) {
        data[idx] = normalizeOpportunityApplication({ ...data[idx], ...fields, updatedAt: new Date().toISOString() });
        await writeJsonFile('career_applications.json', data);
      }
    },
    deleteOne: async (id: string): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareerApplicationsTable();
        await sql`DELETE FROM career_applications WHERE id = ${id}`;
        return;
      }
      let data = await readJsonFile<any[]>('career_applications.json', []);
      data = data.filter((application: any) => application.id !== id);
      await writeJsonFile('career_applications.json', data);
    },
    saveAll: async (data: any[]): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareerApplicationsTable();
        await sql`DELETE FROM career_applications`;
        for (const application of data) {
          await db.careerApplications.insertOne(application);
        }
        return;
      }
      await writeJsonFile('career_applications.json', data.map((item: any) => normalizeOpportunityApplication(item)));
    }
  },
  exams: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('exams.json', DEFAULT_EXAMS);
    },
    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const cleanId = String(id).trim().toLowerCase();
      const cleanNoPrefix = cleanId.startsWith('exam-') ? cleanId.substring(5) : cleanId;
      const cleanNormalized = cleanId.replace(/[^a-z0-9]/g, '');

      const exams = await db.exams.getAll();
      return (
        exams.find((e: any) => {
          if (!e) return false;
          const eId = String(e.id || '').trim().toLowerCase();
          const eCode = String(e.examCode || '').trim().toLowerCase();
          const eSlug = String(e.slug || '').trim().toLowerCase();
          const eCodeNormalized = eCode.replace(/[^a-z0-9]/g, '');

          return (
            eId === cleanId ||
            eCode === cleanId ||
            eSlug === cleanId ||
            eId === `exam-${cleanId}` ||
            (cleanNoPrefix && (eId === cleanNoPrefix || eId === `exam-${cleanNoPrefix}`)) ||
            (cleanNormalized && (eCodeNormalized === cleanNormalized || eId.replace(/[^a-z0-9]/g, '') === cleanNormalized))
          );
        }) || null
      );
    },
    insertOne: async (exam: any): Promise<void> => {
      return withCollectionLock('exams.json', async () => {
        const exams = await db.exams.getAll();
        const existingIdx = exams.findIndex((e: any) => e.id === exam.id);
        if (existingIdx >= 0) {
          exams[existingIdx] = { ...exams[existingIdx], ...exam, updatedAt: new Date().toISOString() };
        } else {
          exams.unshift({ ...exam, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
        await writeJsonFile('exams.json', exams);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      return withCollectionLock('exams.json', async () => {
        const cleanId = String(id || '').trim().toLowerCase();
        const cleanNoPrefix = cleanId.startsWith('exam-') ? cleanId.substring(5) : cleanId;
        const exams = await db.exams.getAll();
        const idx = exams.findIndex((e: any) => {
          if (!e) return false;
          const eId = String(e.id || '').trim().toLowerCase();
          const eCode = String(e.examCode || '').trim().toLowerCase();
          return eId === cleanId || eCode === cleanId || eId === cleanNoPrefix || eId === `exam-${cleanId}`;
        });
        if (idx !== -1) {
          exams[idx] = { ...exams[idx], ...fields, updatedAt: new Date().toISOString() };
          await writeJsonFile('exams.json', exams);
        }
      });
    },
    deleteOne: async (id: string): Promise<void> => {
      return withCollectionLock('exams.json', async () => {
        let exams = await db.exams.getAll();
        exams = exams.filter((e: any) => e.id !== id);
        await writeJsonFile('exams.json', exams);
        try {
          await db.examAttempts.deleteByExamId(id);
        } catch (e) {
          console.error('Error cascading attempt deletion for exam:', e);
        }
      });
    },
    deleteAll: async (): Promise<number> => {
      return withCollectionLock('exams.json', async () => {
        const exams = await db.exams.getAll();
        const count = exams.length;
        await writeJsonFile('exams.json', []);
        await writeJsonFile('exam_attempts.json', []);
        await writeJsonFile('exam_security_logs.json', []);
        return count;
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('exams.json', async () => {
        await writeJsonFile('exams.json', data);
      });
    }
  },
  examAttempts: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('exam_attempts.json', []);
    },
    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const attempts = await db.examAttempts.getAll();
      return attempts.find((a: any) => a.id === id) || null;
    },
    getByExamId: async (examId: string): Promise<any[]> => {
      if (!examId) return [];
      const attempts = await db.examAttempts.getAll();
      return attempts.filter((a: any) => a.examId === examId);
    },
    getBySessionToken: async (token: string): Promise<any | null> => {
      if (!token) return null;
      const attempts = await db.examAttempts.getAll();
      return attempts.find((a: any) => a.sessionToken === token) || null;
    },
    getByRollAndExam: async (rollNumber: string, examId: string): Promise<any | null> => {
      if (!rollNumber || !examId) return null;
      const attempts = await db.examAttempts.getAll();
      const matching = attempts.filter(
        (a: any) => a.examId === examId && a.rollNumber?.toLowerCase() === rollNumber?.toLowerCase()
      );
      if (matching.length === 0) return null;
      return matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    },
    insertOne: async (attempt: any): Promise<void> => {
      return withCollectionLock('exam_attempts.json', async () => {
        const attempts = await db.examAttempts.getAll();
        attempts.unshift(attempt);
        await writeJsonFile('exam_attempts.json', attempts);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<any | null> => {
      return withCollectionLock('exam_attempts.json', async () => {
        const attempts = await db.examAttempts.getAll();
        const idx = attempts.findIndex((a: any) => a.id === id);
        if (idx !== -1) {
          attempts[idx] = { ...attempts[idx], ...fields, updatedAt: new Date().toISOString() };
          await writeJsonFile('exam_attempts.json', attempts);
          return attempts[idx];
        }
        return null;
      });
    },
    deleteById: async (id: string): Promise<void> => {
      return withCollectionLock('exam_attempts.json', async () => {
        let attempts = await db.examAttempts.getAll();
        attempts = attempts.filter((a: any) => a.id !== id);
        await writeJsonFile('exam_attempts.json', attempts);
        try {
          let secLogs = await db.examSecurityLogs.getAll();
          secLogs = secLogs.filter((l: any) => l.attemptId !== id);
          await writeJsonFile('exam_security_logs.json', secLogs);
        } catch (e) {
          console.error('Error cleaning security logs for deleted attempt:', e);
        }
      });
    },
    deleteMany: async (ids: string[]): Promise<number> => {
      return withCollectionLock('exam_attempts.json', async () => {
        const idSet = new Set(ids);
        let attempts = await db.examAttempts.getAll();
        const beforeCount = attempts.length;
        attempts = attempts.filter((a: any) => !idSet.has(a.id));
        await writeJsonFile('exam_attempts.json', attempts);
        try {
          let secLogs = await db.examSecurityLogs.getAll();
          secLogs = secLogs.filter((l: any) => !idSet.has(l.attemptId));
          await writeJsonFile('exam_security_logs.json', secLogs);
        } catch (e) {
          console.error('Error cleaning security logs for deleted attempts:', e);
        }
        return beforeCount - attempts.length;
      });
    },
    deleteByExamId: async (examId: string, filterStatus?: string[]): Promise<number> => {
      return withCollectionLock('exam_attempts.json', async () => {
        let attempts = await db.examAttempts.getAll();
        const beforeCount = attempts.length;
        const statusSet = filterStatus && filterStatus.length > 0 ? new Set(filterStatus) : null;
        
        const removedAttemptIds = new Set<string>();
        attempts = attempts.filter((a: any) => {
          if (a.examId === examId) {
            if (!statusSet || statusSet.has(a.status)) {
              removedAttemptIds.add(a.id);
              return false;
            }
          }
          return true;
        });
        await writeJsonFile('exam_attempts.json', attempts);
        try {
          let secLogs = await db.examSecurityLogs.getAll();
          secLogs = secLogs.filter((l: any) => !removedAttemptIds.has(l.attemptId));
          await writeJsonFile('exam_security_logs.json', secLogs);
        } catch (e) {
          console.error('Error cleaning security logs for deleted exam attempts:', e);
        }
        return beforeCount - attempts.length;
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('exam_attempts.json', async () => {
        await writeJsonFile('exam_attempts.json', data);
      });
    }
  },
  examSecurityLogs: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('exam_security_logs.json', []);
    },
    getByAttemptId: async (attemptId: string): Promise<any[]> => {
      const logs = await db.examSecurityLogs.getAll();
      return logs.filter((l: any) => l.attemptId === attemptId);
    },
    getByExamId: async (examId: string): Promise<any[]> => {
      const logs = await db.examSecurityLogs.getAll();
      return logs.filter((l: any) => l.examId === examId);
    },
    insertOne: async (log: any): Promise<void> => {
      return withCollectionLock('exam_security_logs.json', async () => {
        const logs = await db.examSecurityLogs.getAll();
        logs.unshift(log);
        await writeJsonFile('exam_security_logs.json', logs);
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('exam_security_logs.json', async () => {
        await writeJsonFile('exam_security_logs.json', data);
      });
    }
  },
  examAuditLogs: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('exam_audit_logs.json', []);
    },
    getByExamId: async (examId: string): Promise<any[]> => {
      const logs = await db.examAuditLogs.getAll();
      return logs.filter((l: any) => l.examId === examId);
    },
    insertOne: async (log: any): Promise<void> => {
      return withCollectionLock('exam_audit_logs.json', async () => {
        const logs = await db.examAuditLogs.getAll();
        logs.unshift(log);
        await writeJsonFile('exam_audit_logs.json', logs);
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('exam_audit_logs.json', async () => {
        await writeJsonFile('exam_audit_logs.json', data);
      });
    }
  },
  examCandidates: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('exam_candidates.json', []);
    },
    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const candidates = await db.examCandidates.getAll();
      return candidates.find((c: any) => c.id === id) || null;
    },
    getByExamId: async (examId: string): Promise<any[]> => {
      if (!examId) return [];
      const candidates = await db.examCandidates.getAll();
      return candidates.filter((c: any) => c.examId === examId);
    },
    getByEmail: async (email: string): Promise<any[]> => {
      if (!email) return [];
      const clean = email.trim().toLowerCase();
      const candidates = await db.examCandidates.getAll();
      return candidates.filter((c: any) => c.email?.toLowerCase() === clean);
    },
    getByEmailAndExam: async (email: string, examId: string): Promise<any | null> => {
      if (!email || !examId) return null;
      const clean = email.trim().toLowerCase();
      const candidates = await db.examCandidates.getAll();
      return candidates.find((c: any) => c.email?.toLowerCase() === clean && c.examId === examId) || null;
    },
    insertOne: async (candidate: any): Promise<void> => {
      return withCollectionLock('exam_candidates.json', async () => {
        const candidates = await db.examCandidates.getAll();
        candidates.unshift(candidate);
        await writeJsonFile('exam_candidates.json', candidates);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<any | null> => {
      return withCollectionLock('exam_candidates.json', async () => {
        const candidates = await db.examCandidates.getAll();
        const idx = candidates.findIndex((c: any) => c.id === id);
        if (idx !== -1) {
          candidates[idx] = { ...candidates[idx], ...fields, updatedAt: new Date().toISOString() };
          await writeJsonFile('exam_candidates.json', candidates);
          return candidates[idx];
        }
        return null;
      });
    },
    deleteById: async (id: string): Promise<void> => {
      return withCollectionLock('exam_candidates.json', async () => {
        let candidates = await db.examCandidates.getAll();
        candidates = candidates.filter((c: any) => c.id !== id);
        await writeJsonFile('exam_candidates.json', candidates);
      });
    },
    deleteByExamId: async (examId: string): Promise<number> => {
      return withCollectionLock('exam_candidates.json', async () => {
        let candidates = await db.examCandidates.getAll();
        const before = candidates.length;
        candidates = candidates.filter((c: any) => c.examId !== examId);
        await writeJsonFile('exam_candidates.json', candidates);
        return before - candidates.length;
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('exam_candidates.json', async () => {
        await writeJsonFile('exam_candidates.json', data);
      });
    }
  },
  emailLogs: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('email_logs.json', []);
    },
    getById: async (id: string): Promise<any | null> => {
      const logs = await db.emailLogs.getAll();
      return logs.find((l: any) => l.id === id) || null;
    },
    getByType: async (type: string): Promise<any[]> => {
      const logs = await db.emailLogs.getAll();
      return logs.filter((l: any) => l.type === type);
    },
    getByStatus: async (status: string): Promise<any[]> => {
      const logs = await db.emailLogs.getAll();
      return logs.filter((l: any) => l.status === status);
    },
    insertOne: async (log: any): Promise<void> => {
      return withCollectionLock('email_logs.json', async () => {
        const logs = await db.emailLogs.getAll();
        logs.unshift(log);
        await writeJsonFile('email_logs.json', logs.slice(0, 1000));
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      return withCollectionLock('email_logs.json', async () => {
        const logs = await db.emailLogs.getAll();
        const idx = logs.findIndex((l: any) => l.id === id);
        if (idx !== -1) {
          logs[idx] = { ...logs[idx], ...fields };
          await writeJsonFile('email_logs.json', logs);
        }
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('email_logs.json', async () => {
        await writeJsonFile('email_logs.json', data);
      });
    },
    deleteById: async (id: string): Promise<void> => {
      return withCollectionLock('email_logs.json', async () => {
        let logs = await db.emailLogs.getAll();
        logs = logs.filter((l: any) => l.id !== id);
        await writeJsonFile('email_logs.json', logs);
      });
    }
  },
  emailTemplates: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('email_templates.json', []);
    },
    getByType: async (type: string): Promise<any | null> => {
      const templates = await db.emailTemplates.getAll();
      return templates.find((t: any) => t.type === type) || null;
    },
    upsert: async (template: any): Promise<void> => {
      return withCollectionLock('email_templates.json', async () => {
        const templates = await db.emailTemplates.getAll();
        const idx = templates.findIndex((t: any) => t.id === template.id || t.type === template.type);
        if (idx !== -1) {
          templates[idx] = { ...templates[idx], ...template, updatedAt: new Date().toISOString() };
        } else {
          templates.push({ ...template, updatedAt: new Date().toISOString() });
        }
        await writeJsonFile('email_templates.json', templates);
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('email_templates.json', async () => {
        await writeJsonFile('email_templates.json', data);
      });
    }
  },
  emailAutomationSettings: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('email_automation_settings.json', []);
    },
    getByType: async (eventType: string): Promise<any | null> => {
      const settings = await db.emailAutomationSettings.getAll();
      return settings.find((s: any) => s.eventType === eventType) || null;
    },
    setSetting: async (eventType: string, isEnabled: boolean, updatedBy?: string): Promise<void> => {
      return withCollectionLock('email_automation_settings.json', async () => {
        const settings = await db.emailAutomationSettings.getAll();
        const idx = settings.findIndex((s: any) => s.eventType === eventType);
        if (idx !== -1) {
          settings[idx] = {
            ...settings[idx],
            isEnabled,
            updatedBy: updatedBy || 'admin',
            updatedAt: new Date().toISOString()
          };
        } else {
          settings.push({
            id: `auto-${eventType}`,
            eventType,
            isEnabled,
            updatedBy: updatedBy || 'admin',
            updatedAt: new Date().toISOString()
          });
        }
        await writeJsonFile('email_automation_settings.json', settings);
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('email_automation_settings.json', async () => {
        await writeJsonFile('email_automation_settings.json', data);
      });
    }
  },
  foundingMemberFormConfig: {
    getConfig: async (): Promise<any> => {
      const defaultConfig = {
        id: 'founding-members-default-form',
        title: 'Founding Members Registration Form',
        description: 'Official registration and profile record for Founding Members of AWS Student Builder Group (CU-UP).',
        status: 'Published',
        publishedUrl: 'https://www.awssbgcuup.tech/founding-members/form',
        version: 1,
        updatedAt: new Date().toISOString(),
        questions: []
      };
      return await readJsonFile<any>('founding_member_form_config.json', defaultConfig);
    },
    saveConfig: async (config: any): Promise<void> => {
      return withCollectionLock('founding_member_form_config.json', async () => {
        await writeJsonFile('founding_member_form_config.json', {
          ...config,
          updatedAt: new Date().toISOString()
        });
      });
    }
  },
  foundingMembers: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('founding_members.json', []);
    },
    getById: async (id: string): Promise<any | null> => {
      const list = await db.foundingMembers.getAll();
      return list.find((m: any) => m.id === id) || null;
    },
    getByMemberId: async (memberId: string): Promise<any | null> => {
      if (!memberId) return null;
      const list = await db.foundingMembers.getAll();
      const norm = String(memberId).trim().toUpperCase();
      return list.find((m: any) => String(m.memberId || '').trim().toUpperCase() === norm) || null;
    },
    getByToken: async (token: string): Promise<any | null> => {
      if (!token) return null;
      const list = await db.foundingMembers.getAll();
      return list.find((m: any) => m.formToken && m.formToken.trim() === token.trim()) || null;
    },
    getByEmail: async (email: string): Promise<any | null> => {
      const list = await db.foundingMembers.getAll();
      const norm = String(email || '').trim().toLowerCase();
      return list.find((m: any) => String(m.email || '').trim().toLowerCase() === norm) || null;
    },
    getNextMemberId: async (): Promise<string> => {
      const list = await db.foundingMembers.getAll();
      let maxNum = 0;
      for (const m of list) {
        const idStr = String(m.memberId || '');
        const match = idStr.match(/FMB-CUUP-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      const nextNum = maxNum + 1;
      return `FMB-CUUP-${String(nextNum).padStart(3, '0')}`;
    },
    insertOne: async (member: any): Promise<void> => {
      return withCollectionLock('founding_members.json', async () => {
        const list = await db.foundingMembers.getAll();
        if (!member.memberId) {
          let maxNum = 0;
          for (const m of list) {
            const match = String(m.memberId || '').match(/FMB-CUUP-(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          }
          member.memberId = `FMB-CUUP-${String(maxNum + 1).padStart(3, '0')}`;
        }
        list.push(member);
        await writeJsonFile('founding_members.json', list);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      return withCollectionLock('founding_members.json', async () => {
        const list = await db.foundingMembers.getAll();
        const idx = list.findIndex((m: any) => m.id === id);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            ...fields,
            updatedAt: new Date().toISOString()
          };
          await writeJsonFile('founding_members.json', list);
        }
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('founding_members.json', async () => {
        await writeJsonFile('founding_members.json', data);
      });
    },
    deleteById: async (id: string): Promise<void> => {
      return withCollectionLock('founding_members.json', async () => {
        let list = await db.foundingMembers.getAll();
        list = list.filter((m: any) => m.id !== id);
        await writeJsonFile('founding_members.json', list);
      });
    }
  },
  weeklyQuizzes: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('weekly_quizzes.json', DEFAULT_WEEKLY_QUIZZES);
    },
    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const list = await db.weeklyQuizzes.getAll();
      return list.find((q: any) => q.id === id || q.quizCode?.toLowerCase() === id.toLowerCase()) || null;
    },
    insertOne: async (quiz: any): Promise<void> => {
      return withCollectionLock('weekly_quizzes.json', async () => {
        const list = await db.weeklyQuizzes.getAll();
        list.unshift(quiz);
        await writeJsonFile('weekly_quizzes.json', list);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<any | null> => {
      return withCollectionLock('weekly_quizzes.json', async () => {
        const list = await db.weeklyQuizzes.getAll();
        const idx = list.findIndex((q: any) => q.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...fields, updatedAt: new Date().toISOString() };
          await writeJsonFile('weekly_quizzes.json', list);
          return list[idx];
        }
        return null;
      });
    },
    deleteOne: async (id: string): Promise<void> => {
      return withCollectionLock('weekly_quizzes.json', async () => {
        let list = await db.weeklyQuizzes.getAll();
        list = list.filter((q: any) => q.id !== id);
        await writeJsonFile('weekly_quizzes.json', list);
        try {
          await db.weeklyQuizAttempts.deleteByQuizId(id);
        } catch (e) {
          console.error('Error cascading attempt deletion for weekly quiz:', e);
        }
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('weekly_quizzes.json', async () => {
        await writeJsonFile('weekly_quizzes.json', data);
      });
    }
  },
  weeklyQuizAttempts: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('weekly_quiz_attempts.json', []);
    },
    getById: async (id: string): Promise<any | null> => {
      if (!id) return null;
      const list = await db.weeklyQuizAttempts.getAll();
      return list.find((a: any) => a.id === id) || null;
    },
    getByQuizId: async (quizId: string): Promise<any[]> => {
      if (!quizId) return [];
      const list = await db.weeklyQuizAttempts.getAll();
      return list.filter((a: any) => a.quizId === quizId);
    },
    getBySessionToken: async (token: string): Promise<any | null> => {
      if (!token) return null;
      const list = await db.weeklyQuizAttempts.getAll();
      return list.find((a: any) => a.sessionToken === token) || null;
    },
    getByEmailAndQuiz: async (email: string, quizId: string): Promise<any | null> => {
      if (!email || !quizId) return null;
      const cleanEmail = email.trim().toLowerCase();
      const list = await db.weeklyQuizAttempts.getAll();
      const matching = list.filter(
        (a: any) => a.quizId === quizId && a.email?.toLowerCase() === cleanEmail
      );
      if (matching.length === 0) return null;
      return matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    },
    insertOne: async (attempt: any): Promise<void> => {
      return withCollectionLock('weekly_quiz_attempts.json', async () => {
        const list = await db.weeklyQuizAttempts.getAll();
        list.unshift(attempt);
        await writeJsonFile('weekly_quiz_attempts.json', list);
      });
    },
    updateOne: async (id: string, fields: Partial<any>): Promise<any | null> => {
      return withCollectionLock('weekly_quiz_attempts.json', async () => {
        const list = await db.weeklyQuizAttempts.getAll();
        const idx = list.findIndex((a: any) => a.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...fields, updatedAt: new Date().toISOString() };
          await writeJsonFile('weekly_quiz_attempts.json', list);
          return list[idx];
        }
        return null;
      });
    },
    deleteById: async (id: string): Promise<void> => {
      return withCollectionLock('weekly_quiz_attempts.json', async () => {
        let list = await db.weeklyQuizAttempts.getAll();
        list = list.filter((a: any) => a.id !== id);
        await writeJsonFile('weekly_quiz_attempts.json', list);
      });
    },
    deleteByQuizId: async (quizId: string): Promise<number> => {
      return withCollectionLock('weekly_quiz_attempts.json', async () => {
        let list = await db.weeklyQuizAttempts.getAll();
        const before = list.length;
        list = list.filter((a: any) => a.quizId !== quizId);
        await writeJsonFile('weekly_quiz_attempts.json', list);
        return before - list.length;
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('weekly_quiz_attempts.json', async () => {
        await writeJsonFile('weekly_quiz_attempts.json', data);
      });
    }
  },
  weeklyQuizSecurityEvents: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('weekly_quiz_security_events.json', []);
    },
    getByAttemptId: async (attemptId: string): Promise<any[]> => {
      const logs = await db.weeklyQuizSecurityEvents.getAll();
      return logs.filter((l: any) => l.attemptId === attemptId);
    },
    getByQuizId: async (quizId: string): Promise<any[]> => {
      const logs = await db.weeklyQuizSecurityEvents.getAll();
      return logs.filter((l: any) => l.quizId === quizId);
    },
    insertOne: async (event: any): Promise<void> => {
      return withCollectionLock('weekly_quiz_security_events.json', async () => {
        const logs = await db.weeklyQuizSecurityEvents.getAll();
        logs.unshift(event);
        await writeJsonFile('weekly_quiz_security_events.json', logs.slice(0, 5000));
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('weekly_quiz_security_events.json', async () => {
        await writeJsonFile('weekly_quiz_security_events.json', data);
      });
    }
  },
  weeklyQuizAuditLogs: {
    getAll: async (): Promise<any[]> => {
      return await readJsonFile<any[]>('weekly_quiz_audit_logs.json', []);
    },
    getByQuizId: async (quizId: string): Promise<any[]> => {
      const logs = await db.weeklyQuizAuditLogs.getAll();
      return logs.filter((l: any) => l.quizId === quizId);
    },
    insertOne: async (log: any): Promise<void> => {
      return withCollectionLock('weekly_quiz_audit_logs.json', async () => {
        const logs = await db.weeklyQuizAuditLogs.getAll();
        logs.unshift(log);
        await writeJsonFile('weekly_quiz_audit_logs.json', logs.slice(0, 2000));
      });
    },
    saveAll: async (data: any[]): Promise<void> => {
      return withCollectionLock('weekly_quiz_audit_logs.json', async () => {
        await writeJsonFile('weekly_quiz_audit_logs.json', data);
      });
    }
  },
  weeklyQuizSettings: {
    getSettings: async (): Promise<any> => {
      const defaultSettings = {
        requireWebcam: true,
        requireMicrophone: true,
        requireFaceDetection: true,
        detectMultipleFaces: true,
        requireFullscreen: true,
        monitorFocus: true,
        noFaceThresholdSeconds: 6,
        multipleFacesThresholdSeconds: 4,
        cameraGracePeriodSeconds: 30,
        fullscreenGracePeriodSeconds: 15,
        updatedAt: new Date().toISOString()
      };
      return await readJsonFile<any>('weekly_quiz_settings.json', defaultSettings);
    },
    updateSettings: async (settings: Partial<any>): Promise<any> => {
      return withCollectionLock('weekly_quiz_settings.json', async () => {
        const current = await db.weeklyQuizSettings.getSettings();
        const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
        await writeJsonFile('weekly_quiz_settings.json', updated);
        return updated;
      });
    }
  },
  maintenanceSettings: {
    getSettings: async (): Promise<{
      maintenanceMode: boolean;
      headline: string;
      message: string;
      estimatedReturn?: string;
      updatedAt?: string;
      updatedBy?: string;
    }> => {
      const defaultSettings = {
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
        headline: 'Website Temporarily Unavailable',
        message: "We're currently performing scheduled maintenance and improvements. Please check back shortly.",
        estimatedReturn: '',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      };
      const saved = await readJsonFile<any>('maintenance_settings.json', null);
      if (!saved) {
        return defaultSettings;
      }
      // If environment variable explicitly forces true, respect emergency fallback
      if (process.env.MAINTENANCE_MODE === 'true') {
        return { ...saved, maintenanceMode: true };
      }
      return {
        ...defaultSettings,
        ...saved,
        maintenanceMode: typeof saved.maintenanceMode === 'boolean' ? saved.maintenanceMode : false
      };
    },
    updateSettings: async (settings: Partial<any>): Promise<any> => {
      return withCollectionLock('maintenance_settings.json', async () => {
        const current = await db.maintenanceSettings.getSettings();
        const updated = {
          ...current,
          ...settings,
          updatedAt: new Date().toISOString()
        };
        await writeJsonFile('maintenance_settings.json', updated);
        return updated;
      });
    }
  }
};
