'use client';

import { useState, useEffect } from 'react';
import { CONTEST_CONFIG, maskEmail } from '@/lib/contestConfig';

interface RegisteredParticipant {
  id?: string;
  name: string;
  email: string;
  maskedEmail: string;
  university?: string;
  appUrl: string;
  qrCodeUrl: string;
  emailSent?: boolean;
}

export default function HowToJoinSection() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredData, setRegisteredData] = useState<RegisteredParticipant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Resend Email State
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Contest server status
  const [contestStatus, setContestStatus] = useState<'LOCKED' | 'LIVE' | 'ENDED'>('LOCKED');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    university: 'Chandigarh University – Uttar Pradesh',
    studentId: '',
    consent: false
  });

  useEffect(() => {
    // Check local storage for previous registration
    try {
      const saved = localStorage.getItem('aws_card_clash_pass');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          setIsRegistered(true);
          setRegisteredData({
            ...parsed,
            maskedEmail: parsed.maskedEmail || maskEmail(parsed.email)
          });
        }
      }
    } catch (e) {
      // LocalStorage access non-blocking
    }

    // Check contest status from server
    const checkStatus = () => {
      fetch('/api/contest/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.status) {
            setContestStatus(data.status);
          }
        })
        .catch((err) => console.error('Error fetching contest status:', err));
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Cooldown timer for resend email button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMessage('Please provide your full name (minimum 2 characters).');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address to receive your event code.');
      return;
    }

    if (!formData.consent) {
      setErrorMessage('Please agree to the contest participation guidelines to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Registration could not be completed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const participant: RegisteredParticipant = {
        id: data.registration?.id,
        name: data.registration?.name || formData.name,
        email: data.registration?.email || formData.email,
        maskedEmail: data.registration?.maskedEmail || maskEmail(formData.email),
        university: data.registration?.university || formData.university,
        appUrl: data.registration?.appUrl || CONTEST_CONFIG.officialAppDownloadUrl,
        qrCodeUrl: data.registration?.qrCodeUrl || CONTEST_CONFIG.qrCodeAssetPath,
        emailSent: data.emailSent
      };

      setIsRegistered(true);
      setRegisteredData(participant);
      setResendCooldown(60); // 60s cooldown for resend

      try {
        localStorage.setItem('aws_card_clash_pass', JSON.stringify(participant));
      } catch (e) {
        // Non-blocking
      }
    } catch (err: any) {
      setErrorMessage('Network error during registration. Please verify your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!registeredData?.email || isResending || resendCooldown > 0) return;

    setIsResending(true);
    setResendStatus(null);

    try {
      const res = await fetch('/api/contest/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredData.email })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResendStatus({
          success: true,
          message: 'Event code email resent successfully! Please check your inbox and spam folder.'
        });
        setResendCooldown(60);
      } else {
        setResendStatus({
          success: false,
          message: data.error || 'Failed to resend confirmation email. Please try again shortly.'
        });
      }
    } catch (e: any) {
      setResendStatus({
        success: false,
        message: 'Network error. Please try again in a few moments.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const steps = [
    {
      num: 1,
      text: 'Scan the QR code to get AWS Card Clash for iOS or Android.'
    },
    {
      num: 2,
      text: "Open the app and sign in with your AWS Skill Builder account. If you don't have one, you can create one for free."
    },
    {
      num: 3,
      text: 'Choose a nickname. Other players see it on the leaderboard.'
    },
    {
      num: 4,
      text: 'Choose Multiplayer, and then choose Check contests.'
    },
    {
      num: 5,
      text: 'Enter the event code you received in your email, and then choose Join.'
    },
    {
      num: 6,
      text: 'Play the Security Island levels and watch your rank on the leaderboard.'
    }
  ];

  return (
    <section id="how-to-join" className="relative py-24 bg-[#0B0908] border-b border-[#211713] overflow-hidden">
      
      {/* Background warm radial light */}
      <div 
        className="pointer-events-none absolute right-1/4 bottom-10 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px]" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="max-w-2xl space-y-3 mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
            HOW TO JOIN
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F8F2EA] tracking-tight font-display">
            Join the contest from your phone
          </h2>
          <p className="text-base sm:text-lg text-[#B9AAA0]">
            Complete all 6 steps directly from your mobile device or desktop browser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left: Numbered Instruction Steps 1-6 */}
          <div className="lg:col-span-7 flex flex-col space-y-3.5">
            {steps.map((s) => (
              <div
                key={s.num}
                className="flex items-center space-x-4 p-4 sm:p-4.5 rounded-2xl bg-[#211713]/80 border border-[#3A271E] hover:border-[#F5C451]/50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {/* Gold Circle Number */}
                <div className="w-8 h-8 rounded-full bg-[#F5C451] text-[#0B0908] font-mono font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_#F5C451]">
                  {s.num}
                </div>

                {/* Step Text */}
                <p className="text-xs sm:text-sm font-medium text-[#F8F2EA] leading-relaxed">
                  {s.text}
                </p>
              </div>
            ))}

            {/* Desktop Alternative Note - Only shown at 9:00 AM IST when contest is LIVE */}
            {contestStatus === 'LIVE' && (
              <div className="pt-4 text-xs sm:text-sm text-[#B9AAA0] pl-2 animate-in fade-in duration-300">
                On a computer?{' '}
                <a
                  href={CONTEST_CONFIG.webPlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5C451] underline hover:text-[#ffcf66] font-semibold transition-colors"
                >
                  Play at cardclash.skillbuilder.aws
                </a>{' '}
                with the same account and your emailed event code.
              </div>
            )}
          </div>

          {/* Right: Registration Form OR Success Screen OR Locked Countdown */}
          <div className="lg:col-span-5 sticky top-24">
            
            {/* VIEW A: REGISTRATION SUCCESS SCREEN */}
            {isRegistered && registeredData ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#211713] to-[#140E0B] border-2 border-[#F5C451]/60 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                
                {/* Gold glowing top ribbon */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#F5C451] via-[#E98B32] to-[#F5C451]" />

                {/* Success Icon */}
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* EXACT MANDATED SUCCESS MESSAGE */}
                <h3 className="text-base sm:text-lg font-bold text-[#F8F2EA] leading-snug mb-3">
                  Your registration is successful! Your event code has been sent to your registered email address. Please check your inbox and spam folder.
                </h3>

                {/* Masked Email Badge */}
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#0B0908] border border-[#3A271E] text-xs text-[#F5C451] mb-5 font-mono shadow-inner">
                  <svg className="w-4 h-4 text-[#F5C451]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Sent to: <strong className="text-[#F8F2EA]">{registeredData.maskedEmail}</strong></span>
                </div>

                {/* Email Delivery Warning if delivery was flagged */}
                {registeredData.emailSent === false && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-200 text-xs text-left">
                    <strong className="font-semibold block mb-0.5">Delivery Notice:</strong>
                    Initial delivery encountered an automatic queue delay. Please click the resend button below to re-dispatch your event code.
                  </div>
                )}

                {/* Resend Status Feedback */}
                {resendStatus && (
                  <div
                    className={`w-full mb-4 p-3 rounded-xl text-xs text-left animate-in fade-in ${
                      resendStatus.success
                        ? 'bg-emerald-950/60 border border-emerald-600/60 text-emerald-200'
                        : 'bg-red-950/60 border border-red-800 text-red-200'
                    }`}
                  >
                    {resendStatus.message}
                  </div>
                )}

                {/* Resend Button with Cooldown */}
                <div className="w-full mb-6">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResending || resendCooldown > 0}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#F8F2EA] bg-[#211713] hover:bg-[#2D1F1A] border border-[#4A2D19] hover:border-[#F5C451]/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {isResending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-[#F5C451]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Resending event code email...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend available in {resendCooldown}s</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#F5C451]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Resend Confirmation Email</span>
                      </>
                    )}
                  </button>
                </div>

                {/* QR Code Container (Displayed ONLY after successful registration) */}
                <div className="w-full pt-4 border-t border-[#3A271E] flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C451] mb-3">
                    SCAN TO GET THE APP
                  </span>

                  <div className="w-48 h-48 sm:w-52 sm:h-52 bg-white p-3.5 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] mb-3 group hover:scale-[1.02] transition-transform duration-300 flex items-center justify-center">
                    <img
                      src={CONTEST_CONFIG.qrCodeAssetPath}
                      alt="Verified QR Code for AWS Card Clash download"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Verified download URL */}
                  <a
                    href={CONTEST_CONFIG.officialAppDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#F5C451] underline hover:text-[#ffcf66] transition-colors"
                  >
                    cardclash.skillbuilder.aws/get
                  </a>
                  <p className="text-[11px] text-[#B9AAA0] mt-1 mb-4">
                    Opens the App Store or Google Play depending on your phone.
                  </p>

                  {/* Store Buttons */}
                  <div className="flex items-center space-x-3 mb-5">
                    <a
                      href={CONTEST_CONFIG.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B0908] border border-[#3A271E] hover:border-[#F5C451]/60 text-white text-xs font-medium transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.93-1 .04-2.16.67-2.83 1.45-.58.67-1.09 1.76-.95 2.81 1.11.09 2.2-.56 2.84-1.33z"/>
                      </svg>
                      <span>App Store</span>
                    </a>

                    <a
                      href={CONTEST_CONFIG.googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-[#0B0908] border border-[#3A271E] hover:border-[#F5C451]/60 text-white text-xs font-medium transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a1.98 1.98 0 01-.61-.92L3 2.735a2 2 0 01.609-.921zm11.233 11.234l2.128 2.128-11.758 6.786 9.63-8.914zm2.835-1.048l2.673 1.543c.895.517.895 1.36 0 1.877l-2.673 1.543-2.37-2.37 2.37-2.593zm-2.835-1.048L5.212 2.038l11.758 6.786-2.128 2.128z"/>
                      </svg>
                      <span>Google Play</span>
                    </a>
                  </div>

                  {/* Joining instructions reminder */}
                  <div className="p-3 rounded-xl bg-[#0B0908]/80 border border-[#3A271E] w-full text-left">
                    <p className="text-[11px] text-[#B9AAA0] leading-relaxed">
                      💡 <strong className="text-[#F8F2EA]">How to use your code:</strong> Open AWS Card Clash, tap <span className="text-[#F5C451]">Multiplayer</span> → <span className="text-[#F5C451]">Check contests</span>, and enter the event code received in your email.
                    </p>
                  </div>

                  {/* Register another participant */}
                  <button
                    type="button"
                    onClick={() => setIsRegistered(false)}
                    className="mt-4 text-[11px] text-[#B9AAA0] hover:text-[#F5C451] underline transition-colors"
                  >
                    Register another student
                  </button>
                </div>

              </div>
            ) : contestStatus === 'LOCKED' ? (

              /* VIEW B: COMING SOON / REGISTRATION LOCKED (Before 24 Nov 9 AM IST) */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#211713] to-[#140E0B] border-2 border-[#E98B32]/40 shadow-2xl flex flex-col text-center relative overflow-hidden">
                
                {/* Golden Lock Visual */}
                <div className="w-14 h-14 mx-auto rounded-full bg-[#E98B32]/15 border border-[#E98B32]/40 flex items-center justify-center text-[#F5C451] mb-4 shadow-[0_0_20px_rgba(233,139,50,0.25)]">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                {/* Status Tag */}
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5C451] mb-2 block">
                  REGISTRATION OPENS SOON
                </span>

                <h3 className="text-2xl font-bold text-[#F8F2EA] mb-3 font-display">
                  Opens 24 November, 9:00 AM IST
                </h3>

                <p className="text-xs text-[#B9AAA0] mb-6 leading-relaxed">
                  Contest registration unlocks automatically on <strong>24 November 2026 at 9:00 AM IST</strong>. When the clock strikes 9:00 AM, this form will open for student registrations.
                </p>

                {/* Instant Entry Notice */}
                <div className="p-4 rounded-2xl bg-[#0B0908] border border-[#3A271E] text-left mb-6 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#F5C451]">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Instant Entry Upon Registration</span>
                  </div>
                  <p className="text-[11px] text-[#B9AAA0] leading-snug">
                    No second approval or manual waiting period is required. Once registered, your official Event Code will be immediately dispatched to your email and the download QR will unlock.
                  </p>
                </div>

                {/* Server-Side Lock Status */}
                <div className="pt-3 border-t border-[#3A271E] flex items-center justify-between text-[10px] text-[#B9AAA0]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E98B32] animate-pulse"></span>
                    <span>Server-authoritative launch</span>
                  </span>
                  <span>Asia/Kolkata (IST)</span>
                </div>

              </div>
            ) : contestStatus === 'ENDED' ? (

              /* VIEW D: CONTEST COMPLETED / REGISTRATION CLOSED */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#211713] to-[#140E0B] border-2 border-[#F5C451]/50 shadow-2xl flex flex-col text-center relative overflow-hidden">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#F5C451]/15 border border-[#F5C451]/40 flex items-center justify-center text-[#F5C451] text-2xl mb-4 shadow-[0_0_20px_rgba(245,196,81,0.25)]">
                  🏆
                </div>

                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5C451] mb-2 block">
                  CONTEST COMPLETED
                </span>

                <h3 className="text-2xl font-bold text-[#F8F2EA] mb-3 font-display">
                  Registration & Gameplay Closed
                </h3>

                <p className="text-xs text-[#B9AAA0] mb-6 leading-relaxed">
                  The AWS Card Clash Security Island Contest concluded on <strong>4 December 2026</strong>. Registrations, gameplay, and event codes are no longer active.
                </p>

                <div className="p-4 rounded-2xl bg-[#0B0908] border border-[#3A271E] text-left mb-4 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#F5C451]">
                    <span>🛡️</span>
                    <span>Top 5 Verification in Progress</span>
                  </div>
                  <p className="text-[11px] text-[#B9AAA0] leading-snug">
                    Scores and challenge logs are currently undergoing audit. Confirmed winners will receive AWS Certified AI Practitioner exam vouchers directly via email.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#3A271E] flex items-center justify-between text-[10px] text-[#B9AAA0]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Concluded 4 Dec 2026</span>
                  </span>
                  <span>Asia/Kolkata (IST)</span>
                </div>
              </div>
            ) : (

              /* VIEW C: ACTIVE REGISTRATION FORM (When Live) */
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#211713] to-[#140E0B] border-2 border-[#4A2D19] shadow-2xl flex flex-col text-left relative overflow-hidden">
                
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C451]">
                    PARTICIPANT REGISTRATION
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Registration Open
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-[#F8F2EA] mb-2 font-display">
                  Unlock Contest Access
                </h3>
                <p className="text-xs text-[#B9AAA0] mb-6 leading-relaxed">
                  Enter your details to receive your official Event Code by email and access the verified app download.
                </p>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs animate-in fade-in">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#F8F2EA] mb-1.5">
                      Full Name <span className="text-[#F5C451]">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g., Alex Johnson"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0908] border border-[#3A271E] focus:border-[#F5C451] focus:ring-1 focus:ring-[#F5C451] text-xs sm:text-sm text-[#F8F2EA] placeholder-[#66554B] transition-colors outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[#F8F2EA] mb-1.5">
                      Email Address <span className="text-[#F5C451]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="e.g., student@cuchd.in"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0908] border border-[#3A271E] focus:border-[#F5C451] focus:ring-1 focus:ring-[#F5C451] text-xs sm:text-sm text-[#F8F2EA] placeholder-[#66554B] transition-colors outline-none"
                    />
                    <span className="text-[10px] text-[#B9AAA0] mt-1 block">
                      Your event code will be delivered exclusively to this address.
                    </span>
                  </div>

                  {/* University */}
                  <div>
                    <label className="block text-xs font-semibold text-[#F8F2EA] mb-1.5">
                      University / College
                    </label>
                    <input
                      type="text"
                      name="university"
                      value={formData.university}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0908] border border-[#3A271E] focus:border-[#F5C451] focus:ring-1 focus:ring-[#F5C451] text-xs sm:text-sm text-[#F8F2EA] placeholder-[#66554B] transition-colors outline-none"
                    />
                  </div>

                  {/* Student ID (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#F8F2EA] mb-1.5">
                      Student ID / Roll No. <span className="text-[10px] text-[#B9AAA0] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      placeholder="e.g., 22BCS10892"
                      value={formData.studentId}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0908] border border-[#3A271E] focus:border-[#F5C451] focus:ring-1 focus:ring-[#F5C451] text-xs sm:text-sm text-[#F8F2EA] placeholder-[#66554B] transition-colors outline-none"
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleInputChange}
                        required
                        className="mt-0.5 rounded border-[#3A271E] bg-[#0B0908] text-[#F5C451] focus:ring-[#F5C451] focus:ring-offset-0"
                      />
                      <span className="text-[11px] text-[#B9AAA0] leading-snug">
                        I agree to participate in the Security Island contest under official AWS Student Builder Group community guidelines.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-[#0B0908] bg-[#F5C451] hover:bg-[#ffcf66] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_15px_rgba(245,196,81,0.3)] hover:shadow-[0_0_25px_rgba(245,196,81,0.5)] active:scale-[0.98] flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0B0908]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Registering Access...</span>
                        </>
                      ) : (
                        <span>Register & Receive Event Code</span>
                      )}
                    </button>
                  </div>

                </form>

                {/* Privacy and Security Notice */}
                <div className="mt-5 pt-4 border-t border-[#3A271E] flex items-center justify-between text-[10px] text-[#B9AAA0]">
                  <span className="flex items-center space-x-1">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Private Email Delivery</span>
                  </span>
                  <span>SSL Encrypted</span>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
