'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function FeedbackClient() {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [eventId, setEventId] = useState('');
  const [rating, setRating] = useState(0);
  const [experience, setExperience] = useState('Excellent');
  const [feedbackText, setFeedbackText] = useState('');
  const [liked, setLiked] = useState('');
  const [improvements, setImprovements] = useState('');
  const [recommendation, setRecommendation] = useState('Yes');

  // Interactive UI States
  const [hoverRating, setHoverRating] = useState(0);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch events list on mount
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/feedback');
        const data = await res.json();
        if (res.ok && data.success) {
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error('Failed to load events for feedback dropdown:', err);
      }
    }
    loadEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!university.trim()) {
      setErrorMsg('University / Institution is required.');
      return;
    }
    if (rating === 0) {
      setErrorMsg('Please select a star rating (1 to 5 stars).');
      return;
    }
    if (!feedbackText.trim()) {
      setErrorMsg('Feedback comments field is required.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          university: university.trim(),
          eventId: eventId || null,
          rating,
          experience,
          feedback: feedbackText.trim(),
          liked: liked.trim(),
          improvements: improvements.trim(),
          recommendation
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      setErrorMsg('A network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden p-6 sm:p-10 space-y-8 relative">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Share Your Feedback
            </h1>
            <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              Your feedback helps us improve our community events, workshops, and student experience.
            </p>
            <div className="h-1 w-20 bg-[#FF9900] mx-auto rounded-full mt-2" />
          </div>

          {submitted ? (
            /* Success Screen Overlay */
            <div className="text-center py-10 sm:py-16 space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 text-emerald-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
                  Thank you for your feedback!
                </h3>
                <p className="text-sm text-slate-500">
                  Your feedback has been submitted successfully and will help shape future activities.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setUniversity('');
                  setEventId('');
                  setRating(0);
                  setExperience('Excellent');
                  setFeedbackText('');
                  setLiked('');
                  setImprovements('');
                  setRecommendation('Yes');
                  setErrorMsg('');
                }}
                className="mt-6 inline-flex items-center px-4 py-2 border border-[#E2E8F0] hover:border-[#FF9900] rounded-md text-xs font-bold text-slate-700 hover:text-[#FF9900] bg-white transition-colors cursor-pointer"
              >
                Submit another response
              </button>
            </div>
          ) : (
            /* Feedback Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Validation Error Alert */}
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Name */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="fullName" className="text-xs font-bold text-slate-800">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3.5 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400"
                    required
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-slate-800">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Enter your university or personal email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3.5 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400"
                    required
                  />
                </div>

                {/* University */}
                <div className="flex flex-col space-y-1.5 sm:col-span-2">
                  <label htmlFor="university" className="text-xs font-bold text-slate-800">
                    University / Institution <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="university"
                    placeholder="e.g. Chandigarh University"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="px-3.5 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400"
                    required
                  />
                </div>

                {/* Event Dropdown */}
                <div className="flex flex-col space-y-1.5 sm:col-span-2">
                  <label htmlFor="event" className="text-xs font-bold text-slate-800">
                    Which event are you providing feedback for?
                  </label>
                  <select
                    id="event"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white text-slate-700"
                  >
                    <option value="">General Community Experience / Others</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Star Rating Section */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 block">
                    Rate Your Experience <span className="text-red-500">*</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Select from 1 to 5 stars</p>
                </div>
                
                <div className="flex items-center justify-center gap-1.5 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isLit = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                      >
                        <svg
                          className={`w-9 h-9 ${isLit ? 'text-[#FF9900] fill-current' : 'text-slate-300'}`}
                          fill={isLit ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499c.15-.36.634-.36.784 0l2.202 5.275 5.56.516c.394.037.551.52.26.797l-4.148 3.963 1.2 5.485c.085.39-.33.69-.691.492l-4.868-2.65-4.869 2.65c-.361.198-.776-.1-.691-.492l1.2-5.485-4.148-3.963c-.29-.277-.133-.76.26-.797l5.56-.516 2.202-5.275z"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overall Experience, Recommendation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Experience Select */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="experience" className="text-xs font-bold text-slate-800">
                    Overall Experience
                  </label>
                  <select
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white text-slate-700"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Average">Average</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                {/* Recommendation */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="recommendation" className="text-xs font-bold text-slate-800">
                    Would you recommend SBG to others?
                  </label>
                  <select
                    id="recommendation"
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white text-slate-700"
                  >
                    <option value="Yes">Yes, definitely</option>
                    <option value="Maybe">Maybe</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Textareas */}
              <div className="space-y-4">
                
                {/* Comments */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="comments" className="text-xs font-bold text-slate-800">
                    Comments / Detailed Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="comments"
                    rows={4}
                    placeholder="Tell us what you thought about the session/community..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400 resize-y"
                    required
                  />
                </div>

                {/* Liked */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="liked" className="text-xs font-bold text-slate-800">
                    What did you like about the event/activities?
                  </label>
                  <textarea
                    id="liked"
                    rows={2}
                    placeholder="e.g. Speakers, topics covered, practical hands-on building..."
                    value={liked}
                    onChange={(e) => setLiked(e.target.value)}
                    className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400 resize-y"
                  />
                </div>

                {/* Improvements */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="improvements" className="text-xs font-bold text-slate-800">
                    What can we improve?
                  </label>
                  <textarea
                    id="improvements"
                    rows={2}
                    placeholder="e.g. Venue, scheduling, depth of technical content, more lab assistants..."
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white placeholder-slate-400 resize-y"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 text-right">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded-md shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
