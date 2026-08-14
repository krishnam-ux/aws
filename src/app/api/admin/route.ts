import { NextResponse } from 'next/server';
import { db, hashPassword, generateSalt } from '@/lib/db';

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

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
      try {
        await db.eventRegistrations.deleteOne(id);
        return NextResponse.json({ success: true });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
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
      const events = await db.events.getAll();
      const idx = events.findIndex(e => e.id === event.id);
      if (idx !== -1) {
        const updatedEvent = { ...events[idx], ...event };
        if (!updatedEvent.status) updatedEvent.status = 'Draft';
        if (!updatedEvent.registrationStatus) updatedEvent.registrationStatus = 'Not Open';
        events[idx] = updatedEvent;
        await db.events.saveAll(events);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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

    // 7. Verification Requests Management
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

    // 13. Data Export Management
    if (action === 'export-csv' || action === 'export-excel' || action === 'export-pdf') {
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

      if (action === 'export-csv') {
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

      if (action === 'export-excel') {
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
        
        // Auto column sizing
        const colWidths = [
          { wch: 25 }, // Reg ID
          { wch: 20 }, // Name
          { wch: 25 }, // Email
          { wch: 15 }, // Phone
          { wch: 30 }, // University
          { wch: 25 }, // Program
          { wch: 10 }, // Year
          { wch: 12 }, // Student ID
          { wch: 30 }, // Interests
          { wch: 15 }, // Experience
          { wch: 30 }, // LinkedIn
          { wch: 30 }, // GitHub
          { wch: 45 }, // Motivation
          { wch: 8 },  // Consent
          { wch: 10 }, // Status
          { wch: 15 }, // Date
          { wch: 15 }  // Time
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

      if (action === 'export-pdf') {
        const { jsPDF } = require('jspdf');
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4'
        });

        // Report Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42); // #0F172A
        doc.text('AWS Student Builder Group', 421, 40, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text('Chandigarh University – Uttar Pradesh', 421, 55, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 153, 0); // #FF9900
        doc.text('Event Registration Report', 421, 75, { align: 'center' });

        // Meta Info Box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59); // #1E293B
        doc.text(`Event Name: ${event.title}`, 30, 105);
        doc.text(`Event Date: ${event.date || 'TBA'} | Time: ${event.time || 'TBA'}`, 30, 120);
        doc.text(`Venue: ${event.venue || 'TBA'} | Status: ${event.registrationStatus || 'Closed'}`, 30, 135);
        doc.text(`Total Registrations: ${eventRegs.length}`, 30, 150);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 30, 165);

        // Table Headers drawer
        const drawHeaders = (y: number) => {
          doc.setFillColor(241, 245, 249); // #F1F5F9
          doc.rect(30, y - 10, 782, 18, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42); // #0F172A
          
          doc.text('No.', 35, y, { maxWidth: 25 });
          doc.text('Student Name', 65, y, { maxWidth: 110 });
          doc.text('Email', 180, y, { maxWidth: 155 });
          doc.text('University', 340, y, { maxWidth: 145 });
          doc.text('Program', 490, y, { maxWidth: 115 });
          doc.text('Year', 610, y, { maxWidth: 50 });
          doc.text('Status', 665, y, { maxWidth: 45 });
          doc.text('Registration Date', 715, y, { maxWidth: 90 });
          
          // Draw bottom line
          doc.setDrawColor(226, 232, 240); // #E2E8F0
          doc.setLineWidth(0.5);
          doc.line(30, y + 10, 812, y + 10);
        };

        let currentY = 195;
        drawHeaders(currentY);
        currentY += 18;

        eventRegs.forEach((r, idx) => {
          if (currentY > 530) {
            doc.addPage();
            currentY = 40;
            drawHeaders(currentY);
            currentY += 18;
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85); // #334155

          doc.text(`${idx + 1}`, 35, currentY);
          
          // Helper to truncate text to prevent overflow
          const safeText = (txt: string, maxLen: number) => {
            const str = txt || '';
            return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
          };

          doc.text(safeText(r.name, 25), 65, currentY);
          doc.text(safeText(r.email, 35), 180, currentY);
          doc.text(safeText(r.university, 30), 340, currentY);
          doc.text(safeText(r.program, 25), 490, currentY);
          doc.text(safeText(r.year, 15), 610, currentY);
          doc.text(safeText(r.status || 'New', 10), 665, currentY);
          doc.text(r.date ? new Date(r.date).toLocaleDateString() : '', 715, currentY);

          // Draw row bottom line
          doc.setDrawColor(241, 245, 249); // #F1F5F9
          doc.setLineWidth(0.5);
          doc.line(30, currentY + 8, 812, currentY + 8);
          
          currentY += 15;
        });

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
