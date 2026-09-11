import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import postgres from 'postgres';

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
  } catch (err) {
    console.error('Failed to ensure kv_store table exists in PostgreSQL:', err);
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
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        university VARCHAR(255),
        program VARCHAR(255),
        graduation_year VARCHAR(50),
        student_id VARCHAR(255),
        resume_url TEXT,
        linkedin VARCHAR(255),
        github VARCHAR(255),
        portfolio VARCHAR(255),
        skills TEXT,
        experience TEXT,
        motivation TEXT,
        cover_letter TEXT,
        additional_information TEXT,
        consent BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'New',
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
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
    filename === 'exam_audit_logs.json'
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

  const isRealtime = isRealtimeCollection(filename);
  if (!isRealtime) {
    const cached = memoryDbCache[filename];
    if (cached !== undefined && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
  }

  // 1. Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const val = await readKv(filename, defaultValue);
    if (!isRealtime) {
      memoryDbCache[filename] = {
        data: val,
        expiresAt: Date.now() + CACHE_TTL_MS
      };
    }
    return val;
  }

  // 2. Try PostgreSQL
  if (hasConfiguredDatabase()) {
    if (!sql) {
      console.warn(`A PostgreSQL connection string is configured but the PG client is unavailable for ${filename}; falling back to local JSON storage.`);
    } else {
      try {
        const val = await readPostgres(filename, defaultValue);
        if (!isRealtime) {
          memoryDbCache[filename] = {
            data: val,
            expiresAt: Date.now() + CACHE_TTL_MS
          };
        }
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
          if (!isRealtime) {
            memoryDbCache[filename] = {
              data: parsed,
              expiresAt: Date.now() + CACHE_TTL_MS
            };
          }
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

  // Always invalidate stale snapshot before writing, then update cache to the new value.
  invalidateMemoryCache(filename);
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

  // 4. Local file fallback only when no database backend is configured.
  const filePath = path.join(DB_DIR, filename);
  const tmpPath = path.join(DB_DIR, `.${filename}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpPath, filePath);
    } catch {
      // In Windows, if renameSync fails due to file lock, copy and delete
      fs.copyFileSync(tmpPath, filePath);
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  } catch (err) {
    console.error(`Error writing database file: ${filename}`, err);
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
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
    benefits: 'Leadership experience\nCommunity-building exposure\nNetworking and skill development\nOpportunity to shape the AWS Student Builder Group',
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
    name: 'Krishnam',
    role: 'Technical Lead, Cloud & Infrastructure',
    bio: 'Manages core cloud repositories, VPC infrastructures, server deployment environments, and local builder laboratories.',
    initials: 'K',
    displayOrder: 1,
    status: 'Published'
  },
  {
    id: 'team-ayush',
    name: 'Ayush Pandey',
    role: 'Events & Operations Lead',
    bio: 'Coordinates event registration clearances, technical workshop layouts, logistics schedules, and local project mock reviews.',
    initials: 'AP',
    displayOrder: 2,
    status: 'Published'
  },
  {
    id: 'team-priyanshu',
    name: 'Priyanshu Kumar',
    role: 'Marketing & Community Outreach Lead',
    bio: 'Manages outreach communications, educational platform partners, panel liaison schedules, and student enrollment pipelines.',
    initials: 'PK',
    displayOrder: 3,
    status: 'Published'
  },
  {
    id: 'team-aakarshan',
    name: 'Aakarshan Agnihotri',
    role: 'Content & Documentation Lead',
    bio: 'Drafts learning resource listings, event slide repositories, documentation templates, and official community logs.',
    initials: 'AA',
    displayOrder: 4,
    status: 'Published'
  },
  {
    id: 'team-ananya',
    name: 'Ananya Shukla',
    role: 'Design & Creative Lead',
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
    saveAll: async (data: any[]) => await writeJsonFile('notifications.json', data)
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
        return rows.map((r: any) => ({
          id: r.id,
          opportunityId: r.opportunity_id,
          name: r.name,
          email: r.email,
          phone: r.phone || '',
          university: r.university || '',
          program: r.program || '',
          graduationYear: r.graduation_year || '',
          studentId: r.student_id || '',
          resumeUrl: r.resume_url || '',
          linkedin: r.linkedin || '',
          github: r.github || '',
          portfolio: r.portfolio || '',
          skills: r.skills || '',
          experience: r.experience || '',
          motivation: r.motivation || '',
          coverLetter: r.cover_letter || '',
          additionalInformation: r.additional_information || '',
          consent: Boolean(r.consent),
          status: r.status || 'New',
          adminNotes: r.admin_notes || '',
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        }));
      }
      return await readJsonFile<any[]>('career_applications.json', []);
    },
    getByOpportunityId: async (opportunityId: string): Promise<any[]> => {
      const rows = await db.careerApplications.getAll();
      return rows.filter((application: any) => application.opportunityId === opportunityId);
    },
    insertOne: async (application: any): Promise<void> => {
      if (hasConfiguredDatabase() && !sql) {
        throw new Error('A PostgreSQL connection string is configured but the PostgreSQL client failed to initialize.');
      }
      if (sql) {
        await ensureCareerApplicationsTable();
        await sql`
          INSERT INTO career_applications (
            id, opportunity_id, name, email, phone, university, program, graduation_year, student_id,
            resume_url, linkedin, github, portfolio, skills, experience, motivation, cover_letter,
            additional_information, consent, status, admin_notes, created_at, updated_at
          ) VALUES (
            ${application.id}, ${application.opportunityId}, ${application.name}, ${application.email}, ${application.phone || ''}, ${application.university || ''}, ${application.program || ''}, ${application.graduationYear || ''}, ${application.studentId || ''},
            ${application.resumeUrl || ''}, ${application.linkedin || ''}, ${application.github || ''}, ${application.portfolio || ''}, ${application.skills || ''}, ${application.experience || ''}, ${application.motivation || ''}, ${application.coverLetter || ''}, ${application.additionalInformation || ''},
            ${Boolean(application.consent)}, ${application.status || 'New'}, ${application.adminNotes || ''}, ${application.createdAt || new Date().toISOString()}, ${application.updatedAt || new Date().toISOString()}
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
        await sql`
          UPDATE career_applications
          SET
            status = ${fields.status !== undefined ? fields.status : sql`status`},
            admin_notes = ${fields.adminNotes !== undefined ? fields.adminNotes : sql`admin_notes`},
            updated_at = ${new Date().toISOString()}
          WHERE id = ${id}
        `;
        return;
      }
      const data = await readJsonFile<any[]>('career_applications.json', []);
      const idx = data.findIndex((application: any) => application.id === id);
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...fields, updatedAt: new Date().toISOString() };
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
      await writeJsonFile('career_applications.json', data);
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
  }
};
