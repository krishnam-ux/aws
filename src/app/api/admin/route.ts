import { NextResponse } from 'next/server';
import { siteConfig } from '@/data/siteConfig';
import { db, hashPassword, generateSalt } from '@/lib/db';
import {
  ATTENDANCE_OPTIONS,
  createCertificateRecord,
  generateCertificateId,
  generateCertificatePdfBuffer,
  getCertificateFileName,
  isCertificateEligible,
  normalizeAttendanceStatus
} from '@/lib/certificates';

export const dynamic = 'force-dynamic';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';
const ALLOWED_EVENT_STATUSES = ['Draft', 'Planned', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Unpublished'];
const ALLOWED_REGISTRATION_STATUSES = ['Open', 'Not Open', 'Closed', 'Full'];

function mergeEventUpdate(existingEvent: any, incomingEvent: any): any {
  const merged: Record<string, any> = { ...(existingEvent || {}) };
  for (const [key, value] of Object.entries(incomingEvent || {})) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function normalizeEventPayload(event: any): any {
  if (!event || typeof event !== 'object') {
    throw new Error('Event payload is required.');
  }

  const merged = mergeEventUpdate({}, event);
  const safeTitle = String(merged.title ?? '').trim();
  if (!safeTitle) {
    throw new Error('Title cannot be empty.');
  }

  const normalizedDate = String(merged.date ?? '').trim();
  if (!normalizedDate || Number.isNaN(new Date(normalizedDate).getTime())) {
    throw new Error('Date must be valid.');
  }

  const normalizedVenue = String(merged.venue ?? '').trim();
  if (!normalizedVenue) {
    throw new Error('Venue should not be empty.');
  }

  const status = String(merged.status ?? 'Draft');
  if (!ALLOWED_EVENT_STATUSES.includes(status)) {
    throw new Error('Event status is invalid.');
  }

  const registrationStatus = String(merged.registrationStatus ?? 'Not Open');
  if (!ALLOWED_REGISTRATION_STATUSES.includes(registrationStatus)) {
    throw new Error('Registration status is invalid.');
  }

  const whatYouWillLearn = Array.isArray(event.whatYouWillLearn)
    ? event.whatYouWillLearn
        .map((item: any) => String(item ?? '').trim())
        .filter(Boolean)
    : typeof event.whatYouWillLearn === 'string'
      ? event.whatYouWillLearn
          .split(/\n|\r\n|;/)
          .map((item: string) => item.trim())
          .filter(Boolean)
      : [];

  const collaborations = Array.isArray(event.collaborations)
    ? event.collaborations.filter((item: any) => item !== null && item !== undefined && String(item).trim() !== '')
    : [];

  return {
    ...event,
    id: String(event.id).trim(),
    title: safeTitle,
    description: String(event.description ?? event.overview ?? '').trim(),
    overview: String(event.overview ?? event.description ?? '').trim(),
    date: normalizedDate,
    time: String(event.time ?? '').trim(),
    endTime: String(event.endTime ?? '').trim(),
    venue: normalizedVenue,
    fullVenueAddress: String(event.fullVenueAddress ?? '').trim(),
    city: String(event.city ?? '').trim(),
    status,
    registrationStatus,
    focus: String(event.focus ?? '').trim(),
    outcome: String(event.outcome ?? '').trim(),
    aboutTheEvent: String(event.aboutTheEvent ?? event.description ?? '').trim(),
    requirements: String(event.requirements ?? '').trim(),
    additionalInfo: String(event.additionalInfo ?? '').trim(),
    whatYouWillLearn,
    collaborations,
    maxRegistrations: event.maxRegistrations !== undefined && event.maxRegistrations !== null && event.maxRegistrations !== ''
      ? Number(event.maxRegistrations)
      : undefined,
    eventFormat: String(event.eventFormat ?? event.format ?? '').trim(),
    format: String(event.format ?? event.eventFormat ?? '').trim(),
    collaborationName: String(event.collaborationName ?? event.customCollab ?? '').trim(),
    collaborationDescription: String(event.collaborationDescription ?? '').trim(),
    collaborationWebsite: String(event.collaborationWebsite ?? '').trim(),
    customCollab: String(event.customCollab ?? event.collaborationName ?? '').trim(),
    customCollabLogo: String(event.customCollabLogo ?? '').trim(),
    collaborationLogo: String(event.collaborationLogo ?? event.customCollabLogo ?? '').trim(),
    registrationDeadline: String(event.registrationDeadline ?? '').trim(),
    image: String(event.image ?? '').trim()
  };
}

// Helper to verify admin auth token
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === SECURE_TOKEN;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. PUBLIC: Auth Login Action
    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
      }

      const admins = await db.admins.getAll();
      const admin = admins.find(a => a.username === username);

      if (!admin) {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }

      const inputHash = hashPassword(password, admin.salt);
      if (inputHash === admin.passwordHash) {
        return NextResponse.json({ success: true, token: SECURE_TOKEN });
      } else {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }
    }

    // --- SECURE AREA: Verify Token ---
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 401 });
    }

    // Logo Upload handler
    if (action === 'upload-logo') {
      const { base64Data } = body;
      if (!base64Data) {
        return NextResponse.json({ error: 'Missing base64 data.' }, { status: 400 });
      }
      
      const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: 'Invalid file format.' }, { status: 400 });
      }
      
      const mimeType = matches[1];
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'].includes(mimeType)) {
        return NextResponse.json({ error: 'Invalid image format. Allowed formats: PNG, JPG, JPEG, SVG, GIF.' }, { status: 400 });
      }
      
      const approxBytes = Math.round((base64Data.length * 3) / 4);
      if (approxBytes > 500 * 1024) {
        return NextResponse.json({ error: 'File too large. Maximum size allowed: 500KB.' }, { status: 400 });
      }
      
      const id = `logo-${Date.now()}`;
      const logosMap = await db.logos.getMap();
      logosMap[id] = base64Data;
      await db.logos.saveMap(logosMap);
      
      return NextResponse.json({ success: true, url: `/api/collaboration-logos?id=${id}` });
    }

    // 2. Dashboard Stats
    if (action === 'get-stats') {
      const registrations = await db.registrations.getAll(); // join community
      const eventRegistrations = await db.eventRegistrations.getAll(); // event registrations
      const events = await db.events.getAll();
      const verifications = await db.verificationRequests.getAll();
      const announcements = await db.announcements.getAll();
      const resources = await db.resources.getAll();
      const collaborations = await db.collaborationRequests.getAll();
      const contactMessages = await db.contactMessages.getAll();

      const counts = {
        registrations: eventRegistrations.length, // total event registrations
        joinCommunity: registrations.length,
        events: events.filter(e => e.status !== 'Draft' && e.status !== 'Unpublished').length,
        upcomingEvents: events.filter(e => e.status === 'Planned' || e.status === 'Upcoming').length,
        openRegistrations: events.filter(e => e.registrationStatus === 'Open' && e.status !== 'Draft' && e.status !== 'Unpublished').length,
        pendingRegistrations: eventRegistrations.filter(r => r.status === 'New').length,
        verifications: verifications.filter(v => v.status === 'New').length,
        announcements: announcements.length,
        resources: resources.length,
        collaborations: collaborations.filter(c => c.status === 'New').length,
        contactMessages: contactMessages.filter(m => m.status === 'NEW').length
      };

      const recentRegistrations = [...eventRegistrations]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const recentVerifications = [...verifications]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const recentContactMessages = [...contactMessages]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const upcomingEvents = events
        .filter(e => e.status !== 'Draft' && e.status !== 'Unpublished')
        .slice(0, 6);

      return NextResponse.json({ counts, recentRegistrations, recentVerifications, upcomingEvents, recentContactMessages });
    }

    // 3. Registrations Management (Join Community)
    if (action === 'get-registrations') {
      return NextResponse.json(await db.registrations.getAll());
    }
    if (action === 'update-registration') {
      const { id, status, notes } = body;
      const registrations = await db.registrations.getAll();
      const idx = registrations.findIndex(r => r.id === id);
      if (idx !== -1) {
        registrations[idx].status = status || registrations[idx].status;
        registrations[idx].notes = notes !== undefined ? notes : registrations[idx].notes;
        await db.registrations.saveAll(registrations);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    if (action === 'delete-registration') {
      const { id } = body;
      let registrations = await db.registrations.getAll();
      registrations = registrations.filter(r => r.id !== id);
      await db.registrations.saveAll(registrations);
      return NextResponse.json({ success: true });
    }

    // 3b. Event Registrations Management
    if (action === 'get-event-registrations') {
      return NextResponse.json(await db.eventRegistrations.getAll());
    }
    if (action === 'update-event-registration') {
      const { id, status, notes } = body;
      try {
        await db.eventRegistrations.updateOne(id, { status, notes });
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
    if (action === 'delete-event-registration') {
      const { id } = body;
      if (!id || typeof id !== 'string' || !id.trim()) {
        return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
      }

      try {
        const registrations = await db.eventRegistrations.getAll();
        const registration = registrations.find((entry: any) => entry.id === id);
        if (!registration) {
          return NextResponse.json({ error: 'Registration not found or already deleted.' }, { status: 404 });
        }

        await db.eventRegistrations.deleteOne(id);
        const remaining = await db.eventRegistrations.getAll();
        if (remaining.some((entry: any) => entry.id === id)) {
          return NextResponse.json({
            error: 'Delete did not remove the row from the backing storage. The production record still exists.',
            deletedId: id
          }, { status: 409 });
        }

        return NextResponse.json({ success: true, deletedId: id, deletedName: registration.name || 'Student' });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete registration.' }, { status: 500 });
      }
    }
    if (action === 'delete-event-registrations-bulk') {
      const { ids } = body;
      if (!Array.isArray(ids)) {
        return NextResponse.json({ error: 'Parameter ids must be an array.' }, { status: 400 });
      }
      try {
        await db.eventRegistrations.deleteBulk(ids);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
    if (action === 'delete-event-registrations-all') {
      const { eventId } = body;
      if (!eventId) {
        return NextResponse.json({ error: 'Missing parameter: eventId.' }, { status: 400 });
      }
      try {
        await db.eventRegistrations.deleteByEventId(eventId);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
    if (action === 'set-attendance') {
      const { id, attendance } = body;
      if (!id || !ATTENDANCE_OPTIONS.includes(attendance)) {
        return NextResponse.json({ error: 'Valid registration ID and attendance status are required.' }, { status: 400 });
      }
      await db.eventRegistrations.updateOne(id, { attendance: normalizeAttendanceStatus(attendance), status: normalizeAttendanceStatus(attendance) === 'Attended' ? 'Attended' : normalizeAttendanceStatus(attendance) === 'Absent' ? 'Cancelled' : 'New' });
      return NextResponse.json({ success: true });
    }
    if (action === 'set-all-attendance') {
      const { eventId, attendance } = body;
      if (!eventId || !ATTENDANCE_OPTIONS.includes(attendance)) {
        return NextResponse.json({ error: 'Event ID and valid attendance status are required.' }, { status: 400 });
      }
      const regs = await db.eventRegistrations.getAll();
      const updates = regs.filter((registration: any) => registration.eventId === eventId);
      for (const reg of updates) {
        await db.eventRegistrations.updateOne(reg.id, { attendance: normalizeAttendanceStatus(attendance), status: normalizeAttendanceStatus(attendance) === 'Attended' ? 'Attended' : normalizeAttendanceStatus(attendance) === 'Absent' ? 'Cancelled' : 'New' });
      }
      return NextResponse.json({ success: true, updated: updates.length });
    }
    if (action === 'generate-certificate') {
      const { registrationId } = body;
      if (!registrationId) {
        return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
      }

      const registrations = await db.eventRegistrations.getAll();
      const registration = registrations.find((entry: any) => entry.id === registrationId);
      if (!registration) {
        return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      }
      if (!isCertificateEligible(registration)) {
        return NextResponse.json({ error: 'Only students marked as Attended are eligible for a certificate.' }, { status: 400 });
      }

      const existingCertificate = await db.certificates.getByRegistrationId(registrationId);
      if (existingCertificate && existingCertificate.status !== 'Revoked') {
        return NextResponse.json({ success: true, certificate: existingCertificate, alreadyExists: true });
      }

      const event = (await db.events.getAll()).find((entry: any) => entry.id === registration.eventId) || {};
      const certificateId = existingCertificate?.certificateId || (await generateCertificateId(registrationId, registration.eventId, registration.name));
      const record = await createCertificateRecord(registration, event, certificateId);
      const certificate = await db.certificates.insertOne({
        ...record,
        certificateId,
        registrationId,
        studentName: registration.name,
        eventName: event.title || registration.eventName || 'AWS Event',
        eventDate: event.date || registration.date || new Date().toISOString().slice(0, 10),
        venue: event.venue || registration.venue || 'Chandigarh University – Uttar Pradesh',
        issueDate: new Date().toISOString().slice(0, 10),
        status: 'Valid'
      });
      await db.eventRegistrations.updateOne(registrationId, { certificateId, attendance: 'Attended', status: 'Attended' });
      return NextResponse.json({ success: true, certificate, alreadyExists: false });
    }
    if (action === 'download-certificate') {
      const { registrationId } = body;
      if (!registrationId) {
        return NextResponse.json({ error: 'Registration ID is required.' }, { status: 400 });
      }
      const registration = (await db.eventRegistrations.getAll()).find((entry: any) => entry.id === registrationId);
      if (!registration) {
        return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      }

      const certificate = await db.certificates.getByRegistrationId(registrationId);
      if (!certificate) {
        return NextResponse.json({ error: 'No certificate exists for this registration.' }, { status: 404 });
      }

      const event = (await db.events.getAll()).find((entry: any) => entry.id === registration.eventId) || {};
      const pdf = await generateCertificatePdfBuffer({
        studentName: certificate.studentName || registration.name,
        eventName: certificate.eventName || event.title || registration.eventName || 'AWS Event',
        eventDate: certificate.eventDate || event.date || registration.date || new Date().toISOString().slice(0, 10),
        venue: certificate.venue || event.venue || 'Chandigarh University – Uttar Pradesh',
        certificateId: certificate.certificateId,
        description: `For outstanding achievement in ${certificate.eventName || event.title || registration.eventName || 'the AWS Student Builder Group'}`
      });

      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(getCertificateFileName(certificate.studentName || registration.name, certificate.certificateId))}"`,
          'Cache-Control': 'no-store'
        }
      });
    }
    if (action === 'revoke-certificate') {
      const { certificateId } = body;
      if (!certificateId) {
        return NextResponse.json({ error: 'Certificate ID is required.' }, { status: 400 });
      }
      await db.certificates.revoke(certificateId);
      return NextResponse.json({ success: true });
    }
    if (action === 'restore-certificate') {
      const { certificateId } = body;
      if (!certificateId) {
        return NextResponse.json({ error: 'Certificate ID is required.' }, { status: 400 });
      }
      await db.certificates.restore(certificateId);
      return NextResponse.json({ success: true });
    }
    if (action === 'get-certificates') {
      const certificates = await db.certificates.getAll();
      return NextResponse.json(certificates);
    }

    // 4. Events Management
    if (action === 'get-events') {
      return NextResponse.json(await db.events.getAll());
    }
    if (action === 'create-event') {
      const { event } = body;
      const events = await db.events.getAll();
      const newEvent = {
        status: 'Draft',
        registrationStatus: 'Not Open',
        ...event,
        id: `event-${Date.now()}`,
        number: `Event 0${events.length + 1}`
      };
      events.push(newEvent);
      await db.events.saveAll(events);
      return NextResponse.json({ success: true, event: newEvent });
    }
    if (action === 'update-event') {
      const { event } = body;
      if (!event || !event.id) {
        return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
      }

      try {
        const events = await db.events.getAll();
        const idx = events.findIndex(e => e.id === event.id);
        if (idx === -1) {
          return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        const mergedEvent = mergeEventUpdate(events[idx], event);
        const normalizedEvent = normalizeEventPayload(mergedEvent);
        const updatedEvent = { ...events[idx], ...normalizedEvent };
        if (!updatedEvent.status) updatedEvent.status = 'Draft';
        if (!updatedEvent.registrationStatus) updatedEvent.registrationStatus = 'Not Open';

        events[idx] = updatedEvent;
        await db.events.saveAll(events);
        return NextResponse.json({ success: true, event: updatedEvent });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Unable to update event.' }, { status: 400 });
      }
    }
    if (action === 'delete-event') {
      const { id } = body;
      let events = await db.events.getAll();
      events = events.filter(e => e.id !== id);
      await db.events.saveAll(events);
      return NextResponse.json({ success: true });
    }

    // 5. Announcements Management
    if (action === 'get-announcements') {
      return NextResponse.json(await db.announcements.getAll());
    }
    if (action === 'create-announcement') {
      const { announcement } = body;
      const announcements = await db.announcements.getAll();
      const newAnn = {
        ...announcement,
        id: `ann-${Date.now()}`,
        date: new Date().toISOString()
      };
      announcements.push(newAnn);
      await db.announcements.saveAll(announcements);
      return NextResponse.json({ success: true, announcement: newAnn });
    }
    if (action === 'update-announcement') {
      const { announcement } = body;
      const announcements = await db.announcements.getAll();
      const idx = announcements.findIndex(a => a.id === announcement.id);
      if (idx !== -1) {
        announcements[idx] = { ...announcements[idx], ...announcement };
        await db.announcements.saveAll(announcements);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    if (action === 'delete-announcement') {
      const { id } = body;
      let announcements = await db.announcements.getAll();
      announcements = announcements.filter(a => a.id !== id);
      await db.announcements.saveAll(announcements);
      return NextResponse.json({ success: true });
    }

    // 6. Resources Management
    if (action === 'get-resources') {
      return NextResponse.json(await db.resources.getAll());
    }
    if (action === 'create-resource') {
      const { resource } = body;
      const resources = await db.resources.getAll();
      const newRes = {
        ...resource,
        id: `res-${Date.now()}`
      };
      resources.push(newRes);
      await db.resources.saveAll(resources);
      return NextResponse.json({ success: true, resource: newRes });
    }
    if (action === 'update-resource') {
      const { resource } = body;
      const resources = await db.resources.getAll();
      const idx = resources.findIndex(r => r.id === resource.id);
      if (idx !== -1) {
        resources[idx] = { ...resources[idx], ...resource };
        await db.resources.saveAll(resources);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    if (action === 'delete-resource') {
      const { id } = body;
      let resources = await db.resources.getAll();
      resources = resources.filter(r => r.id !== id);
      await db.resources.saveAll(resources);
      return NextResponse.json({ success: true });
    }

    // 7. Careers Management
    if (action === 'get-careers') {
      return NextResponse.json(await db.careers.getAll());
    }
    if (action === 'create-career') {
      const { career } = body;
      const careers = await db.careers.getAll();
      const newCareer = {
        ...career,
        id: `career-${Date.now()}`,
        slug: career.slug || `career-${Date.now()}`,
        published: Boolean(career.published),
        internalApplications: Boolean(career.internalApplications),
        status: career.status || 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      careers.unshift(newCareer);
      await db.careers.saveAll(careers);
      return NextResponse.json({ success: true, career: newCareer });
    }
    if (action === 'update-career') {
      const { career } = body;
      if (!career || !career.id) {
        return NextResponse.json({ error: 'Career ID is required.' }, { status: 400 });
      }
      const careers = await db.careers.getAll();
      const idx = careers.findIndex((c: any) => c.id === career.id);
      if (idx === -1) {
        return NextResponse.json({ error: 'Career not found.' }, { status: 404 });
      }
      careers[idx] = { ...careers[idx], ...career, updatedAt: new Date().toISOString() };
      await db.careers.saveAll(careers);
      return NextResponse.json({ success: true, career: careers[idx] });
    }
    if (action === 'delete-career') {
      const { id } = body;
      const careers = await db.careers.getAll();
      const filtered = careers.filter((c: any) => c.id !== id);
      await db.careers.saveAll(filtered);
      return NextResponse.json({ success: true });
    }
    if (action === 'get-career-applications') {
      const { opportunityId } = body;
      if (!opportunityId) {
        return NextResponse.json({ error: 'Opportunity ID is required.' }, { status: 400 });
      }
      return NextResponse.json(await db.careerApplications.getByOpportunityId(opportunityId));
    }
    if (action === 'get-career-applications-all') {
      return NextResponse.json(await db.careerApplications.getAll());
    }
    if (action === 'update-career-application') {
      const { id, status, adminNotes } = body;
      await db.careerApplications.updateOne(id, { status, adminNotes });
      return NextResponse.json({ success: true });
    }
    if (action === 'delete-career-application') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Application ID is required.' }, { status: 400 });
      }
      await db.careerApplications.deleteOne(id);
      const resumeFiles = await db.resumeFiles.getMap();
      if (resumeFiles[id]) {
        delete resumeFiles[id];
        await db.resumeFiles.saveMap(resumeFiles);
      }
      return NextResponse.json({ success: true });
    }
    if (action === 'export-career-applications-csv') {
      const { opportunityId } = body;
      if (!opportunityId) {
        return NextResponse.json({ error: 'Opportunity ID is required.' }, { status: 400 });
      }

      const careers = await db.careers.getAll();
      const opportunity = careers.find((item: any) => item.id === opportunityId);
      if (!opportunity) {
        return NextResponse.json({ error: 'Opportunity not found.' }, { status: 404 });
      }

      const applications = await db.careerApplications.getByOpportunityId(opportunityId);
      if (applications.length === 0) {
        return NextResponse.json({ error: 'No applications available to export.' }, { status: 400 });
      }

      const headers = [
        'Application ID',
        'Opportunity ID',
        'Opportunity Title',
        'Student Name',
        'Email',
        'Phone',
        'University',
        'Program',
        'Graduation Year',
        'Student ID',
        'LinkedIn',
        'GitHub',
        'Portfolio',
        'Skills',
        'Experience',
        'Motivation',
        'Additional Information',
        'Consent',
        'Status',
        'Admin Notes',
        'Registration Date',
        'Registration Time'
      ].join(',');

      const rows = applications.map((application: any) => (
        [
          application.id,
          application.opportunityId,
          opportunity.title || '',
          application.name || '',
          application.email || '',
          application.phone || '',
          application.university || '',
          application.program || '',
          application.graduationYear || '',
          application.studentId || '',
          application.linkedin || '',
          application.github || '',
          application.portfolio || '',
          application.skills || '',
          application.experience || '',
          application.motivation || '',
          application.additionalInformation || '',
          application.consent ? 'Yes' : 'No',
          application.status || 'New',
          application.adminNotes || '',
          application.createdAt ? new Date(application.createdAt).toLocaleDateString() : '',
          application.createdAt ? new Date(application.createdAt).toLocaleTimeString() : ''
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ));

      const csv = [headers, ...rows].join('\n');
      const filename = `${String(opportunity.title || 'opportunity').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '') || 'opportunity'}-applications.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    // 8. Verification Requests Management
    if (action === 'get-verifications') {
      return NextResponse.json(await db.verificationRequests.getAll());
    }
    if (action === 'update-verification') {
      const { id, status, notes } = body;
      const verifications = await db.verificationRequests.getAll();
      const idx = verifications.findIndex(v => v.id === id);
      if (idx !== -1) {
        verifications[idx].status = status || verifications[idx].status;
        verifications[idx].notes = notes !== undefined ? notes : verifications[idx].notes;
        await db.verificationRequests.saveAll(verifications);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    // 8. Core Team Management
    if (action === 'get-team') {
      return NextResponse.json(await db.coreTeam.getAll());
    }
    if (action === 'create-team-member') {
      const { member } = body;
      const team = await db.coreTeam.getAll();
      const newMember = {
        ...member,
        id: `team-${Date.now()}`,
        displayOrder: team.length + 1
      };
      team.push(newMember);
      await db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true, member: newMember });
    }
    if (action === 'update-team-member') {
      const { member } = body;
      const team = await db.coreTeam.getAll();
      const idx = team.findIndex(t => t.id === member.id);
      if (idx !== -1) {
        team[idx] = { ...team[idx], ...member };
        await db.coreTeam.saveAll(team);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }
    if (action === 'delete-team-member') {
      const { id } = body;
      let team = await db.coreTeam.getAll();
      team = team.filter(t => t.id !== id);
      await db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true });
    }
    if (action === 'reorder-team') {
      const { orders } = body; // Array of { id, displayOrder }
      const team = await db.coreTeam.getAll();
      orders.forEach((o: any) => {
        const idx = team.findIndex(t => t.id === o.id);
        if (idx !== -1) {
          team[idx].displayOrder = o.displayOrder;
        }
      });
      team.sort((a, b) => a.displayOrder - b.displayOrder);
      await db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true });
    }

    // 9. Collaborations Management
    if (action === 'get-collaborations') {
      return NextResponse.json(await db.collaborationRequests.getAll());
    }
    if (action === 'update-collaboration') {
      const { id, status } = body;
      const collaborations = await db.collaborationRequests.getAll();
      const idx = collaborations.findIndex(c => c.id === id);
      if (idx !== -1) {
        collaborations[idx].status = status || collaborations[idx].status;
        await db.collaborationRequests.saveAll(collaborations);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Collaboration request not found' }, { status: 404 });
    }

    // 10. Website Content CMS Management
    if (action === 'get-content') {
      return NextResponse.json(await db.websiteContent.get());
    }
    if (action === 'update-content') {
      const { content } = body;
      await db.websiteContent.save(content);
      return NextResponse.json({ success: true });
    }

    // 11. Admin Settings: Change Password
    if (action === 'change-password') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Missing passwords.' }, { status: 400 });
      }

      const admins = await db.admins.getAll();
      const admin = admins[0]; // main admin
      const currentHash = hashPassword(currentPassword, admin.salt);
      if (currentHash !== admin.passwordHash) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      admin.salt = generateSalt();
      admin.passwordHash = hashPassword(newPassword, admin.salt);
      await db.admins.saveAll(admins);
      return NextResponse.json({ success: true });
    }

    // 12. Notifications Management
    if (action === 'get-notifications') {
      return NextResponse.json(await db.notifications.getAll());
    }
    if (action === 'mark-notifications-read') {
      const notifications = await db.notifications.getAll();
      notifications.forEach(n => { n.status = 'read'; });
      await db.notifications.saveAll(notifications);
      return NextResponse.json({ success: true });
    }

    if (action === 'get-contact-messages') {
      return NextResponse.json(await db.contactMessages.getAll());
    }
    if (action === 'update-contact-message') {
      const { id, status } = body;
      const messages = await db.contactMessages.getAll();
      const idx = messages.findIndex(m => m.id === id);
      if (idx !== -1) {
        messages[idx].status = status || messages[idx].status;
        await db.contactMessages.saveAll(messages);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Contact message not found' }, { status: 404 });
    }
    if (action === 'delete-contact-message') {
      const { id } = body;
      let messages = await db.contactMessages.getAll();
      messages = messages.filter(m => m.id !== id);
      await db.contactMessages.saveAll(messages);
      return NextResponse.json({ success: true });
    }

    // 12b. Feedback Administrative Actions
    const isGetVisibilityAction = action === 'get-feedback-page-status' || action === 'get_feedback_page_visibility';
    const isSetVisibilityAction = action === 'set-feedback-page-status' || action === 'set_feedback_page_visibility';

    if (isGetVisibilityAction) {
      const published = await db.settings.getFeedbackPagePublished();
      return NextResponse.json({ published });
    }

    if (isSetVisibilityAction) {
      const { published } = body;
      if (typeof published !== 'boolean') {
        return NextResponse.json({ error: 'Published flag must be a boolean.' }, { status: 400 });
      }

      try {
        await db.settings.setFeedbackPagePublished(published);
        return NextResponse.json({ success: true, published });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'get-feedbacks') {
      return NextResponse.json(await db.feedback.getAll());
    }

    if (action === 'update-feedback') {
      const { id, feedback } = body;
      try {
        await db.feedback.updateOne(id, feedback);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'delete-feedback') {
      const { id } = body;
      try {
        await db.feedback.deleteOne(id);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // 13. Data Export Management
    const isLegacyEventExportAction = action === 'export-csv' || action === 'export-excel' || action === 'export-pdf';
    const isLegacyFeedbackExportAction = action === 'export-feedbacks-csv' || action === 'export-feedbacks-excel' || action === 'export-feedbacks-pdf';
    const isCanonicalFeedbackExportAction = action === 'export_feedbacks_csv' || action === 'export_feedbacks_excel' || action === 'export_feedbacks_pdf';

    if (isLegacyEventExportAction || isLegacyFeedbackExportAction || isCanonicalFeedbackExportAction) {
      if (isLegacyFeedbackExportAction || isCanonicalFeedbackExportAction) {
        const { eventId } = body;
        const allEvents = await db.events.getAll();
        const allFeedbacks = await db.feedback.getAll();

        let filtered = allFeedbacks;
        let eventTitle = 'All-Events';
        if (eventId) {
          const event = allEvents.find(e => e.id === eventId);
          if (!event) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
          }
          filtered = allFeedbacks.filter(f => f.eventId === eventId);
          eventTitle = event.title;
        }

        if (filtered.length === 0) {
          return NextResponse.json({ error: 'No feedback records available to export.' }, { status: 400 });
        }

        const formattedTitle = eventTitle.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
        const actionKey = action.includes('excel') ? 'excel' : action.includes('pdf') ? 'pdf' : 'csv';

        if (actionKey === 'csv') {
          const headers = [
            'Feedback ID',
            'Student Name',
            'Email',
            'University',
            'Event Name',
            'Rating',
            'Experience',
            'Feedback Comments',
            'What they liked',
            'What can we improve',
            'Recommendation',
            'Status',
            'Admin Notes',
            'Submitted Date'
          ].join(',');

          const rows = filtered.map(f => {
            const e = allEvents.find(ev => ev.id === f.eventId);
            const evName = e ? e.title : 'General / Others';
            return [
              f.id,
              f.name,
              f.email,
              f.university,
              evName,
              f.rating,
              f.experience,
              f.feedback,
              f.liked,
              f.improvements,
              f.recommendation,
              f.status,
              f.adminNotes,
              f.createdAt ? new Date(f.createdAt).toLocaleString() : ''
            ].map(val => {
              const str = String(val);
              return `"${str.replace(/"/g, '""')}"`;
            }).join(',');
          });

          const csvContent = [headers, ...rows].join('\n');
          return new NextResponse(csvContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv;charset=utf-8',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(formattedTitle)}-feedback.csv"`,
              'Cache-Control': 'no-store'
            }
          });
        }

        if (actionKey === 'excel') {
          const XLSX = require('xlsx');
          const sheetData = filtered.map(f => {
            const e = allEvents.find(ev => ev.id === f.eventId);
            const evName = e ? e.title : 'General / Others';
            return {
              'Feedback ID': f.id,
              'Student Name': f.name,
              'Email': f.email,
              'University': f.university,
              'Event Name': evName,
              'Rating': f.rating,
              'Experience': f.experience,
              'Feedback Comments': f.feedback,
              'What they liked': f.liked,
              'What can we improve': f.improvements,
              'Recommendation': f.recommendation,
              'Status': f.status,
              'Admin Notes': f.adminNotes,
              'Submitted Date': f.createdAt ? new Date(f.createdAt).toLocaleString() : ''
            };
          });

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(sheetData);
          const colWidths = [
            { wch: 18 }, { wch: 24 }, { wch: 28 }, { wch: 24 }, { wch: 42 }, { wch: 10 },
            { wch: 18 }, { wch: 52 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 16 },
            { wch: 28 }, { wch: 22 }
          ];
          ws['!cols'] = colWidths;
          XLSX.utils.book_append_sheet(wb, ws, 'Feedback');

          const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
          return new NextResponse(excelBuffer as any, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(formattedTitle)}-feedback.xlsx"`,
              'Cache-Control': 'no-store'
            }
          });
        }

        if (actionKey === 'pdf') {
          const { jsPDF } = require('jspdf');
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text('AWS Student Builder Group', 421, 40, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text('Chandigarh University – Uttar Pradesh', 421, 55, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(255, 153, 0);
          doc.text('Feedback Report', 421, 75, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`Event/Target: ${eventTitle}`, 30, 105);
          doc.text(`Total Feedbacks: ${filtered.length}`, 30, 120);
          doc.text(`Report Generated: ${new Date().toLocaleString()}`, 30, 135);

          const drawHeaders = (y: number) => {
            doc.setFillColor(241, 245, 249);
            doc.rect(30, y - 10, 782, 18, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text('No.', 35, y, { maxWidth: 25 });
            doc.text('Student Name', 65, y, { maxWidth: 100 });
            doc.text('Email', 170, y, { maxWidth: 110 });
            doc.text('Event', 285, y, { maxWidth: 140 });
            doc.text('Rating', 430, y, { maxWidth: 30 });
            doc.text('Exp.', 465, y, { maxWidth: 45 });
            doc.text('Feedback Comments', 515, y, { maxWidth: 165 });
            doc.text('Status', 685, y, { maxWidth: 45 });
            doc.text('Date', 735, y, { maxWidth: 70 });
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(30, y + 10, 812, y + 10);
          };

          let currentY = 165;
          drawHeaders(currentY);
          currentY += 18;

          filtered.forEach((f, idx) => {
            if (currentY > 530) {
              doc.addPage();
              currentY = 40;
              drawHeaders(currentY);
              currentY += 18;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(`${idx + 1}`, 35, currentY);

            const safeText = (txt: string, maxLen: number) => {
              const str = txt || '';
              return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
            };

            const e = allEvents.find(ev => ev.id === f.eventId);
            const evName = e ? e.title : 'General / Others';

            doc.text(safeText(f.name, 22), 65, currentY);
            doc.text(safeText(f.email, 24), 170, currentY);
            doc.text(safeText(evName, 32), 285, currentY);
            doc.text(`${f.rating} ★`, 430, currentY);
            doc.text(safeText(f.experience, 12), 465, currentY);
            doc.text(safeText(f.feedback, 45), 515, currentY);
            doc.text(safeText(f.status || 'New', 12), 685, currentY);
            doc.text(f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '', 735, currentY);
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.5);
            doc.line(30, currentY + 8, 812, currentY + 8);
            currentY += 15;
          });

          const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
          return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${encodeURIComponent(formattedTitle)}-feedback.pdf"`,
              'Cache-Control': 'no-store'
            }
          });
        }
      }

      const { eventId } = body;
      if (!eventId) {
        return NextResponse.json({ error: 'Missing parameter: eventId.' }, { status: 400 });
      }

      const events = await db.events.getAll();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
      }

      const registrations = await db.eventRegistrations.getAll();
      const eventRegs = registrations.filter(r => r.eventId === eventId);

      if (eventRegs.length === 0) {
        return NextResponse.json({ error: 'No registrations available to export.' }, { status: 400 });
      }

      if (action === 'export-csv' || action === 'export_csv') {
        const rows = eventRegs.map((r, index) => {
          return [
            r.id,
            r.name,
            r.email,
            r.phone || '',
            r.university,
            r.program,
            r.year,
            r.studentId || '',
            Array.isArray(r.interests) ? r.interests.join('; ') : r.interests,
            r.experienceLevel || 'Beginner',
            r.linkedin || '',
            r.github || '',
            r.motivation || '',
            r.consent ? 'Yes' : 'No',
            r.status || 'New',
            r.date ? new Date(r.date).toLocaleDateString() : '',
            r.date ? new Date(r.date).toLocaleTimeString() : ''
          ].map(val => {
            const str = String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',');
        });

        const headers = [
          'Registration ID',
          'Student Name',
          'Email',
          'Phone',
          'University',
          'Program',
          'Year',
          'Student ID',
          'Technical Interests',
          'Experience Level',
          'LinkedIn',
          'GitHub',
          'Motivation',
          'Consent',
          'Status',
          'Registration Date',
          'Registration Time'
        ].join(',');

        const csvContent = [headers, ...rows].join('\n');
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv;charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(event.title)}-registrations.csv"`,
            'Cache-Control': 'no-store'
          }
        });
      }

      if (action === 'export-excel' || action === 'export_excel') {
        const XLSX = require('xlsx');
        const rows = eventRegs.map((r, index) => ({
          'Registration ID': r.id,
          'Student Name': r.name,
          'Email': r.email,
          'Phone': r.phone || '',
          'University': r.university,
          'Program': r.program,
          'Year': r.year,
          'Student ID': r.studentId || '',
          'Technical Interests': Array.isArray(r.interests) ? r.interests.join(', ') : r.interests,
          'Experience Level': r.experienceLevel || 'Beginner',
          'LinkedIn': r.linkedin || '',
          'GitHub': r.github || '',
          'Motivation': r.motivation || '',
          'Consent': r.consent ? 'Yes' : 'No',
          'Status': r.status || 'New',
          'Registration Date': r.date ? new Date(r.date).toLocaleDateString() : '',
          'Registration Time': r.date ? new Date(r.date).toLocaleTimeString() : ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const colWidths = [
          { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
          { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
          { wch: 45 }, { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
        ];
        worksheet['!cols'] = colWidths;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        return new NextResponse(excelBuffer as any, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(event.title)}-registrations.xlsx"`,
            'Cache-Control': 'no-store'
          }
        });
      }

      if (action === 'export-pdf' || action === 'export_pdf') {
        const { jsPDF } = require('jspdf');
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 28;
        const tableWidth = pageWidth - margin * 2;
        const tableColumns = [
          { title: 'No.', width: 30 },
          { title: 'Student Name', width: 88 },
          { title: 'Student ID / UID', width: 92 },
          { title: 'Email', width: 104 },
          { title: 'University', width: 92 },
          { title: 'Program', width: 84 },
          { title: 'Year', width: 42 },
          { title: 'Status', width: 52 },
          { title: 'Registration Date', width: 82 },
          { title: 'Student Signature', width: 120 }
        ];
        const leaderNames = [siteConfig.leader.name, 'Vaibhav Sharma'];

        const formatDateLabel = (value?: string) => {
          if (!value) return '—';
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return value;
          return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        const safeText = (value: string | undefined, maxLen: number): string => {
          const str = (value || '').trim();
          if (!str) return '';
          return str.length > maxLen ? `${str.slice(0, maxLen - 1)}…` : str;
        };

        const addPageHeader = (title: string) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.setTextColor(15, 23, 42);
          doc.text('AWS Student Builder Group', pageWidth / 2, 24, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Chandigarh University – Uttar Pradesh', pageWidth / 2, 38, { align: 'center' });
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(255, 153, 0);
          doc.text(title, pageWidth / 2, 52, { align: 'center' });
        };

        const drawTableHeader = (y: number) => {
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y - 10, tableWidth, 18, 'F');
          let x = margin;
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          tableColumns.forEach((column) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(column.title, x + 4, y, { maxWidth: column.width - 8 });
            doc.line(x, y + 10, x + column.width, y + 10);
            x += column.width;
          });
        };

        const drawTableRow = (row: any, idx: number, y: number) => {
          let x = margin;
          const values = [
            String(idx + 1),
            safeText(row.name, 22),
            row.studentId?.trim() ? safeText(row.studentId, 18) : '—',
            safeText(row.email, 26),
            safeText(row.university, 20),
            safeText(row.program, 18),
            safeText(row.year, 12),
            safeText(row.status || 'New', 12),
            formatDateLabel(row.date),
            ''
          ];

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.35);
          tableColumns.forEach((column, columnIndex) => {
            const colX = x;
            const colWidth = column.width;
            const value = values[columnIndex];

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(51, 65, 85);

            if (columnIndex === tableColumns.length - 1) {
              doc.line(colX + 10, y + 12, colX + colWidth - 10, y + 12);
            } else {
              const lines = doc.splitTextToSize(value || '—', colWidth - 8);
              doc.text(lines.slice(0, 2), colX + 4, y + 8);
            }

            doc.line(colX, y + 15, colX + colWidth, y + 15);
            x += colWidth;
          });
        };

        const drawSignatureSection = (startY: number) => {
          let currentY = startY;
          
          // Section title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text('Leadership & Authorization', margin, currentY);
          currentY += 20;

          // Signature line properties
          const signatureLineWidth = 130;
          const signatureLineY = currentY + 8;
          
          // Calculate 3-column positions
          const usableWidth = pageWidth - margin * 2;
          const columnWidth = usableWidth / 3;
          
          const leftSignX = margin + (columnWidth / 2) - (signatureLineWidth / 2);
          const centerSignX = margin + columnWidth + (columnWidth / 2) - (signatureLineWidth / 2);
          const rightSignX = margin + columnWidth * 2 + (columnWidth / 2) - (signatureLineWidth / 2);
          
          // Draw all three signature lines at same height
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.8);
          doc.line(leftSignX, signatureLineY, leftSignX + signatureLineWidth, signatureLineY);
          doc.line(centerSignX, signatureLineY, centerSignX + signatureLineWidth, signatureLineY);
          doc.line(rightSignX, signatureLineY, rightSignX + signatureLineWidth, signatureLineY);
          
          // Left: Abhay Shukla
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text('Abhay Shukla', leftSignX + (signatureLineWidth / 2), signatureLineY + 16, { align: 'center' });
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('AWS Student Builder Group Leader', leftSignX + (signatureLineWidth / 2), signatureLineY + 28, { align: 'center', maxWidth: columnWidth - 8 });
          
          // Center: Authorized Signature
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text('Authorized Signature', centerSignX + (signatureLineWidth / 2), signatureLineY + 16, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text('AWS Student Builder Group', centerSignX + (signatureLineWidth / 2), signatureLineY + 28, { align: 'center' });
          doc.text('Chandigarh University – Uttar Pradesh', centerSignX + (signatureLineWidth / 2), signatureLineY + 40, { align: 'center', maxWidth: columnWidth - 8 });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.text('Date: ________________', centerSignX + (signatureLineWidth / 2), signatureLineY + 52, { align: 'center' });
          
          // Right: Vaibhav Sharma
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text('Vaibhav Sharma', rightSignX + (signatureLineWidth / 2), signatureLineY + 16, { align: 'center' });
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('AWS Student Builder Group Leader', rightSignX + (signatureLineWidth / 2), signatureLineY + 28, { align: 'center', maxWidth: columnWidth - 8 });
        };

        addPageHeader('EVENT REGISTRATION REPORT');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`Event Name: ${event.title}`, margin, 76);
        doc.text(`Event Date: ${event.date || 'TBA'} | Time: ${event.time || 'TBA'}`, margin, 90);
        doc.text(`Venue: ${event.venue || 'TBA'} | Status: ${event.registrationStatus || 'Closed'}`, margin, 104);
        doc.text(`Total Registrations: ${eventRegs.length}`, margin, 118);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, 132);

        let currentY = 154;
        let activePage = 1;
        const rowsPerPage = 18;

        const finalizeSignatureSection = () => {
          // Signature section needs approximately 80pt of space
          const signatureSectionHeight = 80;
          const bottomMargin = 40; // Space reserved at bottom of page
          const availableSpace = pageHeight - currentY - bottomMargin;
          
          // If signature section won't fit on current page, move it to next page
          if (availableSpace < signatureSectionHeight) {
            doc.addPage();
            activePage += 1;
            addPageHeader('LEADERSHIP & AUTHORIZATION');
            currentY = 76;
          }
          
          // Draw signature section immediately after current position
          drawSignatureSection(currentY + 12);
        };

        drawTableHeader(currentY);
        currentY += 20;

        eventRegs.forEach((r, idx) => {
          if (currentY > pageHeight - 110) {
            doc.addPage();
            activePage += 1;
            addPageHeader('EVENT REGISTRATION REPORT');
            currentY = 150;
            drawTableHeader(currentY);
            currentY += 20;
          }

          drawTableRow(r, idx, currentY);
          currentY += 18;
        });

        finalizeSignatureSection();

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Generated by AWS Student Builder Group | Confidential Attendance Record', margin, pageHeight - 18);

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        return new NextResponse(pdfBuffer as any, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(event.title)}-registrations.pdf"`,
            'Cache-Control': 'no-store'
          }
        });
      }
    }

    return NextResponse.json({ error: 'Unknown action parameter' }, { status: 400 });
  } catch (err) {
    console.error('API Admin Main Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
