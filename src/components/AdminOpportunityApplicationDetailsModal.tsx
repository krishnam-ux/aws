'use client';

import React, { useState } from 'react';

export type OpportunityApplicationRecord = {
  id: string;
  opportunityId?: string;
  opportunitySlug?: string;
  formType?: 'founding-member' | 'core-team' | 'anchor-speaker' | string;
  name: string;
  email: string;
  personalEmail?: string;
  phone?: string;
  university?: string;
  program?: string;
  department?: string;
  branch?: string;
  currentYear?: string;
  graduationYear?: string;
  studentId?: string;
  rollNumber?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  introductionVideoUrl?: string;
  videoUrl?: string;
  preferredDomain?: string;
  preferredRole?: string;
  skills?: string;
  primarySkillLevel?: string;
  experience?: string;
  previousExperience?: string;
  roleAndImpact?: string;
  exactResponsibility?: string;
  teamworkSituation?: string;
  leadershipExperience?: string;
  leadershipDetails?: string;
  whyFoundingMember?: string;
  whyCoreTeam?: string;
  personalContribution?: string;
  domainContribution?: string;
  communityGrowthIdeas?: string;
  scenarioAnswer?: string;
  scenarioDropParticipation?: string;
  scenarioUnavailableMembers?: string;
  availabilityHours?: string;
  consistentContribution?: string;
  contributionDuration?: string;
  academicBalance?: string;
  availableDays?: string;
  activeParticipation?: string;
  involvementDuration?: string;
  motivation?: string;
  coverLetter?: string;
  additionalInformation?: string;
  consent?: boolean;
  status?: string;
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

interface AdminOpportunityApplicationDetailsModalProps {
  application: OpportunityApplicationRecord;
  opportunityTitle?: string;
  token: string;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: string) => Promise<void> | void;
  onUpdateNotes?: (id: string, notes: string) => Promise<void> | void;
  onGetResumeFile?: (application: any, download: boolean) => Promise<void> | void;
}

// Helper: Render Question -> Answer pair with empty state handling
function QuestionAnswer({
  label,
  value,
  isRequired = false,
  isLongText = false,
  isLink = false,
  linkType,
  subLabel
}: {
  label: string;
  value?: string | number | boolean | null;
  isRequired?: boolean;
  isLongText?: boolean;
  isLink?: boolean;
  linkType?: 'linkedin' | 'github' | 'portfolio' | 'video' | 'general';
  subLabel?: string;
}) {
  const stringVal = value !== undefined && value !== null ? String(value).trim() : '';

  if (!stringVal) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-slate-700">{label}</span>
          {isRequired && <span className="text-red-500 font-bold text-xs">*</span>}
        </div>
        {subLabel && <p className="text-[11px] text-slate-500">{subLabel}</p>}
        <div>
          {isRequired ? (
            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-650 border border-red-200">
              ⚠️ Missing / Invalid submission data
            </span>
          ) : (
            <span className="text-xs italic text-slate-400">Not provided</span>
          )}
        </div>
      </div>
    );
  }

  if (isLink) {
    const raw = stringVal;
    const targetUrl = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    let icon = '🔗';
    let buttonText = 'Open Link ↗';
    let colorClasses = 'text-blue-600 hover:text-blue-800 bg-blue-50/60 border-blue-200';

    if (linkType === 'linkedin') {
      icon = '💼';
      buttonText = 'Open LinkedIn Profile ↗';
      colorClasses = 'text-[#0077b5] hover:text-[#005582] bg-sky-50 border-sky-200';
    } else if (linkType === 'github') {
      icon = '🐙';
      buttonText = 'Open GitHub Profile ↗';
      colorClasses = 'text-slate-900 hover:text-black bg-slate-100 border-slate-300';
    } else if (linkType === 'portfolio') {
      icon = '🌐';
      buttonText = 'Open Portfolio / Website ↗';
      colorClasses = 'text-aws-orange hover:text-orange-700 bg-orange-50 border-orange-200';
    } else if (linkType === 'video') {
      icon = '▶';
      buttonText = 'Open Introduction Video ↗';
      colorClasses = 'text-purple-700 hover:text-purple-900 bg-purple-50 border-purple-250';
    }

    return (
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-700 block">{label}</span>
        {subLabel && <p className="text-[11px] text-slate-500">{subLabel}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-xs ${colorClasses}`}
          >
            <span>{icon}</span>
            <span>{buttonText}</span>
          </a>
          <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs select-all">
            {raw}
          </span>
        </div>
      </div>
    );
  }

  if (isLongText) {
    return (
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-800 block">{label}</span>
        {subLabel && <p className="text-[11px] text-slate-500 leading-tight">{subLabel}</p>}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-850 leading-relaxed whitespace-pre-wrap break-words shadow-xs">
          {stringVal}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">{label}</span>
      {subLabel && <p className="text-[10px] text-slate-400">{subLabel}</p>}
      <p className="text-xs font-semibold text-slate-900 break-words">{stringVal}</p>
    </div>
  );
}

// Helper: Section container with numbered badges
function SectionContainer({
  number,
  title,
  subtitle,
  children
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-navy text-[11px] font-bold text-white shadow-xs">
          {number}
        </span>
        <div>
          <h4 className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 font-normal">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminOpportunityApplicationDetailsModal({
  application,
  opportunityTitle,
  token,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onGetResumeFile
}: AdminOpportunityApplicationDetailsModalProps) {
  const [currentStatus, setCurrentStatus] = useState(application.status || 'New');
  const [notes, setNotes] = useState(application.adminNotes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const effectiveFormType = (application.formType || '').toLowerCase().trim();
  const isFoundingMember = effectiveFormType === 'founding-member' || (!effectiveFormType && String(application.whyFoundingMember || '').length > 0);
  const isCoreTeam = effectiveFormType === 'core-team' || (!effectiveFormType && String(application.whyCoreTeam || '').length > 0);
  const isAnchorSpeaker = !isFoundingMember && !isCoreTeam;

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (onUpdateStatus) {
      await onUpdateStatus(application.id, newStatus);
    }
  };

  const handleNotesBlur = async () => {
    if (notes === (application.adminNotes || '')) return;
    setSavingNotes(true);
    try {
      if (onUpdateNotes) {
        await onUpdateNotes(application.id, notes);
      }
    } finally {
      setSavingNotes(false);
    }
  };

  // Known field keys to check for unrendered dynamic / historical fields
  const renderedStandardKeys = new Set([
    'id', 'opportunityId', 'opportunitySlug', 'formType', 'name', 'email', 'personalEmail',
    'phone', 'university', 'program', 'department', 'branch', 'currentYear', 'graduationYear',
    'studentId', 'rollNumber', 'linkedin', 'github', 'portfolio', 'resumeUrl', 'introductionVideoUrl',
    'videoUrl', 'preferredDomain', 'preferredRole', 'skills', 'primarySkillLevel', 'experience',
    'previousExperience', 'roleAndImpact', 'exactResponsibility', 'teamworkSituation',
    'leadershipExperience', 'leadershipDetails', 'whyFoundingMember', 'whyCoreTeam',
    'personalContribution', 'domainContribution', 'communityGrowthIdeas', 'scenarioAnswer',
    'scenarioDropParticipation', 'scenarioUnavailableMembers', 'availabilityHours',
    'consistentContribution', 'contributionDuration', 'academicBalance', 'availableDays',
    'activeParticipation', 'involvementDuration', 'motivation', 'coverLetter',
    'additionalInformation', 'consent', 'status', 'adminNotes', 'createdAt', 'updatedAt',
    '_recordType'
  ]);

  // Extract any additional/historical unmapped keys
  const extraCustomEntries = Object.entries(application).filter(
    ([key, val]) => !renderedStandardKeys.has(key) && val !== undefined && val !== null && val !== ''
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans text-xs">
      <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto font-sans">
        
        {/* HEADER & OVERVIEW */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-brand-navy via-slate-900 to-slate-950 p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-aws-orange/20 border border-aws-orange/40 px-2.5 py-0.5 text-[10px] font-bold text-aws-orange uppercase tracking-wider">
                {isFoundingMember
                  ? 'Founding Member Application'
                  : isCoreTeam
                  ? 'Core Team Application'
                  : 'Anchor & Speaker Application'}
              </span>
              {application.preferredDomain && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                  {application.preferredDomain}
                </span>
              )}
              {application.preferredRole && (
                <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
                  {application.preferredRole}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">{application.name}</h3>
            <p className="text-[11px] text-slate-300 font-mono">
              ID: {application.id} • Applied: {application.createdAt ? new Date(application.createdAt).toLocaleString() : '—'}
            </p>
            {opportunityTitle && (
              <p className="text-[11px] text-slate-300">
                Opportunity: <span className="font-semibold text-white">{opportunityTitle}</span>
              </p>
            )}
          </div>

          {/* Quick Status Control & Close */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Status:</span>
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-brand-navy border border-slate-600 rounded text-xs font-bold text-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-aws-orange cursor-pointer"
              >
                <option value="New">New</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="Close details"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CASE A: FOUNDING MEMBER COMPLETE SUBMITTED DATA (11 SECTIONS) */}
        {/* ========================================================= */}
        {isFoundingMember && (
          <div className="space-y-4">
            {/* SECTION 01: Personal & Academic Details */}
            <SectionContainer number="01" title="Personal & Academic Details">
              <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                <QuestionAnswer label="Full Name" value={application.name} isRequired />
                <QuestionAnswer label="University Email" value={application.email} isRequired />
                <QuestionAnswer label="Personal Email" value={application.personalEmail} />
                <QuestionAnswer label="Phone (WhatsApp)" value={application.phone} isRequired />
                <QuestionAnswer label="Roll Number / University ID" value={application.studentId || application.rollNumber} isRequired />
                <QuestionAnswer label="University" value={application.university || 'Chandigarh University – Uttar Pradesh'} />
                <QuestionAnswer label="Course / Program" value={application.program} isRequired />
                <QuestionAnswer label="Branch / Department" value={application.department || application.branch} isRequired />
                <QuestionAnswer label="Current Year" value={application.currentYear} isRequired />
                <QuestionAnswer label="Expected Graduation Year" value={application.graduationYear} isRequired />
              </div>
            </SectionContainer>

            {/* SECTION 02: Preferred Domain */}
            <SectionContainer number="02" title="Preferred Domain">
              <QuestionAnswer
                label="Selected Domain"
                value={application.preferredDomain}
                isRequired
                subLabel="Which domain does the candidate prefer to contribute to?"
              />
            </SectionContainer>

            {/* SECTION 03: Skills & Areas of Expertise */}
            <SectionContainer number="03" title="Skills & Areas of Expertise">
              <QuestionAnswer
                label="What skills, strengths, or areas of expertise can you contribute to the community?"
                value={application.skills}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 04: Previous Experience */}
            <SectionContainer number="04" title="Previous Experience & Impact">
              <div className="space-y-3.5">
                <QuestionAnswer
                  label="Tell us about a project, club, community, event, or leadership experience you have been involved in."
                  value={application.experience || application.previousExperience}
                  isRequired
                  isLongText
                />
                <QuestionAnswer
                  label="What was your role and what impact did you make?"
                  value={application.roleAndImpact}
                  isRequired
                  isLongText
                />
              </div>
            </SectionContainer>

            {/* SECTION 05: Why Founding Member? */}
            <SectionContainer number="05" title="Why Founding Member?">
              <QuestionAnswer
                label="Why do you want to become a Founding Member of AWS Student Builder Group at Chandigarh University – Uttar Pradesh?"
                value={application.whyFoundingMember || application.motivation}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 06: Contribution */}
            <SectionContainer number="06" title="Contribution">
              <QuestionAnswer
                label="What can you personally contribute to AWS Student Builder Group as a Founding Member?"
                value={application.personalContribution}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 07: Community Growth Ideas */}
            <SectionContainer number="07" title="Community Growth Ideas">
              <QuestionAnswer
                label="If you became a Founding Member, what would you do to improve and grow the AWS Student Builder Group community?"
                value={application.communityGrowthIdeas}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 08: Availability & Long-Term Commitment */}
            <SectionContainer number="08" title="Weekly Availability & Long-Term Commitment">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <QuestionAnswer label="1. Weekly Availability" value={application.availabilityHours} isRequired />
                <QuestionAnswer label="2. Consistent Commitment" value={application.consistentContribution} isRequired />
                <QuestionAnswer label="3. Contribution Duration" value={application.contributionDuration} isRequired />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <QuestionAnswer
                  label="4. How will you balance academics with your responsibilities as a Founding Member?"
                  value={application.academicBalance}
                  isRequired
                  isLongText
                />
              </div>
            </SectionContainer>

            {/* SECTION 09: Ownership & Initiative Scenario */}
            <SectionContainer number="09" title="Ownership & Initiative Scenario">
              <QuestionAnswer
                label="Scenario: “You notice that participation in a community activity has dropped significantly. As a Founding Member, what would you do?”"
                value={application.scenarioDropParticipation || application.scenarioAnswer}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 10: Professional Links */}
            <SectionContainer number="10" title="Professional Links">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <QuestionAnswer label="LinkedIn Profile" value={application.linkedin} isRequired isLink linkType="linkedin" />
                <QuestionAnswer label="GitHub Profile" value={application.github} isLink linkType="github" />
                <QuestionAnswer label="Portfolio / Website" value={application.portfolio} isLink linkType="portfolio" />
              </div>
            </SectionContainer>

            {/* SECTION 11: Final Declaration */}
            <SectionContainer number="11" title="Final Declaration">
              <QuestionAnswer
                label="Declaration: “I understand that becoming a Founding Member involves consistent contribution, ownership, teamwork, and long-term responsibility toward the community.”"
                value={application.consent ? '✅ Confirmed & Agreed' : '❌ Not confirmed'}
                isRequired
              />
            </SectionContainer>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE B: CORE TEAM COMPLETE SUBMITTED DATA (11 SECTIONS) */}
        {/* ========================================================= */}
        {isCoreTeam && (
          <div className="space-y-4">
            {/* SECTION 01: Personal & Academic Details */}
            <SectionContainer number="01" title="Personal & Academic Details">
              <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                <QuestionAnswer label="Full Name" value={application.name} isRequired />
                <QuestionAnswer label="University Email" value={application.email} isRequired />
                <QuestionAnswer label="Personal Email" value={application.personalEmail} />
                <QuestionAnswer label="Phone (WhatsApp)" value={application.phone} isRequired />
                <QuestionAnswer label="Roll Number / University ID" value={application.studentId || application.rollNumber} isRequired />
                <QuestionAnswer label="University" value={application.university || 'Chandigarh University – Uttar Pradesh'} />
                <QuestionAnswer label="Course / Program" value={application.program} isRequired />
                <QuestionAnswer label="Branch / Department" value={application.department || application.branch} isRequired />
                <QuestionAnswer label="Current Year" value={application.currentYear} isRequired />
                <QuestionAnswer label="Expected Graduation Year" value={application.graduationYear} isRequired />
              </div>
            </SectionContainer>

            {/* SECTION 02: Preferred Domain */}
            <SectionContainer number="02" title="Preferred Domain">
              <QuestionAnswer
                label="Selected Domain"
                value={application.preferredDomain}
                isRequired
                subLabel="Primary domain chosen by the applicant"
              />
            </SectionContainer>

            {/* SECTION 03: Preferred Role / Responsibility */}
            <SectionContainer number="03" title="Preferred Role / Responsibility">
              <QuestionAnswer
                label="Selected Role"
                value={application.preferredRole}
                isRequired
                subLabel={`Role within ${application.preferredDomain || 'selected domain'}`}
              />
            </SectionContainer>

            {/* SECTION 04: Relevant Skills & Proficiency */}
            <SectionContainer number="04" title="Relevant Skills & Proficiency">
              <div className="space-y-3">
                <QuestionAnswer
                  label="What technical, creative, communication, management, or professional skills do you currently have that are relevant to your selected domain?"
                  value={application.skills}
                  isRequired
                  isLongText
                />
                <div className="pt-2 border-t border-slate-100">
                  <QuestionAnswer
                    label="Self-Rated Primary Skill Level"
                    value={application.primarySkillLevel ? `Level: ${application.primarySkillLevel}` : null}
                    isRequired
                  />
                </div>
              </div>
            </SectionContainer>

            {/* SECTION 05: Previous Experience & Projects */}
            <SectionContainer number="05" title="Previous Experience & Projects">
              <div className="space-y-3.5">
                <QuestionAnswer
                  label="Tell us about relevant projects, internships, clubs, communities, events, competitions, volunteering, or other experiences."
                  value={application.experience || application.previousExperience}
                  isRequired
                  isLongText
                />
                <QuestionAnswer
                  label="What exactly was your responsibility in that experience?"
                  value={application.exactResponsibility}
                  isRequired
                  isLongText
                />
              </div>
            </SectionContainer>

            {/* SECTION 06: Leadership & Teamwork */}
            <SectionContainer number="06" title="Leadership & Teamwork">
              <div className="space-y-3.5">
                <QuestionAnswer
                  label="Describe a situation where you worked as part of a team. What was your responsibility and how did you contribute?"
                  value={application.teamworkSituation}
                  isRequired
                  isLongText
                />
                <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  <QuestionAnswer
                    label="Previous Leadership Experience"
                    value={application.leadershipExperience}
                    isRequired
                  />
                  <QuestionAnswer
                    label="Leadership / Management Details"
                    value={application.leadershipDetails || (application.leadershipExperience === 'No' ? 'Not applicable (No previous leadership)' : null)}
                  />
                </div>
              </div>
            </SectionContainer>

            {/* SECTION 07: Why Core Team? */}
            <SectionContainer number="07" title="Why Core Team?">
              <QuestionAnswer
                label="Why do you want to join the Core Team of AWS Student Builder Group at Chandigarh University – Uttar Pradesh?"
                value={application.whyCoreTeam || application.motivation}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 08: Domain Contribution */}
            <SectionContainer number="08" title="Domain Contribution">
              <QuestionAnswer
                label={`How would you contribute to your selected domain (${application.preferredDomain || 'Selected Domain'}) as a Core Team member?`}
                value={application.domainContribution}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 09: Problem-Solving / Crisis Scenario */}
            <SectionContainer number="09" title="Problem-Solving / Crisis Scenario">
              <QuestionAnswer
                label="Scenario: “You are responsible for an important community activity, but one or more team members are unavailable shortly before the event. What would you do to ensure the activity still runs successfully?”"
                value={application.scenarioUnavailableMembers || application.scenarioAnswer}
                isRequired
                isLongText
              />
            </SectionContainer>

            {/* SECTION 10: Availability & Time Commitment */}
            <SectionContainer number="10" title="Availability & Commitment">
              <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
                <QuestionAnswer label="1. Weekly Availability" value={application.availabilityHours} isRequired />
                <QuestionAnswer label="2. Available Days" value={application.availableDays} isRequired />
                <QuestionAnswer label="3. Active Participation" value={application.activeParticipation} isRequired />
                <QuestionAnswer label="4. Involvement Duration" value={application.involvementDuration} isRequired />
              </div>
            </SectionContainer>

            {/* SECTION 11: Professional Links & Declaration */}
            <SectionContainer number="11" title="Professional Links & Declaration">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <QuestionAnswer label="LinkedIn Profile" value={application.linkedin} isRequired isLink linkType="linkedin" />
                <QuestionAnswer label="GitHub Profile" value={application.github} isLink linkType="github" />
                <QuestionAnswer label="Portfolio / Website" value={application.portfolio} isLink linkType="portfolio" />
              </div>
              <div className="pt-3 border-t border-slate-100">
                <QuestionAnswer
                  label="Declaration: “I confirm that the information provided by me is accurate and I am committed to actively contributing as a Core Team member.”"
                  value={application.consent ? '✅ Confirmed & Committed' : '❌ Not confirmed'}
                  isRequired
                />
              </div>
            </SectionContainer>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE C: ANCHOR & SPEAKER COMPLETE SUBMITTED DATA */}
        {/* ========================================================= */}
        {isAnchorSpeaker && (
          <div className="space-y-4">
            {/* SECTION 01: Personal Information */}
            <SectionContainer number="01" title="Personal Information">
              <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                <QuestionAnswer label="Full Name" value={application.name} isRequired />
                <QuestionAnswer label="Email" value={application.email} isRequired />
                <QuestionAnswer label="Phone" value={application.phone} isRequired />
                <QuestionAnswer label="University" value={application.university || 'Chandigarh University'} isRequired />
                <QuestionAnswer label="Course / Program" value={application.program} isRequired />
                <QuestionAnswer label="Graduation Year / Year" value={application.graduationYear} isRequired />
                <QuestionAnswer label="Student ID / Roll Number" value={application.studentId || application.rollNumber} isRequired />
              </div>
            </SectionContainer>

            {/* SECTION 02: Professional Information & Links */}
            <SectionContainer number="02" title="Professional Information & Links">
              <div className="grid gap-3.5 sm:grid-cols-2 mb-3.5">
                <QuestionAnswer label="LinkedIn Profile" value={application.linkedin} isRequired isLink linkType="linkedin" />
                <QuestionAnswer label="Portfolio / Website" value={application.portfolio} isLink linkType="portfolio" />
              </div>
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <QuestionAnswer label="Skills" value={application.skills} isRequired isLongText />
                <QuestionAnswer label="Previous Experience" value={application.experience || application.previousExperience} isRequired isLongText />
              </div>
            </SectionContainer>

            {/* SECTION 03: Short Introduction Video */}
            <SectionContainer number="03" title="🎥 Short Introduction Video (Google Drive)">
              <div className="space-y-2">
                <QuestionAnswer
                  label="Introduction Video URL"
                  value={application.introductionVideoUrl || application.videoUrl}
                  isRequired
                  isLink
                  linkType="video"
                  subLabel="Google Drive video link submitted by candidate"
                />
              </div>
            </SectionContainer>

            {/* SECTION 04: Application Statement & Motivation */}
            <SectionContainer number="04" title="Application Motivation & Details">
              <div className="space-y-3.5">
                <QuestionAnswer
                  label="Why do you want to join / Why are you interested?"
                  value={application.motivation}
                  isRequired
                  isLongText
                />
                {application.coverLetter && (
                  <QuestionAnswer
                    label="Cover Letter / Additional Statement"
                    value={application.coverLetter}
                    isLongText
                  />
                )}
                <QuestionAnswer
                  label="Additional Information"
                  value={application.additionalInformation}
                  isLongText
                />
              </div>
            </SectionContainer>

            {/* SECTION 05: Declaration & Consent */}
            <SectionContainer number="05" title="Declaration & Consent">
              <QuestionAnswer
                label="Confirmation & Consent to be considered"
                value={application.consent ? '✅ Confirmed & Consented' : '❌ Not confirmed'}
                isRequired
              />
            </SectionContainer>
          </div>
        )}

        {/* ========================================================= */}
        {/* HISTORICAL RESUME / MEDIA ATTACHMENTS */}
        {/* ========================================================= */}
        {application.resumeUrl && (
          <SectionContainer number="📎" title="Attached Resume (Historical / File Submission)">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onGetResumeFile && onGetResumeFile(application, false)}
                className="px-3.5 py-2 rounded-lg bg-brand-navy hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>📄</span>
                <span>View Resume</span>
              </button>
              <button
                type="button"
                onClick={() => onGetResumeFile && onGetResumeFile(application, true)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>⬇️</span>
                <span>Download Resume</span>
              </button>
              <span className="text-[11px] text-slate-500 font-mono">
                Storage: {application.resumeUrl}
              </span>
            </div>
          </SectionContainer>
        )}

        {/* ========================================================= */}
        {/* DYNAMIC / HISTORICAL UNMAPPED FIELDS CATCH-ALL */}
        {/* ========================================================= */}
        {extraCustomEntries.length > 0 && (
          <SectionContainer number="✦" title="Additional / Historical Custom Fields" subtitle="Extra submitted fields preserved from previous schemas or custom inputs">
            <div className="grid gap-3 sm:grid-cols-2">
              {extraCustomEntries.map(([key, val]) => (
                <div key={key} className="rounded-lg border border-slate-150 bg-slate-50 p-3">
                  <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider font-mono">
                    {key}
                  </span>
                  <div className="mt-1 text-xs text-slate-850 whitespace-pre-wrap break-words">
                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>
        )}

        {/* ========================================================= */}
        {/* INTERNAL ADMIN NOTES (AUTO-SAVES ON BLUR) */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
              <span>📝</span>
              <span>Internal Admin Notes</span>
            </span>
            {savingNotes && (
              <span className="text-[10px] text-aws-orange font-semibold animate-pulse">
                Saving notes...
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add internal evaluation notes, interview remarks, or status comments (auto-saves on blur)..."
            className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-sans text-slate-850 focus:outline-none focus:ring-2 focus:ring-aws-orange/30 focus:border-aws-orange"
          />
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            Applicant ID: <span className="font-mono font-semibold text-slate-700">{application.id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
