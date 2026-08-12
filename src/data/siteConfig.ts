export interface Resource {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  officialSource: string;
  externalLink: string;
}

export interface Activity {
  title: string;
  description: string;
  objective: string;
  targetAudience: string;
  format: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'To be announced';
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface LeadershipMember {
  name: string;
  role: string;
  organization: string;
  description: string;
  department?: string;
  email?: string;
  avatarUrl?: string;
}

export interface Announcement {
  title: string;
  date: string;
  category: string;
  summary: string;
  content?: string;
}

export interface EventItem {
  id: string;
  name: string;
  date?: string;
  time?: string;
  location?: string;
  speaker?: string;
  organizer?: string;
  description?: string;
  registrationUrl?: string;
  photos?: string[];
  resources?: { name: string; url: string }[];
  certificateInfo?: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
}

export const siteConfig = {
  orgName: 'AWS Student Builder Group at Chandigarh University – Uttar Pradesh',
  orgShortName: 'AWS SBG CU-UP',
  awsLogoUrl: '/aws-logo.svg',
  cuLogoUrl: '/chandigarh-university-logo.jpg',
  communityType: 'Student-led technology community',
  location: 'Chandigarh University – Uttar Pradesh, India',
  email: 'awssbgchandigarhuniversity@gmail.com',
  safeEmailLink: 'mailto:awssbgchandigarhuniversity@gmail.com',
  
  // Leadership & Faculty Contact
  leader: {
    name: 'Abhay Shukla',
    role: 'AWS Student Builder Group Leader',
    organization: 'Chandigarh University – Uttar Pradesh',
    description: 'Abhay Shukla leads the AWS Student Builder Group at Chandigarh University – Uttar Pradesh, helping coordinate student-focused learning activities around cloud, AI, data and emerging technologies.',
  } as LeadershipMember,
  
  facultyContact: {
    name: 'Prof. (Dr.) Ajay Kumar Singh',
    role: 'Faculty / university contact associated with the AWS Student Community initiative',
    department: 'School of Computer Science and Engineering',
    organization: 'Chandigarh University – Uttar Pradesh',
    description: 'Faculty / university contact associated with the AWS Student Community initiative.',
  } as LeadershipMember,

  // External Verification Links (Configurable)
  AWS_BUILDER_CENTER_URL: '', // Leave empty to trigger the "Official listing link — Coming Soon" state
  
  // Navigation Links
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Activities', href: '/activities' },
    { label: 'Events', href: '/events' },
    { label: 'Resources', href: '/resources' },
    { label: 'Verification', href: '/verification' },
    { label: 'Leadership', href: '/leadership' },
    { label: 'Collaborate', href: '/collaborate' },
    { label: 'Join', href: '/join' },
  ],

  // Footer Links
  footerLinks: [
    { label: 'About Us', href: '/about' },
    { label: 'Events', href: '/events' },
    { label: 'Resources', href: '/resources' },
    { label: 'Verification', href: '/verification' },
    { label: 'Leadership', href: '/leadership' },
    { label: 'Governance', href: '/governance' },
    { label: 'Collaborate', href: '/collaborate' },
    { label: 'Join Group', href: '/join' },
    { label: 'Contact', href: '/contact' },
    { label: 'Transparency', href: '/transparency' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
  ],

  // Focus Technologies
  technologies: [
    { name: 'AWS Cloud', desc: 'Core cloud infrastructure, serverless computing, storage, networking, and identity management.' },
    { name: 'Artificial Intelligence', desc: 'Predictive modeling, deep learning architectures, and natural language processing.' },
    { name: 'Data & Analytics', desc: 'Data lakes, warehousing, stream processing, and business intelligence.' },
    { name: 'DevOps & CI/CD', desc: 'Infrastructure as Code, deployment automation, and site reliability engineering.' },
    { name: 'Cybersecurity', desc: 'Cloud security governance, identity controls, and compliance standards.' },
    { name: 'Generative AI', desc: 'Foundation models, prompt engineering, and building agentic systems.' },
  ],

  // Community Principles
  principles: [
    { title: 'Learn by Doing', desc: 'We encourage practical, hands-on learning.' },
    { title: 'Build Together', desc: 'We believe collaboration accelerates learning.' },
    { title: 'Share Knowledge', desc: 'Students can learn from and teach each other.' },
    { title: 'Explore Responsibly', desc: 'We encourage responsible and ethical use of technology.' },
    { title: 'Stay Curious', desc: 'We continuously explore new technologies.' },
  ],

  // FAQ Content
  faqs: [
    {
      question: 'What is AWS Student Builder Group?',
      answer: 'The AWS Student Builder Group is a student-led technology community focused on exploring cloud computing, AI, machine learning, DevOps, and related emerging technologies under the AWS Builder Center initiative.'
    },
    {
      question: 'Who can join?',
      answer: 'Students at Chandigarh University – Uttar Pradesh who are interested in cloud engineering, AI, DevOps, cybersecurity, and project building are welcome to join. All experience levels, from beginners to advanced builders, are encouraged.'
    },
    {
      question: 'Is the community student-led?',
      answer: 'Yes, the group is entirely managed by students under the leadership of a designated Student Builder Group Leader, with advisory guidance from university faculty.'
    },
    {
      question: 'Who leads the group?',
      answer: 'The AWS Student Builder Group at Chandigarh University – Uttar Pradesh is led by Abhay Shukla, who serves as the Group Leader.'
    },
    {
      question: 'What technologies do you focus on?',
      answer: 'Our main pillars include AWS Cloud, Artificial Intelligence, Machine Learning, Data Analytics, DevOps, Cybersecurity, and Generative AI.'
    },
    {
      question: 'How can I collaborate?',
      answer: 'We welcome partnerships for educational workshops, mentorship, guest sessions, and technology hackathons. Interested organizers or mentors can initiate a conversation through our Collaborate section or by contacting us directly.'
    },
    {
      question: 'How can I invite a speaker?',
      answer: 'If you want to suggest a technical speaker or conduct an industry session with our community, please use the form on our Collaborate page or email us at awssbgchandigarhuniversity@gmail.com.'
    },
    {
      question: 'How can students participate?',
      answer: 'Students can participate by attending workshops, collaborating on group projects, volunteering for event logistics, or sharing learning notes in community sessions.'
    },
    {
      question: 'Is this the official Chandigarh University website?',
      answer: 'No. This is a community website for the AWS Student Builder Group. It is not the official Chandigarh University website.'
    },
    {
      question: 'Is this an AWS corporate website?',
      answer: 'No. This website represents a student community within the AWS Student Builder Group ecosystem and is not the AWS corporate website.'
    }
  ] as FAQItem[],

  // Resources Data (focused on official materials)
  resources: [
    {
      title: 'AWS Cloud Practitioner Essentials',
      description: 'Official introduction to AWS Cloud fundamentals, core services, security, architecture, and pricing.',
      difficulty: 'Beginner',
      officialSource: 'AWS Skill Builder',
      externalLink: 'https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/'
    },
    {
      title: 'AWS Academy Cloud Foundations',
      description: 'Structured course covering cloud computing principles, global infrastructure, security, and computing services.',
      difficulty: 'Beginner',
      officialSource: 'AWS Academy',
      externalLink: 'https://aws.amazon.com/training/awsacademy/'
    },
    {
      title: 'AWS Technical Essentials',
      description: 'Hands-on overview of essential AWS services: IAM, EC2, VPC, S3, and RDS for technical developers.',
      difficulty: 'Intermediate',
      officialSource: 'AWS Training & Certification',
      externalLink: 'https://aws.amazon.com/training/classroom/aws-technical-essentials/'
    },
    {
      title: 'Introduction to Machine Learning on AWS',
      description: 'Explore the basics of machine learning, pipeline steps, and using AWS services like SageMaker for ML models.',
      difficulty: 'Intermediate',
      officialSource: 'AWS Skill Builder',
      externalLink: 'https://explore.skillbuilder.aws/learn'
    },
    {
      title: 'AWS Well-Architected Framework',
      description: 'Official design guidelines and architectural best practices across security, reliability, performance, and cost.',
      difficulty: 'Advanced',
      officialSource: 'AWS Whitepapers',
      externalLink: 'https://aws.amazon.com/architecture/well-architected/'
    },
    {
      title: 'Generative AI Foundation on AWS',
      description: 'Learn foundations of Generative AI, Large Language Models (LLMs), and deploy models using Amazon Bedrock.',
      difficulty: 'Advanced',
      officialSource: 'AWS Skill Builder',
      externalLink: 'https://aws.amazon.com/blogs/machine-learning/learn-the-fundamentals-of-generative-ai-for-free-on-aws-skill-builder/'
    }
  ] as Resource[],

  // Activities Data
  activities: [
    {
      title: 'Cloud Learning Foundations',
      description: 'Interactive sessions covering virtualization, cloud models, and AWS core services.',
      objective: 'Build a strong understanding of foundational cloud architectures.',
      targetAudience: 'All students interested in starting their cloud journey.',
      format: 'Peer learning and study groups',
      status: 'Upcoming'
    },
    {
      title: 'AI & Machine Learning Sessions',
      description: 'Exploring machine learning pipelines, datasets, and standard neural network architectures.',
      objective: 'Demystify AI/ML algorithms and run inference on pre-trained models.',
      targetAudience: 'Students interested in data modeling and intelligent applications.',
      format: 'Study sessions and model walk-throughs',
      status: 'Upcoming'
    },
    {
      title: 'Hands-on Technical Workshops',
      description: 'Guided labs where students deploy real architectures, write Infrastructure-as-Code, or configure services.',
      objective: 'Gain practical experience using secure cloud services.',
      targetAudience: 'Students with basic programming or networking experience.',
      format: 'Hands-on Lab sessions',
      status: 'To be announced'
    },
    {
      title: 'Collaborative Project Building',
      description: 'Small teams working on software projects deploying to cloud platforms.',
      objective: 'Practice professional development workflows, CI/CD, and collaboration.',
      targetAudience: 'Intermediate to advanced builders.',
      format: 'Project cohorts',
      status: 'To be announced'
    },
    {
      title: 'Community Tech Discussions',
      description: 'Informal discussions about recent trends in Cloud, GenAI, DevOps, and Cybersecurity.',
      objective: 'Share knowledge, voice questions, and network with peers.',
      targetAudience: 'All students.',
      format: 'Open roundtable discussions',
      status: 'Upcoming'
    }
  ] as Activity[],

  // CMS-Ready Empty Arrays (No fake data!)
  events: [] as EventItem[],
  announcements: [] as Announcement[]
};
