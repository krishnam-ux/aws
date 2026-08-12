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

      const admins = db.admins.getAll();
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

    // 2. Dashboard Stats
    if (action === 'get-stats') {
      const registrations = db.registrations.getAll();
      const events = db.events.getAll();
      const verifications = db.verificationRequests.getAll();
      const announcements = db.announcements.getAll();
      const resources = db.resources.getAll();
      const collaborations = db.collaborationRequests.getAll();

      const counts = {
        registrations: registrations.length,
        events: events.filter(e => e.status !== 'Draft').length,
        verifications: verifications.filter(v => v.status === 'New').length,
        announcements: announcements.length,
        resources: resources.length,
        collaborations: collaborations.filter(c => c.status === 'New').length
      };

      const recentRegistrations = [...registrations]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const recentVerifications = [...verifications]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const upcomingEvents = events
        .filter(e => e.status === 'Planned' || e.status === 'Upcoming')
        .slice(0, 5);

      return NextResponse.json({ counts, recentRegistrations, recentVerifications, upcomingEvents });
    }

    // 3. Registrations Management
    if (action === 'get-registrations') {
      return NextResponse.json(db.registrations.getAll());
    }
    if (action === 'update-registration') {
      const { id, status, notes } = body;
      const registrations = db.registrations.getAll();
      const idx = registrations.findIndex(r => r.id === id);
      if (idx !== -1) {
        registrations[idx].status = status || registrations[idx].status;
        registrations[idx].notes = notes !== undefined ? notes : registrations[idx].notes;
        db.registrations.saveAll(registrations);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    if (action === 'delete-registration') {
      const { id } = body;
      let registrations = db.registrations.getAll();
      registrations = registrations.filter(r => r.id !== id);
      db.registrations.saveAll(registrations);
      return NextResponse.json({ success: true });
    }

    // 4. Events Management
    if (action === 'get-events') {
      return NextResponse.json(db.events.getAll());
    }
    if (action === 'create-event') {
      const { event } = body;
      const events = db.events.getAll();
      const newEvent = {
        ...event,
        id: `event-${Date.now()}`,
        number: `Event 0${events.length + 1}`
      };
      events.push(newEvent);
      db.events.saveAll(events);
      return NextResponse.json({ success: true, event: newEvent });
    }
    if (action === 'update-event') {
      const { event } = body;
      const events = db.events.getAll();
      const idx = events.findIndex(e => e.id === event.id);
      if (idx !== -1) {
        events[idx] = { ...events[idx], ...event };
        db.events.saveAll(events);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (action === 'delete-event') {
      const { id } = body;
      let events = db.events.getAll();
      events = events.filter(e => e.id !== id);
      db.events.saveAll(events);
      return NextResponse.json({ success: true });
    }

    // 5. Announcements Management
    if (action === 'get-announcements') {
      return NextResponse.json(db.announcements.getAll());
    }
    if (action === 'create-announcement') {
      const { announcement } = body;
      const announcements = db.announcements.getAll();
      const newAnn = {
        ...announcement,
        id: `ann-${Date.now()}`,
        date: new Date().toISOString()
      };
      announcements.push(newAnn);
      db.announcements.saveAll(announcements);
      return NextResponse.json({ success: true, announcement: newAnn });
    }
    if (action === 'update-announcement') {
      const { announcement } = body;
      const announcements = db.announcements.getAll();
      const idx = announcements.findIndex(a => a.id === announcement.id);
      if (idx !== -1) {
        announcements[idx] = { ...announcements[idx], ...announcement };
        db.announcements.saveAll(announcements);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }
    if (action === 'delete-announcement') {
      const { id } = body;
      let announcements = db.announcements.getAll();
      announcements = announcements.filter(a => a.id !== id);
      db.announcements.saveAll(announcements);
      return NextResponse.json({ success: true });
    }

    // 6. Resources Management
    if (action === 'get-resources') {
      return NextResponse.json(db.resources.getAll());
    }
    if (action === 'create-resource') {
      const { resource } = body;
      const resources = db.resources.getAll();
      const newRes = {
        ...resource,
        id: `res-${Date.now()}`
      };
      resources.push(newRes);
      db.resources.saveAll(resources);
      return NextResponse.json({ success: true, resource: newRes });
    }
    if (action === 'update-resource') {
      const { resource } = body;
      const resources = db.resources.getAll();
      const idx = resources.findIndex(r => r.id === resource.id);
      if (idx !== -1) {
        resources[idx] = { ...resources[idx], ...resource };
        db.resources.saveAll(resources);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    if (action === 'delete-resource') {
      const { id } = body;
      let resources = db.resources.getAll();
      resources = resources.filter(r => r.id !== id);
      db.resources.saveAll(resources);
      return NextResponse.json({ success: true });
    }

    // 7. Verification Requests Management
    if (action === 'get-verifications') {
      return NextResponse.json(db.verificationRequests.getAll());
    }
    if (action === 'update-verification') {
      const { id, status, notes } = body;
      const verifications = db.verificationRequests.getAll();
      const idx = verifications.findIndex(v => v.id === id);
      if (idx !== -1) {
        verifications[idx].status = status || verifications[idx].status;
        verifications[idx].notes = notes !== undefined ? notes : verifications[idx].notes;
        db.verificationRequests.saveAll(verifications);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    // 8. Core Team Management
    if (action === 'get-team') {
      return NextResponse.json(db.coreTeam.getAll());
    }
    if (action === 'create-team-member') {
      const { member } = body;
      const team = db.coreTeam.getAll();
      const newMember = {
        ...member,
        id: `team-${Date.now()}`,
        displayOrder: team.length + 1
      };
      team.push(newMember);
      db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true, member: newMember });
    }
    if (action === 'update-team-member') {
      const { member } = body;
      const team = db.coreTeam.getAll();
      const idx = team.findIndex(t => t.id === member.id);
      if (idx !== -1) {
        team[idx] = { ...team[idx], ...member };
        db.coreTeam.saveAll(team);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }
    if (action === 'delete-team-member') {
      const { id } = body;
      let team = db.coreTeam.getAll();
      team = team.filter(t => t.id !== id);
      db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true });
    }
    if (action === 'reorder-team') {
      const { orders } = body; // Array of { id, displayOrder }
      const team = db.coreTeam.getAll();
      orders.forEach((o: any) => {
        const idx = team.findIndex(t => t.id === o.id);
        if (idx !== -1) {
          team[idx].displayOrder = o.displayOrder;
        }
      });
      team.sort((a, b) => a.displayOrder - b.displayOrder);
      db.coreTeam.saveAll(team);
      return NextResponse.json({ success: true });
    }

    // 9. Collaborations Management
    if (action === 'get-collaborations') {
      return NextResponse.json(db.collaborationRequests.getAll());
    }
    if (action === 'update-collaboration') {
      const { id, status } = body;
      const collaborations = db.collaborationRequests.getAll();
      const idx = collaborations.findIndex(c => c.id === id);
      if (idx !== -1) {
        collaborations[idx].status = status || collaborations[idx].status;
        db.collaborationRequests.saveAll(collaborations);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Collaboration request not found' }, { status: 404 });
    }

    // 10. Website Content CMS Management
    if (action === 'get-content') {
      return NextResponse.json(db.websiteContent.get());
    }
    if (action === 'update-content') {
      const { content } = body;
      db.websiteContent.save(content);
      return NextResponse.json({ success: true });
    }

    // 11. Admin Settings: Change Password
    if (action === 'change-password') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Missing passwords.' }, { status: 400 });
      }

      const admins = db.admins.getAll();
      const admin = admins[0]; // main admin
      const currentHash = hashPassword(currentPassword, admin.salt);
      if (currentHash !== admin.passwordHash) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      admin.salt = generateSalt();
      admin.passwordHash = hashPassword(newPassword, admin.salt);
      db.admins.saveAll(admins);
      return NextResponse.json({ success: true });
    }

    // 12. Notifications Management
    if (action === 'get-notifications') {
      return NextResponse.json(db.notifications.getAll());
    }
    if (action === 'mark-notifications-read') {
      const notifications = db.notifications.getAll();
      notifications.forEach(n => { n.status = 'read'; });
      db.notifications.saveAll(notifications);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action parameter' }, { status: 400 });
  } catch (err) {
    console.error('API Admin Main Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
