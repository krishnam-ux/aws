'use client';

import Link from 'next/link';
import { FormEvent, InvalidEvent, useState } from 'react';
import {
  isValidGoogleDriveUrl,
  isValidLinkedInUrl,
  getOpportunityFormType,
  OPPORTUNITY_DOMAINS,
  CORE_TEAM_ROLES_BY_DOMAIN,
  OpportunityDomain
} from '@/lib/opportunityApplication';

type OpportunityApplicationFormProps = {
  opportunityId: string;
  opportunitySlug: string;
  opportunityTitle: string;
  backHref: string;
  variant: 'career' | 'opportunity';
};

type FieldErrors = Record<string, string>;

function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1" role="alert">
      <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </p>
  ) : null;
}

export default function OpportunityApplicationForm({
  opportunityId,
  opportunitySlug,
  opportunityTitle,
  backHref,
  variant,
}: OpportunityApplicationFormProps) {
  const formType = getOpportunityFormType(opportunitySlug, opportunityTitle);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for dynamic conditional inputs
  const [selectedDomain, setSelectedDomain] = useState<OpportunityDomain>('Tech & Technical');
  const [selectedRole, setSelectedRole] = useState('');
  const [hadLeadershipRole, setHadLeadershipRole] = useState<'Yes' | 'No'>('No');

  // Generic & Anchor/Speaker Validator
  const validateAnchorSpeaker = (data: FormData): FieldErrors => {
    const nextErrors: FieldErrors = {};
    const value = (name: string) => String(data.get(name) || '').trim();

    if (!value('name')) nextErrors.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(value('email'))) nextErrors.email = 'Please enter a valid email address.';
    if (!value('phone')) nextErrors.phone = 'Please enter your phone number.';
    if (!value('university')) nextErrors.university = 'Please enter your university.';
    if (!value('program')) nextErrors.program = 'Please enter your course or program.';
    if (!value('graduationYear')) nextErrors.graduationYear = 'Please enter your graduation year.';
    if (!value('studentId')) nextErrors.studentId = 'Please enter your student ID / roll number.';
    if (!value('linkedin')) {
      nextErrors.linkedin = 'LinkedIn Profile is required.';
    } else if (!isValidLinkedInUrl(value('linkedin'))) {
      nextErrors.linkedin = 'Please enter a valid LinkedIn profile URL.';
    }

    const videoUrl = value('introductionVideoUrl') || value('videoUrl');
    if (!videoUrl || !isValidGoogleDriveUrl(videoUrl)) {
      nextErrors.introductionVideoUrl = 'Please provide a valid Google Drive sharing link for your introduction video.';
    }

    if (!value('skills')) nextErrors.skills = 'Please enter your skills.';
    if (!value('experience')) nextErrors.experience = 'Please enter your experience.';
    if (!value('motivation')) nextErrors.motivation = 'Please explain why you want to join.';
    if (!data.get('consent')) nextErrors.consent = 'Please confirm the declaration checkbox.';
    return nextErrors;
  };

  // Founding Member Form Validator
  const validateFoundingMember = (data: FormData): FieldErrors => {
    const nextErrors: FieldErrors = {};
    const value = (name: string) => String(data.get(name) || '').trim();

    // Section 1: Personal & Academic Details
    if (!value('name')) nextErrors.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(value('email'))) nextErrors.email = 'Please enter a valid university email address.';
    if (!value('phone')) nextErrors.phone = 'Please enter your phone number.';
    if (!value('studentId')) nextErrors.studentId = 'Please enter your Roll Number / University ID.';
    if (!value('program')) nextErrors.program = 'Please enter your Course / Program (e.g. B.Tech CSE).';
    if (!value('department')) nextErrors.department = 'Please enter your Branch / Department.';
    if (!value('currentYear')) nextErrors.currentYear = 'Please select your current year.';
    if (!value('graduationYear')) nextErrors.graduationYear = 'Please select your expected graduation year.';

    // Section 2: Preferred Domain
    if (!value('preferredDomain')) nextErrors.preferredDomain = 'Please select your preferred domain.';

    // Section 3: Skills & Areas of Expertise
    if (!value('skills') || value('skills').length < 10) {
      nextErrors.skills = 'Please describe your skills and strengths in detail (minimum 10 characters).';
    }

    // Section 4: Previous Experience
    if (!value('experience') || value('experience').length < 10) {
      nextErrors.experience = 'Please describe your relevant experience, projects, or community involvement.';
    }
    if (!value('roleAndImpact') || value('roleAndImpact').length < 10) {
      nextErrors.roleAndImpact = 'Please describe what your role was and the impact you made.';
    }

    // Section 5: Why Founding Member?
    if (!value('whyFoundingMember') || value('whyFoundingMember').length < 20) {
      nextErrors.whyFoundingMember = 'Please provide a meaningful response explaining why you want to become a Founding Member (min 20 characters).';
    }

    // Section 6: Contribution
    if (!value('personalContribution') || value('personalContribution').length < 20) {
      nextErrors.personalContribution = 'Please explain what you can personally contribute to the community.';
    }

    // Section 7: Community Growth Ideas
    if (!value('communityGrowthIdeas') || value('communityGrowthIdeas').length < 20) {
      nextErrors.communityGrowthIdeas = 'Please share your practical ideas for community growth and improvement.';
    }

    // Section 8: Availability & Long-Term Commitment
    if (!value('availabilityHours')) nextErrors.availabilityHours = 'Please select your weekly time availability.';
    if (!value('consistentContribution')) nextErrors.consistentContribution = 'Please select your long-term consistency commitment.';
    if (!value('contributionDuration')) nextErrors.contributionDuration = 'Please select your expected contribution duration.';
    if (!value('academicBalance') || value('academicBalance').length < 10) {
      nextErrors.academicBalance = 'Please describe how you will balance academics with community responsibilities.';
    }

    // Section 9: Ownership & Initiative Scenario
    if (!value('scenarioDropParticipation') || value('scenarioDropParticipation').length < 20) {
      nextErrors.scenarioDropParticipation = 'Please share your approach to this scenario in detail.';
    }

    // Section 10: Professional Links
    if (!value('linkedin')) {
      nextErrors.linkedin = 'LinkedIn Profile is required.';
    } else if (!isValidLinkedInUrl(value('linkedin'))) {
      nextErrors.linkedin = 'Please enter a valid LinkedIn profile URL.';
    }

    // Section 11: Final Declaration
    if (!data.get('consent')) nextErrors.consent = 'You must confirm the declaration to submit your application.';

    return nextErrors;
  };

  // Core Team Form Validator
  const validateCoreTeam = (data: FormData): FieldErrors => {
    const nextErrors: FieldErrors = {};
    const value = (name: string) => String(data.get(name) || '').trim();

    // Section 1: Personal & Academic Details
    if (!value('name')) nextErrors.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(value('email'))) nextErrors.email = 'Please enter a valid university email address.';
    if (!value('phone')) nextErrors.phone = 'Please enter your phone number.';
    if (!value('studentId')) nextErrors.studentId = 'Please enter your Roll Number / University ID.';
    if (!value('program')) nextErrors.program = 'Please enter your Course / Program.';
    if (!value('department')) nextErrors.department = 'Please enter your Branch / Department.';
    if (!value('currentYear')) nextErrors.currentYear = 'Please select your current year.';
    if (!value('graduationYear')) nextErrors.graduationYear = 'Please select your expected graduation year.';

    // Section 2: Preferred Domain
    if (!value('preferredDomain')) nextErrors.preferredDomain = 'Please select your preferred domain.';

    // Section 3: Preferred Role
    if (!value('preferredRole')) nextErrors.preferredRole = 'Please select your preferred role / responsibility.';

    // Section 4: Relevant Skills
    if (!value('skills') || value('skills').length < 10) {
      nextErrors.skills = 'Please describe your relevant skills in detail.';
    }
    if (!value('primarySkillLevel')) nextErrors.primarySkillLevel = 'Please rate your current level in your primary skill.';

    // Section 5: Previous Experience & Projects
    if (!value('experience') || value('experience').length < 10) {
      nextErrors.experience = 'Please describe your relevant experiences, projects, or club activities.';
    }
    if (!value('exactResponsibility') || value('exactResponsibility').length < 10) {
      nextErrors.exactResponsibility = 'Please specify what exactly was your responsibility.';
    }

    // Section 6: Leadership & Teamwork
    if (!value('teamworkSituation') || value('teamworkSituation').length < 15) {
      nextErrors.teamworkSituation = 'Please describe a teamwork situation and your contribution.';
    }
    if (!value('leadershipExperience')) nextErrors.leadershipExperience = 'Please select Yes or No.';
    if (value('leadershipExperience') === 'Yes' && (!value('leadershipDetails') || value('leadershipDetails').length < 10)) {
      nextErrors.leadershipDetails = 'Please provide details about what you organized, managed, or led.';
    }

    // Section 7: Why Core Team?
    if (!value('whyCoreTeam') || value('whyCoreTeam').length < 20) {
      nextErrors.whyCoreTeam = 'Please explain why you want to join the Core Team (min 20 characters).';
    }

    // Section 8: Domain Contribution
    if (!value('domainContribution') || value('domainContribution').length < 20) {
      nextErrors.domainContribution = 'Please explain how you would contribute to your selected domain.';
    }

    // Section 9: Problem-Solving Scenario
    if (!value('scenarioUnavailableMembers') || value('scenarioUnavailableMembers').length < 20) {
      nextErrors.scenarioUnavailableMembers = 'Please explain how you would handle this scenario.';
    }

    // Section 10: Availability & Commitment
    if (!value('availabilityHours')) nextErrors.availabilityHours = 'Please select your weekly time availability.';
    if (!value('availableDays')) nextErrors.availableDays = 'Please select the days you are generally available.';
    if (!value('activeParticipation')) nextErrors.activeParticipation = 'Please select your meeting & event participation commitment.';
    if (!value('involvementDuration')) nextErrors.involvementDuration = 'Please select your expected involvement duration.';

    // Section 11: Professional Links
    if (!value('linkedin')) {
      nextErrors.linkedin = 'LinkedIn Profile is required.';
    } else if (!isValidLinkedInUrl(value('linkedin'))) {
      nextErrors.linkedin = 'Please enter a valid LinkedIn profile URL.';
    }

    // Section 11: Final Declaration
    if (!data.get('consent')) nextErrors.consent = 'You must confirm the declaration to submit your application.';

    return nextErrors;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setDuplicate(false);
    const form = event.currentTarget;
    const data = new FormData(form);

    let nextErrors: FieldErrors = {};
    if (formType === 'founding-member') {
      nextErrors = validateFoundingMember(data);
    } else if (formType === 'core-team') {
      nextErrors = validateCoreTeam(data);
    } else {
      nextErrors = validateAnchorSpeaker(data);
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstErrorField = Object.keys(nextErrors)[0];
      const firstInvalid = form.querySelector(`[name="${firstErrorField}"]`) as HTMLElement | null;
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), redirect: 'follow' });
      if (response.status === 409) {
        setDuplicate(true);
        return;
      }
      if (!response.ok) {
        let message = 'We could not submit your application. Please review the form and try again.';
        try {
          const resData = await response.json();
          if (resData.fieldErrors) setErrors(resData.fieldErrors);
          if (resData.error) message = resData.error;
        } catch {
          // Fallback
        }
        setFormError(message);
        return;
      }
      window.location.assign(response.url);
    } catch {
      setFormError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const showNativeError = (event: InvalidEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  if (duplicate) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600">!</div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-aws-orange">Application status</p>
          <h1 className="text-3xl font-black tracking-tight text-brand-navy">Application Already Submitted</h1>
          <div className="mt-6 space-y-4 text-base leading-7 text-slate-600">
            <p>You have already submitted an application for this opportunity using this email address.</p>
            <p className="font-semibold text-slate-800">Your application is already recorded with our team.</p>
            <p>Please wait for the review/update from the AWS Student Builder Group team. You do not need to submit the application again.</p>
          </div>
          <Link href="/opportunities" className="btn-primary mt-8 inline-flex">Back to Opportunities</Link>
        </section>
      </main>
    );
  }

  const inputClass = (name: string) =>
    `form-input-field mt-1 w-full rounded-lg border text-sm transition-all focus:ring-2 focus:ring-aws-orange/20 ${
      errors[name] ? 'border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-aws-orange bg-white'
    }`;

  // ==========================================
  // RENDER: FOUNDING MEMBER APPLICATION FORM
  // ==========================================
  if (formType === 'founding-member') {
    return (
      <form
        action="/api/career-applications"
        method="POST"
        encType="multipart/form-data"
        className="space-y-8 font-sans"
        onSubmit={submit}
        onInvalid={showNativeError}
        noValidate
      >
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <input type="hidden" name="opportunitySlug" value={opportunitySlug} />
        <input type="hidden" name="formType" value="founding-member" />
        <input type="hidden" name="university" value="Chandigarh University – Uttar Pradesh" />

        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm" role="alert">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">⚠️</span>
              <span>{formError}</span>
            </div>
          </div>
        ) : null}

        {/* Opportunity Header Highlight */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-navy via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-aws-orange/20 border border-aws-orange/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aws-orange">
              Leadership & Community
            </span>
            <span className="text-xs text-slate-300">AWS Student Builder Group</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Founding Member Application
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            We are looking for passionate, consistent student leaders committed to shaping the culture, sustainability, and long-term growth of the AWS Student Builder Group community at Chandigarh University – Uttar Pradesh.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-200">
            <span className="bg-white/10 px-2.5 py-1 rounded-md">⭐ Ownership</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">🤝 Initiative</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">🚀 Community Building</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">📅 Long-Term Commitment</span>
          </div>
        </div>

        {/* SECTION 1: Personal & Academic Details */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">01</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Personal & Academic Details</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Full Name <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="name" placeholder="Your complete name" className={inputClass('name')} />
              <ErrorText message={errors.name} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                University Email <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="email" name="email" placeholder="uid@culko.in / name@cumail.in" className={inputClass('email')} />
              <ErrorText message={errors.email} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Personal Email <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <input type="email" name="personalEmail" placeholder="personal@gmail.com" className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Phone Number (WhatsApp) <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="tel" name="phone" placeholder="+91 98765 43210" className={inputClass('phone')} />
              <ErrorText message={errors.phone} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Roll Number / University ID <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="studentId" placeholder="e.g. 23BCS10101 / UID" className={inputClass('studentId')} />
              <ErrorText message={errors.studentId} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Course / Program <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="program" placeholder="e.g. B.Tech Computer Science" className={inputClass('program')} />
              <ErrorText message={errors.program} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Branch / Department <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="department" placeholder="e.g. CSE / AI-ML / Cloud / IT" className={inputClass('department')} />
              <ErrorText message={errors.department} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-750">
                  Current Year <span className="text-red-600 font-bold">*</span>
                </label>
                <select name="currentYear" className={inputClass('currentYear')}>
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Post Graduate">Post Graduate</option>
                </select>
                <ErrorText message={errors.currentYear} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-750">
                  Graduation Year <span className="text-red-600 font-bold">*</span>
                </label>
                <select name="graduationYear" className={inputClass('graduationYear')}>
                  <option value="">Select Year</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                </select>
                <ErrorText message={errors.graduationYear} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Preferred Domain */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">02</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Preferred Domain</h3>
              <p className="text-xs text-slate-500">Which domain would you prefer to contribute to?</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {OPPORTUNITY_DOMAINS.map((domain) => (
              <label
                key={domain}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedDomain === domain
                    ? 'border-aws-orange bg-orange-50/30 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-brand-navy">{domain}</span>
                  <input
                    type="radio"
                    name="preferredDomain"
                    value={domain}
                    checked={selectedDomain === domain}
                    onChange={() => setSelectedDomain(domain)}
                    className="h-4 w-4 text-aws-orange focus:ring-aws-orange"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {domain === 'Tech & Technical' && 'Cloud, Web, DevOps, workshops, student tech builds.'}
                  {domain === 'Growth & Community' && 'Outreach, engagement, partnerships, event coordination.'}
                  {domain === 'Media & Creative' && 'Social media, graphics, video editing, coverage & branding.'}
                </p>
              </label>
            ))}
          </div>
          <ErrorText message={errors.preferredDomain} />
        </div>

        {/* SECTION 3: Skills & Areas of Expertise */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">03</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Skills & Areas of Expertise</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              What skills, strengths, or areas of expertise can you contribute to the community? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Describe both your technical and non-technical strengths.
            </p>

            <div className="my-3 flex flex-wrap gap-1.5">
              {[
                'Cloud / AWS', 'Web Development', 'Programming', 'DevOps', 'Public Speaking',
                'Community Building', 'Event Management', 'Marketing', 'Social Media',
                'Graphic Design', 'Video Editing', 'Content Creation', 'Communication', 'Leadership', 'Networking'
              ].map((pill) => (
                <span key={pill} className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-650 border border-slate-200">
                  {pill}
                </span>
              ))}
            </div>

            <textarea
              name="skills"
              rows={4}
              placeholder="Tell us about your strengths, tools you know, and areas where you can add value..."
              className={inputClass('skills')}
            />
            <ErrorText message={errors.skills} />
          </div>
        </div>

        {/* SECTION 4: Previous Experience */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">04</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Previous Experience</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Tell us about a project, club, community, event, or leadership experience you have been involved in. <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="experience"
                rows={3}
                placeholder="Mention previous clubs, college events, volunteering, hackathons, or project teams..."
                className={inputClass('experience')}
              />
              <ErrorText message={errors.experience} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                What was your role and what impact did you make? <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="roleAndImpact"
                rows={3}
                placeholder="Describe your specific responsibilities and the measurable or observable outcome..."
                className={inputClass('roleAndImpact')}
              />
              <ErrorText message={errors.roleAndImpact} />
            </div>
          </div>
        </div>

        {/* SECTION 5: Why Founding Member? */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">05</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Why Founding Member?</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              Why do you want to become a Founding Member of AWS Student Builder Group at Chandigarh University – Uttar Pradesh? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Help us understand your motivation, ownership mindset, and long-term interest in building this student community.
            </p>
            <textarea
              name="whyFoundingMember"
              rows={4}
              placeholder="Share your personal motivation and vision for becoming a founding builder..."
              className={inputClass('whyFoundingMember')}
            />
            <ErrorText message={errors.whyFoundingMember} />
          </div>
        </div>

        {/* SECTION 6: Contribution */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">06</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Contribution</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              What can you personally contribute to AWS Student Builder Group as a Founding Member? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Feel free to mention skills, time, initiative, event execution, community building, mentorship, content, or networking.
            </p>
            <textarea
              name="personalContribution"
              rows={4}
              placeholder="What unique value, effort, and support will you bring to the table?"
              className={inputClass('personalContribution')}
            />
            <ErrorText message={errors.personalContribution} />
          </div>
        </div>

        {/* SECTION 7: Community Growth Ideas */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">07</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Community Growth Ideas</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              If you became a Founding Member, what would you do to improve and grow the AWS Student Builder Group community? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Share actionable, practical ideas for workshops, student engagement, mentorship, industry connections, or campus presence.
            </p>
            <textarea
              name="communityGrowthIdeas"
              rows={4}
              placeholder="Suggest 1-3 practical ideas or initiatives you'd like to implement..."
              className={inputClass('communityGrowthIdeas')}
            />
            <ErrorText message={errors.communityGrowthIdeas} />
          </div>
        </div>

        {/* SECTION 8: Availability & Long-Term Commitment */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">08</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Availability & Long-Term Commitment</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                1. How many hours per week can you realistically contribute? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['1–2 hours', '3–5 hours', '6–8 hours', '9+ hours'].map((hours) => (
                  <label key={hours} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="availabilityHours" value={hours} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{hours}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.availabilityHours} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                2. Are you willing to contribute consistently over the long term? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Yes', 'Maybe / Depends on academics', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="consistentContribution" value={opt} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.consistentContribution} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                3. How long do you expect to actively contribute? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['One semester', 'One academic year', 'Multiple semesters', 'Until graduation'].map((duration) => (
                  <label key={duration} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="contributionDuration" value={duration} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{duration}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.contributionDuration} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                4. How will you balance academics with your responsibilities as a Founding Member? <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="academicBalance"
                rows={3}
                placeholder="Explain your approach to time management and balancing coursework with community duties..."
                className={inputClass('academicBalance')}
              />
              <ErrorText message={errors.academicBalance} />
            </div>
          </div>
        </div>

        {/* SECTION 9: Ownership & Initiative Scenario */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">09</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Ownership & Initiative</h3>
              <p className="text-xs text-slate-500">Scenario-based behavioral question</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 text-xs text-slate-750">
            <p className="font-bold text-slate-900 mb-1">Scenario Question:</p>
            <p className="italic">
              &ldquo;You notice that participation in a community activity has dropped significantly. As a Founding Member, what would you do?&rdquo;
            </p>
          </div>

          <div>
            <textarea
              name="scenarioDropParticipation"
              rows={4}
              placeholder="Detail your practical steps: analysis, communication with students, adjustments, and proactive solutions..."
              className={inputClass('scenarioDropParticipation')}
            />
            <ErrorText message={errors.scenarioDropParticipation} />
          </div>
        </div>

        {/* SECTION 10: Professional Links */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">10</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Professional Links</h3>
              <p className="text-xs text-slate-500">Provide your professional profiles</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                LinkedIn Profile <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="url"
                name="linkedin"
                required
                placeholder="https://www.linkedin.com/in/your-profile"
                className={inputClass('linkedin')}
                aria-invalid={Boolean(errors.linkedin)}
              />
              <ErrorText message={errors.linkedin} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                GitHub Profile <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input type="url" name="github" placeholder="https://github.com/..." className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                Portfolio / Website <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input type="url" name="portfolio" placeholder="https://..." className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-xs" />
            </div>
          </div>
        </div>

        {/* SECTION 11: Final Declaration */}
        <div className="tech-card-new space-y-5 p-6 sm:p-8 bg-slate-50/50">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">11</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Final Declaration</h3>
          </div>

          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 text-xs text-slate-700">
            <p className="leading-relaxed">
              &ldquo;I understand that becoming a Founding Member involves consistent contribution, ownership, teamwork, and long-term responsibility toward the community.&rdquo;
            </p>
          </div>

          <div>
            <label className="flex items-start gap-3 text-sm text-slate-750 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-aws-orange focus:ring-aws-orange"
              />
              <span className="leading-snug">
                I confirm that the information provided by me is accurate and complete. <span className="text-red-600 font-bold">*</span>
              </span>
            </label>
            <ErrorText message={errors.consent} />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-8 py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {submitting ? 'Submitting Application...' : 'Submit Founding Member Application'}
          </button>
          <Link href={backHref} className="btn-secondary px-6 py-3 text-sm">
            Cancel
          </Link>
        </div>
      </form>
    );
  }

  // ==========================================
  // RENDER: CORE TEAM APPLICATION FORM
  // ==========================================
  if (formType === 'core-team') {
    const roles = CORE_TEAM_ROLES_BY_DOMAIN[selectedDomain] || [];

    return (
      <form
        action="/api/career-applications"
        method="POST"
        encType="multipart/form-data"
        className="space-y-8 font-sans"
        onSubmit={submit}
        onInvalid={showNativeError}
        noValidate
      >
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <input type="hidden" name="opportunitySlug" value={opportunitySlug} />
        <input type="hidden" name="formType" value="core-team" />
        <input type="hidden" name="university" value="Chandigarh University – Uttar Pradesh" />

        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm" role="alert">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">⚠️</span>
              <span>{formError}</span>
            </div>
          </div>
        ) : null}

        {/* Opportunity Header Highlight */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-navy via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-aws-orange/20 border border-aws-orange/40 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-aws-orange">
              Operations & Execution
            </span>
            <span className="text-xs text-slate-300">AWS Student Builder Group</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Core Team Application
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Apply to join the operational backbone of the community. Core Team members actively execute events, manage technical initiatives, drive outreach, and create high-impact student experiences.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-200">
            <span className="bg-white/10 px-2.5 py-1 rounded-md">⚡ Execution</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">🛠️ Technical & Creative Skills</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">👥 Teamwork & Communication</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-md">🎯 Role-Specific Responsibility</span>
          </div>
        </div>

        {/* SECTION 1: Personal & Academic Details */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">01</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Personal & Academic Details</h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Full Name <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="name" placeholder="Your complete name" className={inputClass('name')} />
              <ErrorText message={errors.name} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                University Email <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="email" name="email" placeholder="uid@culko.in / name@cumail.in" className={inputClass('email')} />
              <ErrorText message={errors.email} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Personal Email <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <input type="email" name="personalEmail" placeholder="personal@gmail.com" className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Phone Number (WhatsApp) <span className="text-red-600 font-bold">*</span>
              </label>
              <input type="tel" name="phone" placeholder="+91 98765 43210" className={inputClass('phone')} />
              <ErrorText message={errors.phone} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Roll Number / University ID <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="studentId" placeholder="e.g. 23BCS10101 / UID" className={inputClass('studentId')} />
              <ErrorText message={errors.studentId} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Course / Program <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="program" placeholder="e.g. B.Tech Computer Science" className={inputClass('program')} />
              <ErrorText message={errors.program} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Branch / Department <span className="text-red-600 font-bold">*</span>
              </label>
              <input name="department" placeholder="e.g. CSE / AI-ML / Cloud / IT" className={inputClass('department')} />
              <ErrorText message={errors.department} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-750">
                  Current Year <span className="text-red-600 font-bold">*</span>
                </label>
                <select name="currentYear" className={inputClass('currentYear')}>
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Post Graduate">Post Graduate</option>
                </select>
                <ErrorText message={errors.currentYear} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-750">
                  Graduation Year <span className="text-red-600 font-bold">*</span>
                </label>
                <select name="graduationYear" className={inputClass('graduationYear')}>
                  <option value="">Select Year</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                </select>
                <ErrorText message={errors.graduationYear} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Preferred Domain */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">02</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Preferred Domain</h3>
              <p className="text-xs text-slate-500">Select the primary domain you want to contribute to</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {OPPORTUNITY_DOMAINS.map((domain) => (
              <label
                key={domain}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedDomain === domain
                    ? 'border-aws-orange bg-orange-50/30 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-brand-navy">{domain}</span>
                  <input
                    type="radio"
                    name="preferredDomain"
                    value={domain}
                    checked={selectedDomain === domain}
                    onChange={() => {
                      setSelectedDomain(domain);
                      setSelectedRole('');
                    }}
                    className="h-4 w-4 text-aws-orange focus:ring-aws-orange"
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {domain === 'Tech & Technical' && 'Technical content, Cloud, DevOps, web/software development.'}
                  {domain === 'Growth & Community' && 'Outreach, partnerships, community management, event logistics.'}
                  {domain === 'Media & Creative' && 'Design, photography, video production, branding, social media.'}
                </p>
              </label>
            ))}
          </div>
          <ErrorText message={errors.preferredDomain} />
        </div>

        {/* SECTION 3: Preferred Role / Responsibility (Domain-Aware) */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">03</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Preferred Role / Responsibility</h3>
              <p className="text-xs text-slate-500">Specific role within <span className="font-semibold text-slate-700">{selectedDomain}</span></p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {roles.map((role) => (
              <label
                key={role}
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  selectedRole === role
                    ? 'border-aws-orange bg-orange-50/40 text-brand-navy font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="preferredRole"
                  value={role}
                  checked={selectedRole === role}
                  onChange={() => setSelectedRole(role)}
                  className="mt-0.5 text-aws-orange focus:ring-aws-orange"
                />
                <span>{role}</span>
              </label>
            ))}
          </div>
          <ErrorText message={errors.preferredRole} />
        </div>

        {/* SECTION 4: Relevant Skills */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">04</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Relevant Skills</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                What technical, creative, communication, management, or professional skills do you currently have that are relevant to your selected domain? <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="skills"
                rows={4}
                placeholder="List tools, frameworks, technical skills, or design/management expertise you possess..."
                className={inputClass('skills')}
              />
              <ErrorText message={errors.skills} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                How would you rate your current level in your primary skill? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                  <label key={lvl} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer text-center">
                    <input type="radio" name="primarySkillLevel" value={lvl} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-semibold text-slate-800">{lvl}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.primarySkillLevel} />
            </div>
          </div>
        </div>

        {/* SECTION 5: Previous Experience & Projects */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">05</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Previous Experience & Projects</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Tell us about relevant projects, internships, clubs, communities, events, competitions, volunteering, or other experiences. <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="experience"
                rows={3}
                placeholder="Describe your hands-on experience, past responsibilities, or projects related to your domain..."
                className={inputClass('experience')}
              />
              <ErrorText message={errors.experience} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750">
                What exactly was your responsibility in that experience? <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="exactResponsibility"
                rows={3}
                placeholder="Highlight what you personally executed, coordinated, or delivered..."
                className={inputClass('exactResponsibility')}
              />
              <ErrorText message={errors.exactResponsibility} />
            </div>
          </div>
        </div>

        {/* SECTION 6: Leadership & Teamwork */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">06</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Leadership & Teamwork</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-750">
                Describe a situation where you worked as part of a team. What was your responsibility and how did you contribute? <span className="text-red-600 font-bold">*</span>
              </label>
              <textarea
                name="teamworkSituation"
                rows={3}
                placeholder="Share a real team scenario, communication during challenges, and your contribution..."
                className={inputClass('teamworkSituation')}
              />
              <ErrorText message={errors.teamworkSituation} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                Have you previously taken responsibility for organizing, managing, or leading an activity? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="flex gap-4">
                {(['Yes', 'No'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="leadershipExperience"
                      value={opt}
                      checked={hadLeadershipRole === opt}
                      onChange={() => setHadLeadershipRole(opt)}
                      className="text-aws-orange focus:ring-aws-orange"
                    />
                    <span className="text-xs font-semibold text-slate-800">{opt}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.leadershipExperience} />
            </div>

            {hadLeadershipRole === 'Yes' && (
              <div className="pt-2">
                <label className="block text-sm font-semibold text-slate-750">
                  Please describe what you organized, managed, or led, and the outcome. <span className="text-red-600 font-bold">*</span>
                </label>
                <textarea
                  name="leadershipDetails"
                  rows={3}
                  placeholder="Share details on team size, task, and results..."
                  className={inputClass('leadershipDetails')}
                />
                <ErrorText message={errors.leadershipDetails} />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 7: Why Core Team? */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">07</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Why Core Team?</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              Why do you want to join the Core Team of AWS Student Builder Group at Chandigarh University – Uttar Pradesh? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Focus on responsibility, willingness to execute, and your interest in active participation.
            </p>
            <textarea
              name="whyCoreTeam"
              rows={4}
              placeholder="Why this team, and why now? Share what motivates you to step up..."
              className={inputClass('whyCoreTeam')}
            />
            <ErrorText message={errors.whyCoreTeam} />
          </div>
        </div>

        {/* SECTION 8: Domain Contribution */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">08</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Domain Contribution</h3>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-750">
              How would you contribute to your selected domain ({selectedDomain}) as a Core Team member? <span className="text-red-600 font-bold">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Provide practical examples of tasks, sessions, or workflows you can handle.
            </p>
            <textarea
              name="domainContribution"
              rows={4}
              placeholder="Detail how you will execute responsibilities in your chosen domain..."
              className={inputClass('domainContribution')}
            />
            <ErrorText message={errors.domainContribution} />
          </div>
        </div>

        {/* SECTION 9: Problem-Solving / Scenario */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">09</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Problem-Solving / Scenario</h3>
              <p className="text-xs text-slate-500">Execution and crisis management scenario</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 text-xs text-slate-750">
            <p className="font-bold text-slate-900 mb-1">Scenario Question:</p>
            <p className="italic">
              &ldquo;You are responsible for an important community activity, but one or more team members are unavailable shortly before the event. What would you do to ensure the activity still runs successfully?&rdquo;
            </p>
          </div>

          <div>
            <textarea
              name="scenarioUnavailableMembers"
              rows={4}
              placeholder="Outline your immediate steps: prioritization, quick delegation, communication, backup plan..."
              className={inputClass('scenarioUnavailableMembers')}
            />
            <ErrorText message={errors.scenarioUnavailableMembers} />
          </div>
        </div>

        {/* SECTION 10: Availability & Commitment */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">10</span>
            <h3 className="text-lg font-extrabold text-brand-navy">Availability & Commitment</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                1. How many hours per week can you realistically contribute? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['1–2 hours', '3–5 hours', '6–8 hours', '9+ hours'].map((hours) => (
                  <label key={hours} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="availabilityHours" value={hours} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{hours}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.availabilityHours} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                2. Which days are you generally available? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Weekdays (Mon–Fri)', 'Weekends (Sat–Sun)', 'All Days / Flexible', 'Evenings Only'].map((dayOpt) => (
                  <label key={dayOpt} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="availableDays" value={dayOpt} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{dayOpt}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.availableDays} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                3. Are you willing to actively participate in meetings, events, planning, and execution? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Yes', 'Sometimes depending on academics', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="activeParticipation" value={opt} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.activeParticipation} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-750 mb-2">
                4. How long do you expect to remain actively involved? <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['One semester', 'One academic year', 'Multiple semesters', 'Until graduation'].map((duration) => (
                  <label key={duration} className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 cursor-pointer">
                    <input type="radio" name="involvementDuration" value={duration} className="text-aws-orange focus:ring-aws-orange" />
                    <span className="text-xs font-medium text-slate-700">{duration}</span>
                  </label>
                ))}
              </div>
              <ErrorText message={errors.involvementDuration} />
            </div>
          </div>
        </div>

        {/* SECTION 11: Professional Links & Declaration */}
        <div className="tech-card-new space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">11</span>
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Professional Links & Declaration</h3>
              <p className="text-xs text-slate-500">Provide links (GitHub is optional for non-technical domains)</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                LinkedIn Profile <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="url"
                name="linkedin"
                required
                placeholder="https://www.linkedin.com/in/your-profile"
                className={inputClass('linkedin')}
                aria-invalid={Boolean(errors.linkedin)}
              />
              <ErrorText message={errors.linkedin} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                GitHub Profile {selectedDomain !== 'Tech & Technical' && <span className="text-slate-400 font-normal">(Optional)</span>}
              </label>
              <input type="url" name="github" placeholder="https://github.com/..." className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-750">
                Portfolio / Website <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input type="url" name="portfolio" placeholder="https://..." className="form-input-field mt-1 w-full rounded-lg border border-slate-300 text-xs" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <label className="flex items-start gap-3 text-sm text-slate-750 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-aws-orange focus:ring-aws-orange"
              />
              <span className="leading-snug">
                I confirm that the information provided by me is accurate and I am committed to actively contributing as a Core Team member. <span className="text-red-600 font-bold">*</span>
              </span>
            </label>
            <ErrorText message={errors.consent} />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-8 py-3 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {submitting ? 'Submitting Application...' : 'Submit Core Team Application'}
          </button>
          <Link href={backHref} className="btn-secondary px-6 py-3 text-sm">
            Cancel
          </Link>
        </div>
      </form>
    );
  }

  // =========================================================
  // RENDER: ANCHOR & SPEAKER FORM (FROZEN / UNCHANGED DEFAULT)
  // =========================================================
  const isCareer = variant === 'career';

  return (
    <form action="/api/career-applications" method="POST" encType="multipart/form-data" className="space-y-6 font-sans" onSubmit={submit} onInvalid={showNativeError}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="opportunitySlug" value={opportunitySlug} />
      <input type="hidden" name="formType" value="anchor-speaker" />

      {formError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{formError}</div> : null}
      <p className="text-xs text-slate-500"><span className="font-bold text-red-600">*</span> Required fields</p>

      <div className="tech-card-new space-y-6 p-6">
        <div>
          <h2 className="mb-4 text-lg font-bold text-brand-navy">Personal Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Full Name <span className="text-red-600" aria-hidden="true">*</span><input name="name" required className={inputClass('name')} aria-invalid={Boolean(errors.name)} /> <ErrorText message={errors.name} /></label>
            <label className="block text-sm font-medium text-slate-700">Email <span className="text-red-600" aria-hidden="true">*</span><input type="email" name="email" required className={inputClass('email')} aria-invalid={Boolean(errors.email)} /> <ErrorText message={errors.email} /></label>
            <label className="block text-sm font-medium text-slate-700">Phone <span className="text-red-600" aria-hidden="true">*</span><input name="phone" required className={inputClass('phone')} aria-invalid={Boolean(errors.phone)} /> <ErrorText message={errors.phone} /></label>
            <label className="block text-sm font-medium text-slate-700">University <span className="text-red-600" aria-hidden="true">*</span><input name="university" required className={inputClass('university')} aria-invalid={Boolean(errors.university)} /> <ErrorText message={errors.university} /></label>
            <label className="block text-sm font-medium text-slate-700">{isCareer ? 'Program / Course' : 'Course / Program'} <span className="text-red-600" aria-hidden="true">*</span><input name="program" required className={inputClass('program')} aria-invalid={Boolean(errors.program)} /> <ErrorText message={errors.program} /></label>
            <label className="block text-sm font-medium text-slate-700">{isCareer ? 'Graduation Year' : 'Year'} <span className="text-red-600" aria-hidden="true">*</span><input name="graduationYear" required className={inputClass('graduationYear')} aria-invalid={Boolean(errors.graduationYear)} /> <ErrorText message={errors.graduationYear} /></label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Student ID <span className="text-red-600" aria-hidden="true">*</span><input name="studentId" required className={inputClass('studentId')} aria-invalid={Boolean(errors.studentId)} /> <ErrorText message={errors.studentId} /></label>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-brand-navy">Professional Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              LinkedIn Profile <span className="text-red-600 font-bold" aria-hidden="true">*</span>
              <input
                type="url"
                name="linkedin"
                placeholder="https://www.linkedin.com/in/your-profile"
                required
                className={inputClass('linkedin')}
                aria-invalid={Boolean(errors.linkedin)}
              />
              <ErrorText message={errors.linkedin} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Portfolio / Website <span className="text-slate-400 font-normal text-xs">(Optional)</span>
              <input type="url" name="portfolio" placeholder="https://..." className="form-input-field mt-1" />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Skills <span className="text-red-600" aria-hidden="true">*</span><textarea name="skills" placeholder="AWS, Python, React, Cloud Architecture..." required className={`${inputClass('skills')} min-h-24`} aria-invalid={Boolean(errors.skills)} /> <ErrorText message={errors.skills} /></label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">{isCareer ? 'Previous Experience' : 'Experience'} <span className="text-red-600" aria-hidden="true">*</span><textarea name="experience" placeholder="Describe your relevant projects, internships, or experience..." required className={`${inputClass('experience')} min-h-24`} aria-invalid={Boolean(errors.experience)} /> <ErrorText message={errors.experience} /></label>

            {/* Short Introduction Video - Google Drive Link */}
            <div className="md:col-span-2 space-y-2 pt-2">
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-4 text-xs text-slate-700 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="leading-relaxed">
                    <p className="font-semibold text-slate-900">Video Submission Guide</p>
                    <p className="mt-0.5 text-slate-600">
                      Please upload your short introduction video to Google Drive and set General Access to <strong>&lsquo;Anyone with the link&rsquo;</strong>. Then paste the sharing link here.
                    </p>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="h-4 w-4 text-aws-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Short Introduction Video – Google Drive Link</span>
                  <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                </div>
                <input
                  type="url"
                  name="introductionVideoUrl"
                  required
                  placeholder="https://drive.google.com/..."
                  className={inputClass('introductionVideoUrl')}
                  aria-invalid={Boolean(errors.introductionVideoUrl)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Paste your Google Drive link here. Please make sure the video access is set to &lsquo;Anyone with the link can view.&rsquo;
                </p>
                <ErrorText message={errors.introductionVideoUrl} />
              </label>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-brand-navy">Application</h2>
          <label className="block text-sm font-medium text-slate-700">{isCareer ? 'Why are you interested?' : 'Why do you want to join?'} <span className="text-red-600" aria-hidden="true">*</span><textarea name="motivation" required className={`${inputClass('motivation')} min-h-28`} aria-invalid={Boolean(errors.motivation)} /> <ErrorText message={errors.motivation} /></label>
          {isCareer ? <label className="mt-4 block text-sm font-medium text-slate-700">Cover Letter / Motivation<textarea name="coverLetter" className="form-input-field mt-1 min-h-28" /></label> : null}
          <label className="mt-4 block text-sm font-medium text-slate-700">{isCareer ? 'Additional Information' : 'Additional information'}<textarea name="additionalInformation" className="form-input-field mt-1 min-h-28" /></label>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" name="consent" required className="mt-1 h-4 w-4 rounded border-slate-300 text-aws-orange focus:ring-aws-orange" /><span>I confirm that the information provided is accurate and I consent to being considered for this opportunity. <span className="text-red-600" aria-hidden="true">*</span></span></label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3"><button type="submit" disabled={submitting} className="btn-primary disabled:cursor-wait disabled:opacity-70">{submitting ? 'Submitting...' : 'Submit Application'}</button><Link href={backHref} className="btn-secondary">Cancel</Link></div>
    </form>
  );
}
