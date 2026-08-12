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

// Generic read/write functions
function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filename, defaultValue);
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading database file: ${filename}`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
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
      username: 'admin',
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
    status: 'Planned',
    date: 'August 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
    status: 'Planned',
    date: 'September 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
    status: 'Planned',
    date: 'November 2026',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
    status: 'Planned',
    date: 'January 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
      'Detailed breakdown of the AWS Certified Cloud Practitioner domains',
      'Revising VPC structures, security groups, and billing models',
      'Attempting mock questions and reviewing incorrect answers',
      'Career guidance and certification discount strategies'
    ],
    status: 'Planned',
    date: 'February 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
    status: 'Planned',
    date: 'April 2027',
    time: 'TBA',
    venue: 'TBA',
    speaker: 'TBA',
    registrationLink: '',
    image: ''
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
    getAll: () => readJsonFile('admin_users.json', DEFAULT_ADMINS()),
    saveAll: (data: any) => writeJsonFile('admin_users.json', data)
  },
  registrations: {
    getAll: () => readJsonFile<any[]>('registrations.json', []),
    saveAll: (data: any[]) => writeJsonFile('registrations.json', data)
  },
  events: {
    getAll: () => readJsonFile<any[]>('events.json', DEFAULT_EVENTS),
    saveAll: (data: any[]) => writeJsonFile('events.json', data)
  },
  announcements: {
    getAll: () => readJsonFile<any[]>('announcements.json', []),
    saveAll: (data: any[]) => writeJsonFile('announcements.json', data)
  },
  resources: {
    getAll: () => readJsonFile<any[]>('resources.json', [
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
    saveAll: (data: any[]) => writeJsonFile('resources.json', data)
  },
  verificationRequests: {
    getAll: () => readJsonFile<any[]>('verification_requests.json', []),
    saveAll: (data: any[]) => writeJsonFile('verification_requests.json', data)
  },
  coreTeam: {
    getAll: () => readJsonFile<any[]>('core_team.json', DEFAULT_CORE_TEAM),
    saveAll: (data: any[]) => writeJsonFile('core_team.json', data)
  },
  collaborationRequests: {
    getAll: () => readJsonFile<any[]>('collaboration_requests.json', []),
    saveAll: (data: any[]) => writeJsonFile('collaboration_requests.json', data)
  },
  websiteContent: {
    get: () => readJsonFile('website_content.json', DEFAULT_CONTENT),
    save: (data: any) => writeJsonFile('website_content.json', data)
  },
  notifications: {
    getAll: () => readJsonFile<any[]>('notifications.json', []),
    saveAll: (data: any[]) => writeJsonFile('notifications.json', data)
  }
};
