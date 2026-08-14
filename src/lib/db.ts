import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

// PostgreSQL integration
let sql: any = null;
if (process.env.DATABASE_URL) {
  try {
    const postgres = require('postgres');
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30
    });
  } catch (err) {
    console.error('Failed to initialize postgres client:', err);
  }
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
  } catch (err) {
    console.error('Failed to ensure kv_store table exists in PostgreSQL:', err);
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
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at)`;
    
    // Run migration checks
    await migrateRegistrationsToPostgres();
  } catch (err) {
    console.error('Failed to ensure registrations table exists in PostgreSQL:', err);
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

// Generic read/write functions
async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
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
  if (process.env.DATABASE_URL) {
    const val = await readPostgres(filename, defaultValue);
    memoryDbCache[filename] = {
      data: val,
      expiresAt: Date.now() + CACHE_TTL_MS
    };
    return val;
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

  // 4. Default Local File Fallback
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    await writeJsonFile(filename, defaultValue);
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data) as T;
    memoryDbCache[filename] = {
      data: parsed,
      expiresAt: Date.now() + CACHE_TTL_MS
    };
    return parsed;
  } catch (err) {
    console.error(`Error reading database file: ${filename}`, err);
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  // Update memory cache immediately
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
  if (process.env.DATABASE_URL) {
    await writePostgres(filename, data);
    return;
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

  // 4. Default Local File Fallback
  const filePath = path.join(DB_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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
    speaker: 'TBA',
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

// Database APIs
export const db = {
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
            notes: r.notes,
            date: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          }));
        } catch (err) {
          console.error('Postgres error in eventRegistrations.getAll:', err);
          throw err;
        }
      }
      return await readJsonFile<any[]>('event_registrations.json', []);
    },

    insertOne: async (reg: any): Promise<void> => {
      if (sql) {
        await ensureRegistrationsTable();
        const interestsStr = Array.isArray(reg.interests) ? JSON.stringify(reg.interests) : JSON.stringify([reg.interests]);
        try {
          await sql`
            INSERT INTO registrations (
              id, event_id, name, email, phone, university, program, year, student_id,
              interests, experience_level, linkedin, github, motivation, consent,
              status, notes, created_at
            ) VALUES (
              ${reg.id}, ${reg.eventId}, ${reg.name}, ${reg.email}, ${reg.phone || ''},
              ${reg.university}, ${reg.program}, ${reg.year}, ${reg.studentId || ''},
              ${interestsStr}, ${reg.experienceLevel || 'Beginner'}, ${reg.linkedin || ''},
              ${reg.github || ''}, ${reg.motivation || ''}, ${!!reg.consent},
              ${reg.status || 'New'}, ${reg.notes || ''}, ${reg.date || new Date().toISOString()}
            )
          `;
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.insertOne:', err);
          throw err;
        }
      }
      const data = await readJsonFile<any[]>('event_registrations.json', []);
      data.push(reg);
      await writeJsonFile('event_registrations.json', data);
    },

    updateOne: async (id: string, fields: Partial<any>): Promise<void> => {
      if (sql) {
        await ensureRegistrationsTable();
        try {
          if (fields.status !== undefined && fields.notes !== undefined) {
            await sql`
              UPDATE registrations
              SET status = ${fields.status}, notes = ${fields.notes}
              WHERE id = ${id}
            `;
          } else if (fields.status !== undefined) {
            await sql`
              UPDATE registrations
              SET status = ${fields.status}
              WHERE id = ${id}
            `;
          } else if (fields.notes !== undefined) {
            await sql`
              UPDATE registrations
              SET notes = ${fields.notes}
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
        await writeJsonFile('event_registrations.json', data);
      }
    },

    deleteOne: async (id: string): Promise<void> => {
      if (sql) {
        await ensureRegistrationsTable();
        try {
          await sql`
            DELETE FROM registrations WHERE id = ${id}
          `;
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.deleteOne:', err);
          throw err;
        }
      }
      let data = await readJsonFile<any[]>('event_registrations.json', []);
      data = data.filter(r => r.id !== id);
      await writeJsonFile('event_registrations.json', data);
    },

    deleteByEventId: async (eventId: string): Promise<void> => {
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
                status, notes, created_at
              ) VALUES (
                ${reg.id}, ${reg.eventId || reg.event_id}, ${reg.name}, ${reg.email}, ${reg.phone || ''},
                ${reg.university}, ${reg.program}, ${reg.year}, ${reg.studentId || reg.student_id || ''},
                ${interestsStr}, ${reg.experienceLevel || 'Beginner'}, ${reg.linkedin || ''},
                ${reg.github || ''}, ${reg.motivation || ''}, ${!!reg.consent},
                ${reg.status || 'New'}, ${reg.notes || ''}, ${reg.date || reg.created_at || new Date().toISOString()}
              )
            `;
          }
          return;
        } catch (err) {
          console.error('Postgres error in eventRegistrations.saveAll:', err);
          throw err;
        }
      }
      await writeJsonFile('event_registrations.json', data);
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
  }
};
