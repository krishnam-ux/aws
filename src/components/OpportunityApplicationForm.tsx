'use client';

import Link from 'next/link';
import { FormEvent, InvalidEvent, useState } from 'react';

type OpportunityApplicationFormProps = {
  opportunityId: string;
  opportunitySlug: string;
  opportunityTitle: string;
  backHref: string;
  variant: 'career' | 'opportunity';
};

type FieldName = 'name' | 'email' | 'phone' | 'university' | 'program' | 'graduationYear' | 'studentId' | 'resume' | 'linkedin' | 'github' | 'skills' | 'experience' | 'motivation';
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldMessages: Record<FieldName, string> = {
  name: 'Please enter your full name.',
  email: 'Please enter a valid email address.',
  phone: 'Please enter your phone number.',
  university: 'Please enter your university.',
  program: 'Please enter your course or program.',
  graduationYear: 'Please enter your year.',
  studentId: 'Please enter your student ID.',
  resume: 'Please upload your resume/CV.',
  linkedin: 'Please enter your LinkedIn profile URL.',
  github: 'Please enter your GitHub profile URL.',
  skills: 'Please enter your skills.',
  experience: 'Please enter your experience.',
  motivation: 'Please explain why you want to join.',
};

function ErrorText({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-medium text-red-600" role="alert">{message}</p> : null;
}

export default function OpportunityApplicationForm({
  opportunityId,
  opportunitySlug,
  opportunityTitle,
  backHref,
  variant,
}: OpportunityApplicationFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = (form: HTMLFormElement): FieldErrors => {
    const data = new FormData(form);
    const nextErrors: FieldErrors = {};
    const value = (name: string) => String(data.get(name) || '').trim();

    if (!value('name')) nextErrors.name = fieldMessages.name;
    if (!/^\S+@\S+\.\S+$/.test(value('email'))) nextErrors.email = fieldMessages.email;
    if (!value('phone')) nextErrors.phone = fieldMessages.phone;
    if (!value('university')) nextErrors.university = fieldMessages.university;
    if (!value('program')) nextErrors.program = fieldMessages.program;
    if (!value('graduationYear')) nextErrors.graduationYear = fieldMessages.graduationYear;
    if (!value('studentId')) nextErrors.studentId = fieldMessages.studentId;
    const resume = data.get('resume');
    if (!(resume instanceof File) || resume.size === 0) nextErrors.resume = fieldMessages.resume;
    if (!value('linkedin')) nextErrors.linkedin = fieldMessages.linkedin;
    if (!value('github')) nextErrors.github = fieldMessages.github;
    if (!value('skills')) nextErrors.skills = fieldMessages.skills;
    if (!value('experience')) nextErrors.experience = fieldMessages.experience;
    if (!value('motivation')) nextErrors.motivation = fieldMessages.motivation;
    return nextErrors;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setDuplicate(false);
    const form = event.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = form.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`) as HTMLElement | null;
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
          const data = await response.json();
          if (data.fieldErrors) setErrors(data.fieldErrors);
          if (data.error) message = data.error;
        } catch {
          // Keep a professional fallback when the response is not JSON.
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
    const field = event.target as HTMLInputElement | HTMLTextAreaElement;
    const name = field.name as FieldName;
    if (fieldMessages[name]) {
      setErrors((current) => ({ ...current, [name]: fieldMessages[name] }));
    }
  };

  if (duplicate) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
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

  const inputClass = (name: FieldName) => `form-input-field mt-1 ${errors[name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`;
  const isCareer = variant === 'career';

  return (
    <form action="/api/career-applications" method="POST" encType="multipart/form-data" className="space-y-6" onSubmit={submit} onInvalid={showNativeError}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="opportunitySlug" value={opportunitySlug} />

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
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Resume / CV Upload <span className="text-red-600" aria-hidden="true">*</span><input type="file" name="resume" accept=".pdf,.doc,.docx" required className={inputClass('resume')} aria-invalid={Boolean(errors.resume)} /> <ErrorText message={errors.resume} /></label>
            <label className="block text-sm font-medium text-slate-700">LinkedIn <span className="text-red-600" aria-hidden="true">*</span><input type="url" name="linkedin" required className={inputClass('linkedin')} aria-invalid={Boolean(errors.linkedin)} /> <ErrorText message={errors.linkedin} /></label>
            <label className="block text-sm font-medium text-slate-700">GitHub <span className="text-red-600" aria-hidden="true">*</span><input type="url" name="github" required className={inputClass('github')} aria-invalid={Boolean(errors.github)} /> <ErrorText message={errors.github} /></label>
            <label className="block text-sm font-medium text-slate-700">Portfolio / Website<input type="url" name="portfolio" className="form-input-field mt-1" /></label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">Skills <span className="text-red-600" aria-hidden="true">*</span><textarea name="skills" required className={`${inputClass('skills')} min-h-24`} aria-invalid={Boolean(errors.skills)} /> <ErrorText message={errors.skills} /></label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">{isCareer ? 'Previous Experience' : 'Experience'} <span className="text-red-600" aria-hidden="true">*</span><textarea name="experience" required className={`${inputClass('experience')} min-h-24`} aria-invalid={Boolean(errors.experience)} /> <ErrorText message={errors.experience} /></label>
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
