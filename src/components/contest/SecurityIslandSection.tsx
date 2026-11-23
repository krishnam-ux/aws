'use client';

import { useState } from 'react';

interface ServiceItem {
  name: string;
  category: string;
  isSecurityGold?: boolean;
  iconSvg?: string;
  shortCode: string;
}

interface LevelData {
  id: number;
  title: string;
  description: string;
  servicesCount: string;
  services: ServiceItem[];
}

const levels: LevelData[] = [
  {
    id: 1,
    title: 'IAM Least Privilege Baseline',
    description: 'Establish enterprise zero-trust IAM roles with automated credential rotation and permission boundaries.',
    servicesCount: '4 cards, 2 security in gold',
    services: [
      { name: 'AWS IAM', category: 'Security & Identity', isSecurityGold: true, shortCode: 'IAM' },
      { name: 'AWS STS', category: 'Security & Identity', isSecurityGold: true, shortCode: 'STS' },
      { name: 'Amazon CloudWatch', category: 'Management', isSecurityGold: false, shortCode: 'CW' },
      { name: 'AWS Organizations', category: 'Governance', isSecurityGold: false, shortCode: 'ORG' },
    ]
  },
  {
    id: 2,
    title: 'VPC Defense Perimeter',
    description: 'Design multi-AZ public and private subnets protected by stateful security groups and network ACLs.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'Amazon VPC', category: 'Networking', isSecurityGold: false, shortCode: 'VPC' },
      { name: 'Security Groups', category: 'Security', isSecurityGold: true, shortCode: 'SG' },
      { name: 'Internet Gateway', category: 'Networking', isSecurityGold: false, shortCode: 'IGW' },
      { name: 'NAT Gateway', category: 'Networking', isSecurityGold: false, shortCode: 'NAT' },
      { name: 'AWS Network Firewall', category: 'Security', isSecurityGold: true, shortCode: 'NFW' },
    ]
  },
  {
    id: 3,
    title: 'DDoS Mitigation & Edge Filtering',
    description: 'Shield web assets from distributed denial-of-service volumetric surges using CloudFront and Route 53.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'Amazon Route 53', category: 'DNS', isSecurityGold: false, shortCode: 'R53' },
      { name: 'Amazon CloudFront', category: 'CDN', isSecurityGold: false, shortCode: 'CF' },
      { name: 'AWS Shield Standard', category: 'Security', isSecurityGold: true, shortCode: 'SHD' },
      { name: 'AWS WAF', category: 'Security', isSecurityGold: true, shortCode: 'WAF' },
      { name: 'Amazon S3', category: 'Storage', isSecurityGold: false, shortCode: 'S3' },
    ]
  },
  {
    id: 4,
    title: 'Block Cybersecurity Threats',
    description: 'Build an architecture that blocks common web attacks and finds vulnerabilities on the servers.',
    servicesCount: '6 cards, 2 security in gold',
    services: [
      { name: 'Amazon Route 53', category: 'Networking', isSecurityGold: false, shortCode: 'R53' },
      { name: 'AWS WAF', category: 'Security', isSecurityGold: true, shortCode: 'WAF' },
      { name: 'Application Load Balancer', category: 'Networking', isSecurityGold: false, shortCode: 'ALB' },
      { name: 'Amazon EC2', category: 'Compute', isSecurityGold: false, shortCode: 'EC2' },
      { name: 'Amazon Aurora', category: 'Database', isSecurityGold: false, shortCode: 'DB' },
      { name: 'Amazon Inspector', category: 'Security', isSecurityGold: true, shortCode: 'INSP' },
    ]
  },
  {
    id: 5,
    title: 'Streamline Compliance Management',
    description: 'Automate continuous compliance audits, configuration change tracking, and CIS benchmark reporting.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'AWS Config', category: 'Compliance', isSecurityGold: true, shortCode: 'CFG' },
      { name: 'AWS Security Hub', category: 'Security', isSecurityGold: true, shortCode: 'HUB' },
      { name: 'Amazon CloudWatch', category: 'Monitoring', isSecurityGold: false, shortCode: 'CW' },
      { name: 'AWS Systems Manager', category: 'Operations', isSecurityGold: false, shortCode: 'SSM' },
      { name: 'Amazon SNS', category: 'Messaging', isSecurityGold: false, shortCode: 'SNS' },
    ]
  },
  {
    id: 6,
    title: 'Capture and Visualize Credential Data from Multiple Accounts',
    description: 'Aggregate identity federation and API call logs into interactive Athena visualizations.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'AWS CloudTrail Lake', category: 'Security Audit', isSecurityGold: true, shortCode: 'CTL' },
      { name: 'Amazon Athena', category: 'Analytics', isSecurityGold: false, shortCode: 'ATH' },
      { name: 'Amazon QuickSight', category: 'BI', isSecurityGold: false, shortCode: 'QS' },
      { name: 'AWS IAM Identity Center', category: 'Security', isSecurityGold: true, shortCode: 'IDC' },
      { name: 'Amazon S3', category: 'Storage', isSecurityGold: false, shortCode: 'S3' },
    ]
  },
  {
    id: 7,
    title: 'Identify Public Resources',
    description: 'Proactively detect unintended internet access to S3 buckets, KMS keys, and IAM roles.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'IAM Access Analyzer', category: 'Security', isSecurityGold: true, shortCode: 'IAA' },
      { name: 'AWS Trusted Advisor', category: 'Management', isSecurityGold: false, shortCode: 'TA' },
      { name: 'Amazon EventBridge', category: 'Integration', isSecurityGold: false, shortCode: 'EVB' },
      { name: 'AWS Lambda', category: 'Compute', isSecurityGold: false, shortCode: 'LAM' },
      { name: 'Amazon GuardDuty', category: 'Security', isSecurityGold: true, shortCode: 'GD' },
    ]
  },
  {
    id: 8,
    title: 'File Integrity Monitoring',
    description: 'Monitor unauthorized file modifications, kernel alterations, and credential dump attempts on production nodes.',
    servicesCount: '6 cards, 2 security in gold',
    services: [
      { name: 'AWS Systems Manager', category: 'Management', isSecurityGold: false, shortCode: 'SSM' },
      { name: 'Amazon Inspector', category: 'Security', isSecurityGold: true, shortCode: 'INSP' },
      { name: 'Amazon CloudWatch Agent', category: 'Monitoring', isSecurityGold: false, shortCode: 'CWA' },
      { name: 'Amazon GuardDuty', category: 'Security', isSecurityGold: true, shortCode: 'GD' },
      { name: 'Amazon EC2', category: 'Compute', isSecurityGold: false, shortCode: 'EC2' },
      { name: 'Amazon SNS', category: 'Alerts', isSecurityGold: false, shortCode: 'SNS' },
    ]
  },
  {
    id: 9,
    title: 'Malware Detection on Backups',
    description: 'Scan immutable snapshot archives and Elastic Block Store volumes for embedded ransomware artifacts.',
    servicesCount: '5 cards, 3 security in gold',
    services: [
      { name: 'AWS Backup', category: 'Storage', isSecurityGold: false, shortCode: 'BAK' },
      { name: 'GuardDuty Malware Protection', category: 'Security', isSecurityGold: true, shortCode: 'GD' },
      { name: 'AWS KMS', category: 'Encryption', isSecurityGold: true, shortCode: 'KMS' },
      { name: 'Amazon EBS Snapshots', category: 'Storage', isSecurityGold: false, shortCode: 'EBS' },
      { name: 'AWS Security Hub', category: 'Security', isSecurityGold: true, shortCode: 'HUB' },
    ]
  },
  {
    id: 10,
    title: 'Secure Sensitive Log Data',
    description: 'Encrypt diagnostic logs at rest and in transit using customer managed keys with automatic envelope rotation.',
    servicesCount: '6 cards, 3 security in gold',
    services: [
      { name: 'AWS KMS', category: 'Security', isSecurityGold: true, shortCode: 'KMS' },
      { name: 'CloudWatch Logs', category: 'Monitoring', isSecurityGold: false, shortCode: 'CWL' },
      { name: 'Amazon Kinesis Firehose', category: 'Streaming', isSecurityGold: false, shortCode: 'KIN' },
      { name: 'Amazon OpenSearch', category: 'Search', isSecurityGold: false, shortCode: 'OS' },
      { name: 'Amazon Macie', category: 'Security', isSecurityGold: true, shortCode: 'MAC' },
      { name: 'AWS CloudTrail', category: 'Security', isSecurityGold: true, shortCode: 'CT' },
    ]
  },
  {
    id: 11,
    title: 'Securing Payment APIs',
    description: 'Enforce mutual TLS certificate validation, OAuth scopes, rate limiting, and encrypted secret storage for checkout APIs.',
    servicesCount: '6 cards, 3 security in gold',
    services: [
      { name: 'Amazon API Gateway', category: 'API', isSecurityGold: false, shortCode: 'APIG' },
      { name: 'AWS WAF', category: 'Security', isSecurityGold: true, shortCode: 'WAF' },
      { name: 'AWS Lambda', category: 'Compute', isSecurityGold: false, shortCode: 'LAM' },
      { name: 'AWS Secrets Manager', category: 'Security', isSecurityGold: true, shortCode: 'SM' },
      { name: 'AWS KMS', category: 'Security', isSecurityGold: true, shortCode: 'KMS' },
      { name: 'Amazon DynamoDB', category: 'Database', isSecurityGold: false, shortCode: 'DDB' },
    ]
  },
  {
    id: 12,
    title: 'Centralized Logging At Enterprise Scale',
    description: 'Funnel multi-region security telemetry into tamper-proof write-once S3 Glacier object-lock vaults.',
    servicesCount: '5 cards, 3 security in gold',
    services: [
      { name: 'AWS Control Tower', category: 'Governance', isSecurityGold: false, shortCode: 'CTW' },
      { name: 'Amazon S3 Glacier Vault', category: 'Storage', isSecurityGold: false, shortCode: 'GLC' },
      { name: 'AWS KMS', category: 'Security', isSecurityGold: true, shortCode: 'KMS' },
      { name: 'AWS Security Hub', category: 'Security', isSecurityGold: true, shortCode: 'HUB' },
      { name: 'AWS CloudTrail Lake', category: 'Security', isSecurityGold: true, shortCode: 'CTL' },
    ]
  },
  {
    id: 13,
    title: 'Automated Threat Analysis',
    description: 'Dispatch high-severity GuardDuty findings into Step Functions state machines for automated isolation.',
    servicesCount: '5 cards, 2 security in gold',
    services: [
      { name: 'Amazon GuardDuty', category: 'Security', isSecurityGold: true, shortCode: 'GD' },
      { name: 'Amazon EventBridge', category: 'Integration', isSecurityGold: false, shortCode: 'EVB' },
      { name: 'AWS Step Functions', category: 'Serverless', isSecurityGold: false, shortCode: 'SFN' },
      { name: 'AWS Lambda', category: 'Compute', isSecurityGold: false, shortCode: 'LAM' },
      { name: 'AWS Network Firewall', category: 'Security', isSecurityGold: true, shortCode: 'NFW' },
    ]
  },
  {
    id: 14,
    title: 'Minimize Layer 7 Generative AI Threats',
    description: 'Intercept LLM prompts with Bedrock Guardrails to prevent prompt injections and personal data leakage.',
    servicesCount: '6 cards, 3 security in gold',
    services: [
      { name: 'Amazon Bedrock Guardrails', category: 'Security', isSecurityGold: true, shortCode: 'BGR' },
      { name: 'AWS WAF', category: 'Security', isSecurityGold: true, shortCode: 'WAF' },
      { name: 'Amazon CloudFront', category: 'Edge', isSecurityGold: false, shortCode: 'CF' },
      { name: 'Amazon Cognito', category: 'Auth', isSecurityGold: false, shortCode: 'COG' },
      { name: 'AWS Secrets Manager', category: 'Security', isSecurityGold: true, shortCode: 'SM' },
      { name: 'Amazon Bedrock', category: 'AI', isSecurityGold: false, shortCode: 'BR' },
    ]
  },
  {
    id: 15,
    title: 'Gen AI Network Defense in Depth',
    description: 'Deploy stateful deep packet inspection and egress domain filtering around dedicated AI model hosting clusters.',
    servicesCount: '6 cards, 3 security in gold',
    services: [
      { name: 'AWS Network Firewall', category: 'Security', isSecurityGold: true, shortCode: 'NFW' },
      { name: 'AWS Transit Gateway', category: 'Networking', isSecurityGold: false, shortCode: 'TGW' },
      { name: 'AWS WAF', category: 'Security', isSecurityGold: true, shortCode: 'WAF' },
      { name: 'Amazon Bedrock', category: 'AI', isSecurityGold: false, shortCode: 'BR' },
      { name: 'Amazon VPC Lattice', category: 'Networking', isSecurityGold: false, shortCode: 'LAT' },
      { name: 'AWS KMS', category: 'Security', isSecurityGold: true, shortCode: 'KMS' },
    ]
  }
];

export default function SecurityIslandSection() {
  const [selectedLevelId, setSelectedLevelId] = useState<number>(4);
  const selectedLevel = levels.find((l) => l.id === selectedLevelId) || levels[3];

  return (
    <section id="island" className="relative py-20 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      {/* Background radial atmosphere */}
      <div 
        className="pointer-events-none absolute -left-48 top-20 w-96 h-96 bg-amber-600/10 rounded-full blur-[140px]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header & Cards Deck Graphic */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-12 border-b border-[#2A1D17]">
          
          {/* Section Heading & Stats */}
          <div className="max-w-xl space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
              THE SECURITY ISLAND
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8F2EA] tracking-tight font-display">
              15 new architectures to defend
            </h2>
            <p className="text-sm sm:text-base text-[#B9AAA0] leading-relaxed">
              Every level is a real AWS security pattern. Pick one to see what you build and which service cards you place.
            </p>

            {/* Quick Stats Row */}
            <div className="flex items-center space-x-6 sm:space-x-8 pt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#F5C451] font-mono">15</span>
                <span className="text-xs sm:text-sm text-[#B9AAA0] uppercase tracking-wider font-semibold">levels</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#F5C451] font-mono">45</span>
                <span className="text-xs sm:text-sm text-[#B9AAA0] uppercase tracking-wider font-semibold">stars to earn</span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#F5C451] font-mono">1</span>
                <span className="text-xs sm:text-sm text-[#B9AAA0] uppercase tracking-wider font-semibold">dragon</span>
              </div>
            </div>
          </div>

          {/* Cards Deck Graphic on Right */}
          <div className="flex flex-col items-center lg:items-end w-full lg:w-auto">
            <div className="relative group p-2">
              <img
                src="/contest/cards-fan.png"
                alt="AWS Card Clash Security Deck Cards: KMS, WAF, GuardDuty, Macie, Secrets Manager, Network Firewall"
                className="w-full max-w-[420px] h-auto object-contain transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
              />
            </div>
            <p className="text-xs text-[#F5C451] font-medium tracking-wide mt-2">
              <span className="font-bold">AWS KMS</span> is in levels 9, 10, 11 and 12.
            </p>
          </div>

        </div>

        {/* Interactive 15-Level Grid & Selected Level Details Panel */}
        <div className="pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Grid: Level Cards (Levels 4 to 15 + 1 to 3) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {levels.map((lvl) => {
                const isSelected = selectedLevelId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={`flex items-center space-x-3 p-3.5 rounded-xl text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[#F5C451] ${
                      isSelected
                        ? 'bg-[#211713] border-2 border-[#F5C451] shadow-[0_0_20px_rgba(245,196,81,0.25)] translate-y-[-2px]'
                        : 'bg-[#18110E]/80 border border-[#2E1E17] hover:border-[#F5C451]/50 hover:bg-[#211713]/60 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Numbered Gold Badge */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#F5C451] text-[#0B0908] shadow-[0_0_10px_#F5C451]'
                          : 'bg-[#2A1D17] text-[#F5C451] group-hover:bg-[#F5C451] group-hover:text-[#0B0908]'
                      }`}
                    >
                      {lvl.id}
                    </div>

                    {/* Level Title */}
                    <span className={`text-xs font-semibold leading-tight line-clamp-2 ${
                      isSelected ? 'text-[#F8F2EA]' : 'text-[#B9AAA0] group-hover:text-[#F8F2EA]'
                    }`}>
                      {lvl.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Selected Level Details */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#211713] to-[#150F0C] border border-[#4A2D19] shadow-2xl relative overflow-hidden">
              
              {/* Gold accent line on top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F5C451] to-transparent opacity-80" />

              <div className="space-y-5">
                {/* Level Title and ID */}
                <div className="flex items-center justify-between border-b border-[#3A271E] pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-[#F5C451] text-[#0B0908] text-xs font-bold font-mono flex items-center justify-center">
                      {selectedLevel.id}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F5C451]">
                      Level {selectedLevel.id} Architecture
                    </span>
                  </div>
                  <span className="text-[10px] text-[#B9AAA0] bg-[#140E0A] px-2 py-0.5 rounded border border-[#3A271E]">
                    Security Pattern
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#F8F2EA] leading-snug">
                  {selectedLevel.title}
                </h3>

                {/* Pattern Objective Description */}
                <p className="text-sm text-[#B9AAA0] leading-relaxed">
                  {selectedLevel.description}
                </p>

                {/* Cards to place summary */}
                <div className="pt-2 border-t border-[#3A271E]/80">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-[#F8F2EA] font-semibold">Services you place</span>
                    <span className="text-[#F5C451] font-mono font-medium">
                      {selectedLevel.servicesCount}
                    </span>
                  </div>

                  {/* Service Badge Icons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-2.5">
                    {selectedLevel.services.map((svc, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center text-center transition-transform hover:scale-105 ${
                          svc.isSecurityGold
                            ? 'bg-[#331C0D] border border-[#F5C451]/60 shadow-[0_0_12px_rgba(245,196,81,0.2)]'
                            : 'bg-[#18110E] border border-[#3A271E]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono mb-1 ${
                          svc.isSecurityGold
                            ? 'bg-[#F5C451] text-[#0B0908]'
                            : 'bg-purple-900/60 text-purple-200 border border-purple-500/30'
                        }`}>
                          {svc.shortCode}
                        </div>
                        <span className="text-[10px] font-medium text-[#F8F2EA] line-clamp-1">
                          {svc.name}
                        </span>
                        {svc.isSecurityGold && (
                          <span className="text-[8px] uppercase tracking-wider text-[#F5C451] font-bold mt-0.5">
                            Gold Card
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Play Tip */}
                <div className="text-[11px] text-[#B9AAA0] bg-[#140E0A]/90 p-3 rounded-xl border border-[#3A271E] flex items-center space-x-2">
                  <span className="text-[#F5C451] text-base">🛡️</span>
                  <span>Place your security cards carefully before the dragon attacks!</span>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
