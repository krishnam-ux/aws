import https from 'https';

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
    });
    req.on('error', reject);
    if (opts.body) {
      req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    }
    req.end();
  });
}

function parse(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

async function cleanup() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('Cleaning up temporary audit quizzes on live DB...');
  const loginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const token = parse(loginRes.body, {}).token;

  const dashRes = await request(base + '/api/admin/weekly-quiz', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const dash = parse(dashRes.body, {});
  const quizzes = dash.quizzes || [];

  const tempIds = [
    'quiz-live-audit-test',
    'quiz-timer-tz-test',
    'quiz-future-test',
    'quiz-past-test',
    'quiz-short-window-test',
    'quiz-exp-test',
    'quiz-randomization-audit',
    'quiz-violation-audit',
    'quiz-webrtc-audit',
    'quiz-admin-ctrl-test'
  ];

  for (const q of quizzes) {
    if (tempIds.includes(q.id)) {
      console.log(`Deleting test quiz: ${q.id}`);
      await request(base + '/api/admin/weekly-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: { action: 'delete-quiz', quizId: q.id }
      });
    }
  }

  // Ensure official CloudXplore #02 Weekly Quiz exists and is configured for event-1790339112799
  const officialQuiz = quizzes.find(q => q.sessionId === 'event-1790339112799' && !tempIds.includes(q.id));
  if (!officialQuiz) {
    console.log('Publishing official CloudXplore #02 Weekly Quiz for 2026-10-11 session...');
    await request(base + '/api/admin/weekly-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: {
        action: 'save-quiz',
        quiz: {
          id: 'quiz-aws-cloudxplore-02',
          quizCode: 'AWS-WEEK-02',
          title: 'CloudXplore #02 — Weekly AWS Assessment',
          topic: 'AWS Core Services, Architecture & Cloud Security',
          description: 'Weekly proctored learning assessment for CloudXplore #02 participants.',
          sessionId: 'event-1790339112799',
          sessionTitle: 'CloudXplore #02 — Your AWS Journey Gets Hands-On',
          scheduledDate: '2026-10-11',
          startTime: '10:00',
          endTime: '22:00',
          timezone: 'Asia/Kolkata',
          durationMinutes: 20,
          totalQuestionsToSelect: 20,
          passingPercentage: 60,
          status: 'Published',
          questionBank: [
            { id: 'q1', question: 'Which AWS service is best suited for storing static website assets with high durability?', options: ['Amazon S3', 'Amazon EBS', 'Amazon EFS', 'AWS Storage Gateway'], correctOptionIndex: 0, marks: 1 },
            { id: 'q2', question: 'What compute service allows running code without provisioning or managing servers?', options: ['AWS Lambda', 'Amazon EC2', 'Amazon Lightsail', 'AWS Outposts'], correctOptionIndex: 0, marks: 1 },
            { id: 'q3', question: 'Which AWS service is a managed relational database service supporting MySQL, PostgreSQL, and Oracle?', options: ['Amazon RDS', 'Amazon DynamoDB', 'Amazon Redshift', 'Amazon DocumentDB'], correctOptionIndex: 0, marks: 1 },
            { id: 'q4', question: 'Which component automatically distributes incoming application traffic across multiple EC2 targets?', options: ['Elastic Load Balancing (ELB)', 'Amazon CloudFront', 'AWS Direct Connect', 'Amazon Route 53'], correctOptionIndex: 0, marks: 1 },
            { id: 'q5', question: 'What AWS service provides real-time monitoring and observability of cloud resources and metrics?', options: ['Amazon CloudWatch', 'AWS CloudTrail', 'AWS Config', 'AWS Trusted Advisor'], correctOptionIndex: 0, marks: 1 },
            { id: 'q6', question: 'Which service tracks and logs API calls made across your AWS account for security governance?', options: ['AWS CloudTrail', 'Amazon CloudWatch', 'AWS IAM', 'Amazon Inspector'], correctOptionIndex: 0, marks: 1 },
            { id: 'q7', question: 'In the AWS Shared Responsibility Model, which responsibility belongs exclusively to the customer?', options: ['Customer Data & IAM policies', 'Data center physical security', 'Hypervisor virtualization', 'Edge network infrastructure'], correctOptionIndex: 0, marks: 1 },
            { id: 'q8', question: 'Which AWS tool enables you to model and provision infrastructure resources as code (IaC)?', options: ['AWS CloudFormation', 'AWS OpsWorks', 'AWS Systems Manager', 'AWS CodeDeploy'], correctOptionIndex: 0, marks: 1 },
            { id: 'q9', question: 'What service provides a low-latency Content Delivery Network (CDN) with edge locations worldwide?', options: ['Amazon CloudFront', 'AWS Global Accelerator', 'Amazon Route 53', 'AWS Direct Connect'], correctOptionIndex: 0, marks: 1 },
            { id: 'q10', question: 'Which AWS NoSQL database delivers single-digit millisecond latency at any scale?', options: ['Amazon DynamoDB', 'Amazon RDS', 'Amazon Aurora', 'Amazon ElastiCache'], correctOptionIndex: 0, marks: 1 },
            { id: 'q11', question: 'What VPC component allows private subnets to initiate outbound IPv4 connections to the internet?', options: ['NAT Gateway', 'Internet Gateway', 'VPC Peering', 'Customer Gateway'], correctOptionIndex: 0, marks: 1 },
            { id: 'q12', question: 'Which IAM entity is intended to be assumed by an AWS service or federated user for temporary credentials?', options: ['IAM Role', 'IAM User', 'IAM Group', 'IAM Access Key'], correctOptionIndex: 0, marks: 1 },
            { id: 'q13', question: 'What compute option provides up to a 90% discount on unused EC2 capacity for fault-tolerant workloads?', options: ['EC2 Spot Instances', 'EC2 Reserved Instances', 'EC2 On-Demand', 'Savings Plans'], correctOptionIndex: 0, marks: 1 },
            { id: 'q14', question: 'Which service provides a managed message queuing service to decouple microservices?', options: ['Amazon SQS', 'Amazon SNS', 'Amazon EventBridge', 'Amazon MQ'], correctOptionIndex: 0, marks: 1 },
            { id: 'q15', question: 'What service provides a fully managed pub/sub messaging and mobile notification service?', options: ['Amazon SNS', 'Amazon SQS', 'AWS AppSync', 'Amazon Kinesis'], correctOptionIndex: 0, marks: 1 },
            { id: 'q16', question: 'Which AWS service assists in estimating monthly costs based on expected usage patterns?', options: ['AWS Pricing Calculator', 'AWS Budgets', 'AWS Cost Explorer', 'AWS Marketplace'], correctOptionIndex: 0, marks: 1 },
            { id: 'q17', question: 'What AWS service provides automated security assessments against best practice baselines?', options: ['AWS Trusted Advisor', 'AWS Shield', 'AWS WAF', 'AWS Secrets Manager'], correctOptionIndex: 0, marks: 1 },
            { id: 'q18', question: 'Which storage tier in Amazon S3 is optimized for long-term archiving with retrieval times of hours?', options: ['S3 Glacier Flexible Retrieval', 'S3 Standard', 'S3 Intelligent-Tiering', 'S3 One Zone-IA'], correctOptionIndex: 0, marks: 1 },
            { id: 'q19', question: 'What service gives managed Web Application Firewall protection against SQL injection and cross-site scripting?', options: ['AWS WAF', 'AWS Shield', 'Amazon GuardDuty', 'AWS Network Firewall'], correctOptionIndex: 0, marks: 1 },
            { id: 'q20', question: 'Which AWS architectural pillar focuses on running workloads effectively and gaining insight into operations?', options: ['Operational Excellence', 'Security', 'Reliability', 'Performance Efficiency'], correctOptionIndex: 0, marks: 1 }
          ]
        }
      }
    });
  }

  console.log('Cleanup complete.');
}

cleanup().catch(console.error);
