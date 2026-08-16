'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { validateEventRegistrationInput } from '@/lib/eventRegistrationValidation';

interface CommunityEvent {
  id: string;
  number: string;
  month: string;
  title: string;
  focus: string;
  outcome: string;
  overview: string;
  format: string;
  status?: string;
  registrationStatus?: string;
  collaborations?: string[];
  customCollabLogo?: string;
  date?: string;
  venue?: string;
}

const renderCollabLogo = (orgName: string, customLogoUrl?: string, className: string = "h-4 w-4 object-contain inline-block") => {
  if (orgName === 'GitHub') {
    return (
      <svg className={`${className} text-slate-800`} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    );
  }
  if (orgName === 'DataCamp') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect width="24" height="24" rx="4" fill="#03EF8A" />
        <path d="M6 6h6a4 4 0 014 4v4a4 4 0 01-4 4H6V6zm2 2v8h4a2 2 0 002-2v-4a2 2 0 00-2-2H8z" fill="#05234A" />
      </svg>
    );
  }
  if (orgName === 'AI/ML Club') {
    return (
      <svg className={`${className} text-[#FF9900]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  }
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt={`${orgName} Logo`}
        className={className}
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }
  return null;
};

interface RegisterPageProps {
  params: Promise<{ 'event-id': string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const resolvedParams = use(params);
  const eventId = resolvedParams['event-id'];

  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('Chandigarh University – Uttar Pradesh');
  const [customUniversity, setCustomUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('1st Year');
  const [studentId, setStudentId] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [motivation, setMotivation] = useState('');
  const [consent, setConsent] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  // Validation & Submission states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [successData, setSuccessData] = useState<{ id: string; eventName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const interestOptions = ['AWS Cloud', 'AI / ML', 'Data', 'DevOps', 'Cybersecurity', 'Generative AI', 'Other'];

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const events: CommunityEvent[] = await response.json();
          const foundEvent = events.find((e) => e.id === eventId);
          if (foundEvent) {
            setEvent(foundEvent);
            // If the registration is not open, show an error
            if (foundEvent.registrationStatus !== 'Open') {
              setEventError('Registration for this event is currently not open.');
            }
          } else {
            setEventError('Event details could not be found.');
          }
        } else {
          setEventError('Failed to retrieve event information from the server.');
        }
      } catch (err) {
        setEventError('A network error occurred while loading event details.');
      } finally {
        setLoadingEvent(false);
      }
    }

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    if (event) {
      document.title = `Register: ${event.title} | AWS Student Builder Group`;
    }
  }, [event]);

  const handleInterestChange = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const validateForm = () => {
    const result = validateEventRegistrationInput({
      fullName,
      email,
      phone,
      university,
      customUniversity,
      program,
      year,
      studentId,
      interests,
      experienceLevel,
      linkedin,
      github,
      motivation,
      consent,
    });

    setFormErrors(result.errors);
    return result.valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(formErrors)[0];
      if (firstErrorKey) {
        const element = document.getElementsByName(firstErrorKey)[0];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/event-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          fullName,
          email,
          phone,
          university: university === 'Other' ? customUniversity : university,
          program,
          year,
          studentId,
          interests,
          experienceLevel,
          linkedin,
          github,
          motivation,
          consent
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessData({ id: data.registrationId, eventName: data.eventName });
      } else {
        setSubmissionError(data.error || 'Failed to submit registration. Please try again.');
      }
    } catch (err) {
      setSubmissionError('A network error occurred. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center font-sans">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-aws-orange"></div>
        <p className="mt-4 text-xs text-slate-505">Loading event details...</p>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center font-sans">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
          <h2 className="font-display font-bold text-red-700 text-sm">Registration Blocked</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {eventError || 'We could not fetch details for this event.'}
          </p>
          <Link
            href="/events"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }  if (successData) {
    const handleCopy = () => {
      navigator.clipboard.writeText(successData.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="max-w-xl mx-auto px-4 pt-24 pb-12 sm:pt-28 sm:pb-16 font-sans text-xs">
        {/* Subtle Centered Logo Header */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <img src="/aws-logo.svg" alt="AWS Logo" className="h-6 w-auto object-contain" />
          <div className="h-5 w-[1px] bg-slate-350"></div>
          <img src="/chandigarh-university-logo.jpg" alt="Chandigarh University Logo" className="h-6 w-auto object-contain" />
        </div>

        {/* Success Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* Checked Icon & Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display font-black text-slate-900 text-lg uppercase tracking-wider">
                Registration Successful
              </h1>
              <p className="text-slate-500 font-medium text-xs leading-relaxed max-w-sm mx-auto">
                Your registration has been successfully submitted. Please keep your registration reference for future communication.
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full bg-slate-100"></div>

          {/* Registration Details Grid */}
          <div className="space-y-4">
            <h3 className="font-display font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">
              Registration Details
            </h3>
            
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 space-y-3">
              {/* Event Name */}
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Event Name</span>
                <span className="font-bold text-slate-900 text-xs block mt-0.5 leading-snug">{successData.eventName}</span>
              </div>
              
              <div className="h-[1px] bg-slate-200/60"></div>

              {/* Registration Reference / ID with copy button */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Registration Reference</span>
                  <span className="font-mono font-extrabold text-brand-navy block mt-0.5 text-xs tracking-wide select-all">{successData.id}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded text-[9px] font-bold text-slate-600 transition-colors shadow-sm cursor-pointer select-none"
                  title="Copy Registration ID"
                >
                  {copied ? (
                    <>
                      <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="h-[1px] bg-slate-200/60"></div>

              {/* Grid for Status, Date & Venue */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Status</span>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-emerald-50 border border-emerald-250 text-emerald-700">
                      Confirmed
                    </span>
                  </div>
                </div>
                
                {event.date && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Event Date</span>
                    <span className="font-semibold text-slate-700 block mt-0.5">{event.date}</span>
                  </div>
                )}
                
                {event.venue && (
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Event Venue</span>
                    <span className="font-semibold text-slate-700 block mt-0.5 leading-snug">{event.venue}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attendee Details */}
          {(fullName || email) && (
            <div className="space-y-3">
              <h3 className="font-display font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">
                Attendee Details
              </h3>
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {fullName && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Name</span>
                    <span className="font-semibold text-slate-700 block mt-0.5">{fullName}</span>
                  </div>
                )}
                {email && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Email Address</span>
                    <span className="font-semibold text-slate-700 block mt-0.5 break-all">{email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collaboration Section */}
          {event.collaborations && event.collaborations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">
                In Collaboration With
              </h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {event.collaborations.map((org, index) => {
                  const isPre = ['GitHub', 'DataCamp', 'AI/ML Club'].includes(org);
                  const logo = renderCollabLogo(org, isPre ? undefined : event.customCollabLogo, "h-4.5 w-4.5 object-contain inline-block mr-1.5 flex-shrink-0");
                  return (
                    <span
                      key={index}
                      className="bg-brand-navy/5 text-brand-navy border border-brand-navy/10 px-2.5 py-1 rounded text-[9px] font-bold tracking-wide uppercase inline-flex items-center"
                    >
                      {logo}
                      <span>{org}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-[1px] w-full bg-slate-100"></div>

          {/* Buttons & Footer */}
          <div className="space-y-4 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/events"
                className="w-full sm:w-auto px-6 py-2 bg-aws-orange hover:bg-orange-600 text-white font-bold rounded shadow-md transition-colors text-xs text-center cursor-pointer select-none"
              >
                View Event
              </Link>
              <Link
                href="/events"
                className="w-full sm:w-auto px-6 py-2 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 font-bold rounded shadow-sm transition-colors text-xs text-center cursor-pointer select-none"
              >
                Back to Events
              </Link>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Thank you for registering with AWS Student Builder Group.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 font-sans text-xs">
      <div className="space-y-6">
        {/* Breadcrumb / Back Link */}
        <Link href="/events" className="inline-flex items-center text-[#64748B] hover:text-aws-orange font-semibold transition-colors">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>

        {/* Header Block */}
        <div className="border-b border-[#E2E8F0] pb-6 space-y-2">
          <span className="text-[10px] font-bold text-aws-orange uppercase tracking-widest block font-display">
            Event Registration
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-navy tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-slate-505 text-xs leading-relaxed max-w-2xl font-medium pt-1">
            {event.overview}
          </p>
          {event.collaborations && event.collaborations.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md text-brand-navy font-semibold text-[11px] leading-relaxed">
              This event is organized in collaboration with:
              <div className="flex flex-wrap gap-2 mt-2.5">
                {event.collaborations.map((org, index) => {
                  const isPre = ['GitHub', 'DataCamp', 'AI/ML Club'].includes(org);
                  const logo = renderCollabLogo(org, isPre ? undefined : event.customCollabLogo, "h-4.5 w-4.5 object-contain inline-block mr-1.5 flex-shrink-0");
                  return (
                    <span
                      key={index}
                      className="bg-white border border-blue-200/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-800 inline-flex items-center"
                    >
                      {logo}
                      <span>{org}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {submissionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md font-semibold text-xs">
            {submissionError}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.fullName && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.fullName}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student.name@university.edu"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.email && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.email}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.phone && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.phone}</p>}
            </div>

            {/* University */}
            <div className="space-y-1.5">
              <label htmlFor="university" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                University <span className="text-red-500">*</span>
              </label>
              <select
                id="university"
                name="university"
                value={university}
                onChange={(e) => {
                  setUniversity(e.target.value);
                  if (e.target.value !== 'Other') {
                    setCustomUniversity('');
                  }
                }}
                className={`w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-white ${
                  formErrors.university ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              >
                <option value="Chandigarh University – Uttar Pradesh">Chandigarh University – Uttar Pradesh</option>
                <option value="Other">Other</option>
              </select>
              {formErrors.university && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.university}</p>}
            </div>

            {/* Specify Custom University */}
            {university === 'Other' && (
              <div className="space-y-1.5">
                <label htmlFor="customUniversity" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Please specify your university <span className="text-red-500">*</span>
                </label>
                <input
                  id="customUniversity"
                  name="customUniversity"
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Enter your university name"
                  className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                    formErrors.customUniversity ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                  }`}
                />
                {formErrors.customUniversity && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.customUniversity}</p>}
              </div>
            )}

            {/* Program / Course */}
            <div className="space-y-1.5">
              <label htmlFor="program" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Program / Course <span className="text-red-500">*</span>
              </label>
              <input
                id="program"
                name="program"
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="B.Tech Computer Science / BCA"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.program ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.program && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.program}</p>}
            </div>

            {/* Year of Study */}
            <div className="space-y-1.5">
              <label htmlFor="year" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Year of Study <span className="text-red-500">*</span>
              </label>
              <select
                id="year"
                name="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>

            {/* Student ID */}
            <div className="space-y-1.5">
              <label htmlFor="studentId" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Student ID / UID <span className="text-red-500">*</span>
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter Student ID / UID"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.studentId ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.studentId && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.studentId}</p>}
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <label htmlFor="experienceLevel" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Experience Level <span className="text-red-500">*</span>
              </label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-white"
              >
                <option value="Beginner">Beginner (No prior cloud experience)</option>
                <option value="Intermediate">Intermediate (Used AWS or other clouds basic services)</option>
                <option value="Advanced">Advanced (Built serverless apps, holds certifications)</option>
              </select>
            </div>

            {/* LinkedIn Profile URL */}
            <div className="space-y-1.5">
              <label htmlFor="linkedin" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                LinkedIn Profile URL
              </label>
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.linkedin ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.linkedin && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.linkedin}</p>}
            </div>

            {/* GitHub Profile URL */}
            <div className="space-y-1.5">
              <label htmlFor="github" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                GitHub Profile URL
              </label>
              <input
                id="github"
                name="github"
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.github ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.github && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.github}</p>}
            </div>
          </div>

          {/* Technical Interests */}
          <div className="space-y-2">
            <span className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Technical Interests <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F6F8FA] p-4 rounded-md border border-[#E2E8F0]">
              {interestOptions.map((opt) => (
                <label key={opt} className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={interests.includes(opt)}
                    onChange={() => handleInterestChange(opt)}
                    className="h-3.5 w-3.5 border-slate-300 rounded text-aws-orange focus:ring-aws-orange accent-aws-orange cursor-pointer"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {formErrors.interests && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.interests}</p>}
          </div>

          {/* Motivation */}
          <div className="space-y-1.5">
            <label htmlFor="motivation" className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Why do you want to attend? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivation"
              name="motivation"
              rows={4}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Tell us about your learning goals and why you want to attend this event..."
              className={`w-full p-2.5 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] leading-relaxed ${
                formErrors.motivation ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {formErrors.motivation && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.motivation}</p>}
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-2">
            <label className="flex items-start space-x-2.5 text-slate-600 font-medium cursor-pointer select-none">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-3.5 w-3.5 mt-0.5 border-slate-300 rounded text-aws-orange focus:ring-aws-orange accent-aws-orange cursor-pointer"
              />
              <span className="leading-relaxed">
                I hereby declare that all information provided above is correct. I consent to sharing this registration with the local AWS SBG community core team and local university operations lead. <span className="text-red-500">*</span>
              </span>
            </label>
            {formErrors.consent && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.consent}</p>}
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-aws-orange hover:bg-orange-600 text-white font-bold rounded shadow-md transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Submitting Registration...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
