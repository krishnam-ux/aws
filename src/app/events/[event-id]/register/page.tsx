'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';

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
}

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
  const [university, setUniversity] = useState('Chandigarh University');
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

  const handleInterestChange = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) errors.fullName = 'Full Name is required';
    
    if (!email.trim()) {
      errors.email = 'Email Address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      errors.phone = 'Mobile Number is required';
    } else if (!/^\+?[0-9\s\-()]{10,15}$/.test(phone)) {
      errors.phone = 'Please enter a valid phone number (10 to 15 digits)';
    }

    if (!university.trim()) errors.university = 'University name is required';
    if (!program.trim()) errors.program = 'Program or course is required';
    
    if (interests.length === 0) {
      errors.interests = 'Please select at least one technical interest';
    }

    if (!linkedin.trim()) {
      errors.linkedin = 'LinkedIn Profile URL is required';
    } else if (!/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/.test(linkedin)) {
      errors.linkedin = 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/username)';
    }

    if (!github.trim()) {
      errors.github = 'GitHub Profile URL is required';
    } else if (!/^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(github)) {
      errors.github = 'Please enter a valid GitHub profile URL (e.g., github.com/username)';
    }

    if (!motivation.trim()) {
      errors.motivation = 'Please tell us why you want to attend';
    }

    if (!consent) {
      errors.consent = 'You must consent to sharing registration details';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
          university,
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
  }

  if (successData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 font-sans text-xs">
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-md p-8 text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 border border-emerald-200">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-slate-900 text-lg uppercase tracking-wider">
              Registration Successful
            </h1>
            <div className="h-[2px] w-12 bg-aws-orange mx-auto"></div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 text-left space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Event Name</span>
              <span className="font-semibold text-slate-800 text-sm block mt-0.5">{successData.eventName}</span>
            </div>
            <div className="h-[1px] bg-slate-200/60"></div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Registration ID</span>
              <span className="font-mono font-bold text-brand-navy block mt-0.5 select-all">{successData.id}</span>
            </div>
          </div>

          <p className="text-slate-505 font-medium leading-relaxed">
            Thank you for registering.
          </p>

          <div className="pt-2">
            <Link
              href="/events"
              className="inline-block px-5 py-2 bg-aws-orange hover:bg-orange-600 text-white font-bold rounded shadow-sm transition-colors text-xs"
            >
              Back to Events
            </Link>
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
              <input
                id="university"
                name="university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="Enter university name"
                className={`w-full p-2 border rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA] ${
                  formErrors.university ? 'border-red-500 focus:ring-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {formErrors.university && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{formErrors.university}</p>}
            </div>

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
                Student ID (UID)
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter Student ID / UID (optional)"
                className="w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none focus:ring-1 focus:ring-aws-orange bg-[#F6F8FA]"
              />
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
                LinkedIn Profile URL <span className="text-red-500">*</span>
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
                GitHub Profile URL <span className="text-red-500">*</span>
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
