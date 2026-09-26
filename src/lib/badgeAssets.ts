/**
 * Professional Vector Digital Badge Generator
 * Credly-grade digital credential emblem for AWS Student Builder Group – Chandigarh University Uttar Pradesh.
 * Featuring CloudXplore weekly AWS learning series branding, Cloud Practitioner Foundations achievement title,
 * SESSION COMPLETION ribbon, navy/orange DIGITAL CREDENTIAL pill, and bottom metadata section.
 */

export interface BadgePreset {
  id: string;
  title: string;
  category: string;
  series?: string;
  iconType: 'cloud' | 'architecture' | 'devops' | 'ai' | 'security' | 'leader';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultDescription: string;
  defaultCriteria: string;
  defaultSkills: string[];
}export const BADGE_PRESETS: BadgePreset[] = [
  {
    id: 'aws-cloud-foundations',
    title: 'Cloud Foundations',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'cloud',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Demonstrates verified foundational proficiency in AWS cloud computing, core infrastructure, compute, storage, security, and architectural principles.',
    defaultCriteria: 'Completed AWS Cloud Computing fundamentals curriculum, hands-on architectural labs, and scored 85%+ on technical evaluations.',
    defaultSkills: ['AWS Core Services', 'Amazon EC2', 'Amazon S3', 'AWS IAM', 'Cloud Architecture', 'AWS VPC']
  },
  {
    id: 'aws-solutions-architect',
    title: 'Solutions Architect Associate',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'architecture',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Validates expertise in designing resilient, high-performing, secure, and cost-optimized cloud architectures on AWS adhering to the Well-Architected Framework.',
    defaultCriteria: 'Successfully designed multi-tier cloud infrastructure, implemented automated failover and scaling, and completed the technical capstone review.',
    defaultSkills: ['High Availability', 'Auto Scaling', 'Amazon RDS', 'Serverless Architecture', 'VPC Peering', 'Route 53']
  },
  {
    id: 'aws-serverless-devops',
    title: 'Serverless & DevOps Specialist',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'devops',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Recognizes advanced mastery in automated CI/CD deployment pipelines, containerization, Infrastructure as Code, and event-driven serverless architectures.',
    defaultCriteria: 'Built and deployed automated CI/CD delivery pipelines using AWS CodePipeline, CloudFormation/CDK, Lambda microservices, and Docker containers.',
    defaultSkills: ['AWS Lambda', 'AWS CDK', 'CI/CD Pipelines', 'Amazon ECS', 'API Gateway', 'Infrastructure as Code']
  },
  {
    id: 'aws-ai-ml-bedrock',
    title: 'Generative AI & Bedrock Builder',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'ai',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Demonstrates practical skills in building generative AI applications, prompt engineering, RAG pipelines, and deploying foundation models with Amazon Bedrock.',
    defaultCriteria: 'Architected and deployed an intelligent application integrating Amazon Bedrock foundation models, vector embeddings, and serverless compute.',
    defaultSkills: ['Amazon Bedrock', 'Generative AI', 'Vector Databases', 'Prompt Engineering', 'LangChain', 'AWS Lambda']
  },
  {
    id: 'aws-cloud-security',
    title: 'Cloud Security Specialist',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'security',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Demonstrates specialized expertise in implementing enterprise cloud security controls, identity governance, data protection, and automated compliance policies.',
    defaultCriteria: 'Configured comprehensive security posture across AWS accounts including GuardDuty, Security Hub, KMS encryption, and IAM least-privilege policies.',
    defaultSkills: ['AWS IAM Policies', 'AWS KMS', 'Security Hub', 'CloudTrail', 'GuardDuty', 'Network Firewalls']
  },
  {
    id: 'aws-community-leader',
    title: 'Community Leader & Speaker',
    category: 'SESSION COMPLETION',
    series: 'WEEKLY AWS LEARNING SERIES',
    iconType: 'leader',
    primaryColor: '#07131F',
    secondaryColor: '#0D2235',
    accentColor: '#FF9900',
    defaultDescription: 'Awarded for outstanding leadership, mentoring student builders, delivering technical sessions, and advancing cloud computing excellence across the university.',
    defaultCriteria: 'Delivered technical cloud workshops, mentored student engineering teams, and contributed significantly to AWS Student Builder Group initiatives.',
    defaultSkills: ['Technical Mentorship', 'Public Speaking', 'Community Building', 'Cloud Evangelism', 'Workshop Delivery']
  }
];

/**
 * Splits badge title cleanly into 1 or 2 lines with optimal typography and line wrapping
 */
export function splitBadgeTitle(title: string): { line1: string; line2: string } {
  const clean = (title || 'Cloud Foundations').trim();
  if (clean.length <= 18) {
    return { line1: clean, line2: '' };
  }

  const keywords = [
    ' Foundations',
    ' Mastery',
    ' Associate',
    ' Specialist',
    ' Practitioner',
    ' Professional',
    ' Builder',
    ' Architect',
    ' Expert',
    ' Leader',
    ' Speaker'
  ];

  for (const kw of keywords) {
    const idx = clean.lastIndexOf(kw);
    if (idx > 0 && idx < clean.length) {
      return {
        line1: clean.substring(0, idx).trim(),
        line2: clean.substring(idx).trim()
      };
    }
  }

  const words = clean.split(' ');
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(' '),
      line2: words.slice(mid).join(' ')
    };
  }

  return { line1: clean, line2: '' };
}

/**
 * Generates an SVG string for a genuinely professional, human-designed Digital Credential Badge.
 * Features CloudXplore branding, AWS Student Builder Group header, prominent achievement title,
 * SESSION COMPLETION ribbon, subtle navy/orange DIGITAL CREDENTIAL pill, and clean balanced whitespace.
 */
export function generateBadgeSvg(options: {
  title?: string;
  category?: string;
  series?: string;
  iconType?: 'cloud' | 'architecture' | 'devops' | 'ai' | 'security' | 'leader';
  accentColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  issuer?: string;
  credentialId?: string;
  issueDate?: string;
}): string {
  const title = options.title || 'Cloud Foundations';
  const category = (options.category || 'SESSION COMPLETION').toUpperCase();
  const series = (options.series || 'WEEKLY AWS LEARNING SERIES').toUpperCase();
  const accent = options.accentColor || '#FF9900';
  const { line1, line2 } = splitBadgeTitle(title);

  // Dynamic font sizing
  const line1Len = line1.length;
  let line1FontSize = 19;
  if (line1Len > 22) line1FontSize = 14.5;
  else if (line1Len > 17) line1FontSize = 16.5;

  let line2FontSize = 14;
  if (line2 && line2.length > 18) line2FontSize = 12.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
    <defs>
      <!-- Drop Shadows -->
      <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
      </filter>

      <filter id="ribbonShadow" x="-10%" y="-15%" width="120%" height="135%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.25"/>
      </filter>
    </defs>

    <!-- ========================================== -->
    <!-- 1. CIRCULAR BASE & CONCENTRIC BORDERS -->
    <!-- ========================================== -->
    <g id="badge-base" filter="url(#badgeShadow)">
      <!-- Outer Deep Navy Circle -->
      <circle cx="250" cy="250" r="236" fill="#07131F" stroke="${accent}" stroke-width="5"/>

      <!-- Clean Inner Gold Accent Ring -->
      <circle cx="250" cy="250" r="225" fill="none" stroke="#FCD34D" stroke-width="1" opacity="0.4"/>

      <!-- Inner White Canvas Disc -->
      <circle cx="250" cy="250" r="215" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
    </g>

    <!-- ========================================== -->
    <!-- 2. TOP BRANDING: AWS SBG CU-UP (Centered Unit) -->
    <!-- ========================================== -->
    <g id="top-branding" transform="translate(250, 74)">
      <!-- AWS Vector Mark (Left aligned, crisp & clear) -->
      <g transform="translate(-92, -11) scale(0.92)">
        <!-- 'a' -->
        <path d="M6.5,13 C4.2,13 2.5,11.6 2.5,9.2 C2.5,6.8 4.8,6.2 7.2,6.2 C8.5,6.2 9.5,6.4 10.2,6.7 L10.2,5.8 C10.2,4.4 9,3.4 7.2,3.4 C5.8,3.4 4.8,4 4.2,4.6 L3,3.2 C4,2 5.6,1.2 7.5,1.2 C10.5,1.2 12.2,2.6 12.2,5.5 L12.2,13 L10.2,13 L10.2,11.6 C9.5,12.5 8,13 6.5,13 Z M7.2,11.4 C8.8,11.4 10.2,10.2 10.2,8.6 L10.2,7.7 C9.5,7.5 8.6,7.3 7.6,7.3 C6,7.3 4.6,8 4.6,9.2 C4.6,10.3 5.8,11.4 7.2,11.4 Z" fill="#0A192F"/>
        <!-- 'w' -->
        <path d="M14,1.8 L16.5,1.8 L18.8,9.8 L21,1.8 L23.5,1.8 L25.8,9.8 L28,1.8 L30.5,1.8 L27.2,13 L24.5,13 L22.2,4.8 L20,13 L17.2,13 Z" fill="#0A192F"/>
        <!-- 's' -->
        <path d="M35.5,13 C32.5,13 31,11.4 31,9.5 L33.2,9.5 C33.2,10.5 34.2,11.2 35.5,11.2 C36.8,11.2 37.6,10.5 37.6,9.5 C37.6,8.6 36.5,8.2 34.8,7.6 C32.2,7 31.2,6 31.2,4.2 C31.2,2 33.2,0.8 35.5,0.8 C37.8,0.8 39.5,2 39.5,4.2 L37.2,4.2 C37.2,3.2 36.5,2.6 35.5,2.6 C34.4,2.6 33.5,3.2 33.5,3.9 C33.5,4.8 34.4,5.4 36,5.8 C38.5,6.5 39.8,7.5 39.8,9.5 C39.8,12 37.8,13 35.5,13 Z" fill="#0A192F"/>
        <!-- Signature Orange Smile Arrow -->
        <path d="M2.5,15.5 C12,21.5 27,21.5 38,15.5" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M35.8,12.8 L40.2,15.6 L34.8,17.5 Z" fill="${accent}"/>
      </g>

      <!-- Vertical Divider with generous spacing -->
      <line x1="-45" y1="-11" x2="-45" y2="11" stroke="#CBD5E1" stroke-width="1.2" stroke-linecap="round"/>

      <!-- Clean Organization Header (Right side of centered unit) -->
      <g transform="translate(-32, 0)">
        <text x="0" y="-2" 
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
              font-size="9.2" font-weight="800" fill="#0A192F" letter-spacing="0.2">
          AWS Student Builder Group
        </text>
        <text x="0" y="10" 
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
              font-size="7.4" font-weight="600" fill="#475569" letter-spacing="0.1">
          Chandigarh University – Uttar Pradesh
        </text>
      </g>
    </g>

    <!-- ========================================== -->
    <!-- 3. CENTER: CLOUDXPLORE & WEEKLY SERIES -->
    <!-- ========================================== -->
    <g id="center-branding">
      <!-- Minimalist Vector Cloud & Orbit Icon (Comfortably spaced below header) -->
      <g id="mini-cloud" transform="translate(250, 126)">
        <path d="M -26,10 L 26,10 
                 C 34,10 40,4 38,-4 
                 C 40,-11 34,-18 27,-20 
                 C 24,-31 10,-35 0,-27 
                 C -6,-33 -17,-32 -22,-25 
                 C -28,-23 -32,-17 -31,-10 
                 C -39,-8 -43,-1 -41,6 
                 C -39,10 -34,10 -26,10 Z" 
              fill="#FFFDF8" 
              stroke="${accent}" 
              stroke-width="3" 
              stroke-linejoin="round" 
              stroke-linecap="round"/>
        <!-- Orbit Arc & Satellite -->
        <path d="M -34,8 C -34,19 -6,24 20,18 C 34,14 43,7 43,-2" 
              fill="none" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="36" cy="-15" r="3" fill="${accent}" stroke="#FFFFFF" stroke-width="1"/>
      </g>

      <!-- CloudXplore Main Branding Typography (Prominent & Clean) -->
      <text x="250" y="166" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="24.5" font-weight="900" fill="#0A192F" text-anchor="middle" letter-spacing="0.9">
        Cloud<tspan fill="${accent}">X</tspan>plore
      </text>

      <!-- Subtitle: WEEKLY AWS LEARNING SERIES -->
      <text x="250" y="184" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="8.5" font-weight="700" fill="#64748B" text-anchor="middle" letter-spacing="1.6">
        ${series}
      </text>

      <!-- Subtle Divider Line with Diamond Center -->
      <line x1="190" y1="198" x2="310" y2="198" stroke="#E2E8F0" stroke-width="1"/>
      <polygon points="250,196 252,198 250,200 248,198" fill="${accent}"/>
    </g>

    <!-- ========================================== -->
    <!-- 4. MAIN ACHIEVEMENT TITLE -->
    <!-- ========================================== -->
    <g id="badge-title" transform="translate(250, 238)">
      ${
        line2
          ? `
            <text x="0" y="-2" 
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                  font-size="${line1FontSize}" font-weight="900" fill="#0A192F" text-anchor="middle" letter-spacing="1">
              ${line1.toUpperCase()}
            </text>
            <text x="0" y="20" 
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                  font-size="${line2FontSize}" font-weight="800" fill="#D97706" text-anchor="middle" letter-spacing="1.8">
              ${line2.toUpperCase()}
            </text>
          `
          : `
            <text x="0" y="8" 
                  font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                  font-size="${line1FontSize}" font-weight="900" fill="#0A192F" text-anchor="middle" letter-spacing="1.4">
              ${line1.toUpperCase()}
            </text>
          `
      }
    </g>

    <!-- ========================================== -->
    <!-- 5. COMPACT RIBBON: SESSION COMPLETION -->
    <!-- ========================================== -->
    <g id="category-ribbon" transform="translate(250, 296)" filter="url(#ribbonShadow)">
      <!-- Left Fold Tail -->
      <polygon points="-118,4.5 -95,0 -95,19 -118,23.5 -110,11.5" 
               fill="#06121E" stroke="${accent}" stroke-width="1.2"/>
      
      <!-- Right Fold Tail -->
      <polygon points="118,4.5 95,0 95,19 118,23.5 110,11.5" 
               fill="#06121E" stroke="${accent}" stroke-width="1.2"/>

      <!-- Main Center Banner Body -->
      <rect x="-96" y="0" width="192" height="19" rx="3" 
            fill="#0A192F" stroke="${accent}" stroke-width="1.4"/>

      <!-- Inner Border Trim -->
      <rect x="-93" y="1.5" width="186" height="16" rx="1.8" 
            fill="none" stroke="#FCD34D" stroke-width="0.5" opacity="0.45"/>

      <!-- Category Text -->
      <text x="0" y="12.8" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="8" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.6">
        ${category}
      </text>
    </g>

    <!-- ========================================== -->
    <!-- 6. SUBTLE NAVY/ORANGE DIGITAL CREDENTIAL PILL -->
    <!-- ========================================== -->
    <g id="digital-credential-pill" transform="translate(250, 342)">
      <!-- Pill Container -->
      <rect x="-62" y="-9" width="124" height="18" rx="9" 
            fill="#07131F" stroke="${accent}" stroke-width="1.1"/>
      
      <!-- Indicator Dot -->
      <circle cx="-42" cy="0" r="2.2" fill="${accent}"/>
      
      <!-- Label Text -->
      <text x="4" y="2.8" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="7.5" font-weight="800" fill="#FFAC33" text-anchor="middle" letter-spacing="1.2">
        DIGITAL CREDENTIAL
      </text>
    </g>

    <!-- ========================================== -->
    <!-- 7. CLEAN BOTTOM ACCENT -->
    <!-- ========================================== -->
    <polygon points="250,386 253,389 250,392 247,389" fill="${accent}" opacity="0.75"/>
  </svg>`;
}

/**
 * Returns a data URL string of the SVG badge
 */
export function generateBadgeDataUrl(options: {
  title?: string;
  category?: string;
  series?: string;
  iconType?: 'cloud' | 'architecture' | 'devops' | 'ai' | 'security' | 'leader';
  accentColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  issuer?: string;
  credentialId?: string;
  issueDate?: string;
}): string {
  const svg = generateBadgeSvg(options);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}


