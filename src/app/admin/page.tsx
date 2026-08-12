'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Tabs: Dashboard, Registrations, Events, Announcements, Resources, Verification, Core Team, Collaborations, Content, Settings
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Registrations' | 'Events' | 'Announcements' | 'Resources' | 'Verification' | 'CoreTeam' | 'Collaborations' | 'Content' | 'Settings'>('Dashboard');

  // Stats / Dashboard data
  const [stats, setStats] = useState<any>({
    counts: { registrations: 0, events: 0, verifications: 0, announcements: 0, resources: 0, collaborations: 0 },
    recentRegistrations: [],
    recentVerifications: [],
    upcomingEvents: []
  });

  // DB Data
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [websiteContent, setWebsiteContent] = useState<any>({
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    aboutHeading: '',
    aboutDescription: ''
  });
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Crud/View Modals
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [createType, setCreateType] = useState<'Event' | 'Announcement' | 'Resource' | 'TeamMember' | null>(null);

  // Form Fields
  const [eventForm, setEventForm] = useState<any>({
    title: '', month: 'August', date: '', time: 'TBA', venue: 'TBA', description: '', focus: '', outcome: '', speaker: 'TBA', registrationLink: '', status: 'Planned', image: '', format: 'Hands-on Technical Workshop', whatYouWillLearn: ''
  });
  const [announcementForm, setAnnouncementForm] = useState<any>({
    title: '', category: 'General', description: '', status: 'Published', image: ''
  });
  const [resourceForm, setResourceForm] = useState<any>({
    title: '', description: '', category: 'AWS Cloud', difficulty: 'Beginner', officialSource: '', url: '', status: 'Published'
  });
  const [teamForm, setTeamForm] = useState<any>({
    name: '', role: '', bio: '', initials: '', status: 'Published'
  });
  const [contentForm, setContentForm] = useState<any>({
    heroTitle: '', heroSubtitle: '', heroDescription: '', aboutHeading: '', aboutDescription: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  // Action status indicators
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Hydration check
  useEffect(() => {
    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch initial data on login
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchTabItems();
    }
  }, [token, activeTab]);

  // Auth Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        sessionStorage.setItem('adminToken', data.token);
        setToken(data.token);
      } else {
        setLoginError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setLoginError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setToken(null);
  };

  // Helper fetcher
  const apiCall = async (body: any) => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.status === 401) {
        handleLogout();
        return null;
      }
      return data;
    } catch (err) {
      console.error(err);
      setActionError('API network transaction failed.');
      return null;
    }
  };

  const fetchStats = async () => {
    const data = await apiCall({ action: 'get-stats' });
    if (data) {
      setStats(data);
    }
  };

  const fetchTabItems = async () => {
    if (activeTab === 'Registrations') {
      const data = await apiCall({ action: 'get-registrations' });
      if (data) setRegistrations(data);
    } else if (activeTab === 'Events') {
      const data = await apiCall({ action: 'get-events' });
      if (data) setEvents(data);
    } else if (activeTab === 'Announcements') {
      const data = await apiCall({ action: 'get-announcements' });
      if (data) setAnnouncements(data);
    } else if (activeTab === 'Resources') {
      const data = await apiCall({ action: 'get-resources' });
      if (data) setResources(data);
    } else if (activeTab === 'Verification') {
      const data = await apiCall({ action: 'get-verifications' });
      if (data) setVerifications(data);
    } else if (activeTab === 'CoreTeam') {
      const data = await apiCall({ action: 'get-team' });
      if (data) setTeamMembers(data);
    } else if (activeTab === 'Collaborations') {
      const data = await apiCall({ action: 'get-collaborations' });
      if (data) setCollaborations(data);
    } else if (activeTab === 'Content') {
      const data = await apiCall({ action: 'get-content' });
      if (data) {
        setWebsiteContent(data);
        setContentForm(data);
      }
    } else if (activeTab === 'Dashboard') {
      const data = await apiCall({ action: 'get-notifications' });
      if (data) setNotifications(data);
    }
  };

  // CRUD Actions
  // 1. Registrations
  const updateRegStatus = async (id: string, status: string) => {
    const res = await apiCall({ action: 'update-registration', id, status });
    if (res && res.success) {
      fetchTabItems();
      fetchStats();
    }
  };

  const addRegNote = async (id: string, notes: string) => {
    const res = await apiCall({ action: 'update-registration', id, notes });
    if (res && res.success) {
      fetchTabItems();
      setViewItem(null);
    }
  };

  const deleteReg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this registration?')) return;
    const res = await apiCall({ action: 'delete-registration', id });
    if (res && res.success) {
      fetchTabItems();
      setViewItem(null);
    }
  };

  // 2. Events CRUD
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = {
      ...eventForm,
      whatYouWillLearn: eventForm.whatYouWillLearn.split('\n').filter((l: string) => l.trim().length > 0)
    };
    const res = await apiCall({ action: 'create-event', event: formatted });
    if (res && res.success) {
      fetchTabItems();
      setCreateType(null);
      setEventForm({ title: '', month: 'August', date: '', time: 'TBA', venue: 'TBA', description: '', focus: '', outcome: '', speaker: 'TBA', registrationLink: '', status: 'Planned', image: '', format: 'Hands-on Technical Workshop', whatYouWillLearn: '' });
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = {
      ...editItem,
      whatYouWillLearn: Array.isArray(editItem.whatYouWillLearn) 
        ? editItem.whatYouWillLearn 
        : editItem.whatYouWillLearn.split('\n').filter((l: string) => l.trim().length > 0)
    };
    const res = await apiCall({ action: 'update-event', event: formatted });
    if (res && res.success) {
      fetchTabItems();
      setEditItem(null);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const res = await apiCall({ action: 'delete-event', id });
    if (res && res.success) {
      fetchTabItems();
    }
  };

  // 3. Verification CRUD
  const updateVerStatus = async (id: string, status: string) => {
    const res = await apiCall({ action: 'update-verification', id, status });
    if (res && res.success) {
      fetchTabItems();
      fetchStats();
    }
  };

  const addVerNote = async (id: string, notes: string) => {
    const res = await apiCall({ action: 'update-verification', id, notes });
    if (res && res.success) {
      fetchTabItems();
      setViewItem(null);
    }
  };

  // 4. Core Team CRUD
  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiCall({ action: 'create-team-member', member: teamForm });
    if (res && res.success) {
      fetchTabItems();
      setCreateType(null);
      setTeamForm({ name: '', role: '', bio: '', initials: '', status: 'Published' });
    }
  };

  const handleUpdateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiCall({ action: 'update-team-member', member: editItem });
    if (res && res.success) {
      fetchTabItems();
      setEditItem(null);
    }
  };

  const deleteTeamMember = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    const res = await apiCall({ action: 'delete-team-member', id });
    if (res && res.success) {
      fetchTabItems();
    }
  };

  // 5. website content CMS
  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiCall({ action: 'update-content', content: contentForm });
    if (res && res.success) {
      fetchTabItems();
      setActionSuccess('Website CMS content updated successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  // 6. Settings Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsForm.newPassword !== settingsForm.confirmPassword) {
      setActionError('Passwords do not match.');
      setTimeout(() => setActionError(''), 3000);
      return;
    }
    const res = await apiCall({
      action: 'change-password',
      currentPassword: settingsForm.currentPassword,
      newPassword: settingsForm.newPassword
    });
    if (res && res.success) {
      setActionSuccess('Password updated successfully!');
      setSettingsForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setActionSuccess(''), 3000);
    } else {
      setActionError(res.error || 'Failed to update password.');
      setTimeout(() => setActionError(''), 3000);
    }
  };

  // 7. Collaboration
  const updateCollabStatus = async (id: string, status: string) => {
    const res = await apiCall({ action: 'update-collaboration', id, status });
    if (res && res.success) {
      fetchTabItems();
      fetchStats();
    }
  };

  // 8. Notifications read all
  const markNotificationsRead = async () => {
    const res = await apiCall({ action: 'mark-notifications-read' });
    if (res && res.success) {
      fetchTabItems();
    }
  };

  // CSV Exporter
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => {
      return Object.values(item).map(val => {
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Login view
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-center space-y-2">
            <h2 className="font-display font-extrabold text-2xl text-brand-navy tracking-tight">
              AWS SBG CU-UP
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Enter credentials to access the secure administration dashboard.
            </p>
          </div>
          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-650 text-xs text-center font-sans">
                {loginError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 text-xs flex items-center justify-center font-bold"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard main layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* TOP HEADER */}
      <header className="bg-brand-navy border-b border-navy-dark h-16 flex items-center justify-between px-6 text-white shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-display font-black text-sm tracking-tight text-white uppercase">
            AWS SBG Admin Panel
          </span>
          <span className="bg-slate-800 text-[10px] px-2 py-0.5 rounded font-mono text-slate-400">
            v1.0 Staging
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Connected</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-aws-orange hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-grow flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-56 bg-white border-r border-slate-200 shrink-0 p-4 space-y-1 hidden md:block">
          {(
            [
              { id: 'Dashboard', label: 'Dashboard' },
              { id: 'Registrations', label: 'Registrations' },
              { id: 'Events', label: 'Events' },
              { id: 'Announcements', label: 'Announcements' },
              { id: 'Resources', label: 'Resources' },
              { id: 'Verification', label: 'Verification Requests' },
              { id: 'CoreTeam', label: 'Core Team' },
              { id: 'Collaborations', label: 'Collaborations' },
              { id: 'Content', label: 'Website Content' },
              { id: 'Settings', label: 'Settings' }
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setFilterStatus('All');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold tracking-wide rounded transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-brand-navy font-bold border-l-3 border-aws-orange'
                    : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-grow overflow-y-auto p-6 space-y-6">
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-semibold text-center font-sans">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-650 text-xs font-semibold text-center font-sans">
              {actionError}
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-8">
              {/* Stats overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-5 rounded-md shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">Total Registrations</span>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.counts.registrations}</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-md shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">Upcoming Events</span>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.counts.events}</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-md shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">Pending Verifications</span>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.counts.verifications}</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-md shadow-sm space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-display">Published Resources</span>
                  <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.counts.resources}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Registrations */}
                <div className="bg-white border border-slate-200 p-6 rounded-md shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-slate-900">Recent Registrations</h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {stats.recentRegistrations.length > 0 ? (
                      stats.recentRegistrations.map((reg: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{reg.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{reg.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-sans ${
                            reg.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-orange-50 text-aws-orange border border-orange-200'
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 py-4 text-center">No student registrations found.</p>
                    )}
                  </div>
                </div>

                {/* System Notifications */}
                <div className="bg-white border border-slate-200 p-6 rounded-md shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-slate-900">System Notifications</h3>
                    <button
                      onClick={markNotificationsRead}
                      className="text-[10px] text-brand-navy hover:text-aws-orange font-bold uppercase tracking-wider"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif: any, idx: number) => (
                        <div key={idx} className="py-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{notif.title}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${notif.status === 'unread' ? 'bg-aws-orange' : 'bg-transparent'}`}></span>
                          </div>
                          <p className="text-[11px] text-slate-505 leading-relaxed">{notif.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 py-4 text-center">No notifications available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRATIONS MANAGEMENT */}
          {activeTab === 'Registrations' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-slate-900">User Registrations</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Manage student registration applications for the local builder group.</p>
                </div>
                <button
                  onClick={() => exportToCSV(registrations, 'registrations')}
                  className="btn-secondary py-1.5 text-[11px]"
                >
                  Export to CSV
                </button>
              </div>

              {/* Filters & search */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email..."
                  className="px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange w-60"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="min-w-full divide-y divide-slate-200 text-xs font-sans">
                  <thead className="bg-slate-50 font-display font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Program</th>
                      <th className="px-4 py-3 text-left">Year</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                    {registrations
                      .filter(r => {
                        const matchesQuery = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.email.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
                        return matchesQuery && matchesStatus;
                      })
                      .map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{reg.name}</td>
                          <td className="px-4 py-3 font-mono text-[11px]">{reg.email}</td>
                          <td className="px-4 py-3">{reg.program}</td>
                          <td className="px-4 py-3">{reg.year}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              reg.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : reg.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-aws-orange border border-orange-200'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => setViewItem(reg)}
                              className="text-brand-navy hover:text-aws-orange font-bold"
                            >
                              View
                            </button>
                            <button
                              onClick={() => updateRegStatus(reg.id, 'Approved')}
                              className="text-emerald-600 hover:text-emerald-700 font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateRegStatus(reg.id, 'Rejected')}
                              className="text-red-500 hover:text-red-600 font-bold"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EVENTS MANAGEMENT */}
          {activeTab === 'Events' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-slate-900">Events Management</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Publish and orchestrate technical bootcamps and workshop calendars.</p>
                </div>
                <button
                  onClick={() => setCreateType('Event')}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Create Event
                </button>
              </div>

              {/* Event card grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div key={event.id} className="border border-slate-200 rounded-md p-5 flex flex-col justify-between h-full bg-slate-50 space-y-4 hover:border-aws-orange transition-colors">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          event.status === 'Draft' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-orange-50 text-aws-orange border border-orange-200'
                        }`}>
                          {event.status}
                        </span>
                        <span className="font-mono text-slate-400 font-bold">{event.number}</span>
                      </div>
                      <h4 className="font-display font-bold text-slate-900 text-sm leading-snug">{event.title}</h4>
                      <p className="text-slate-500 leading-relaxed font-sans line-clamp-3">{event.description || event.overview}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-200/50 flex items-center justify-between gap-4 text-[10px] font-sans">
                      <button
                        onClick={() => setEditItem(event)}
                        className="text-brand-navy hover:text-aws-orange font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-red-500 hover:text-red-600 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RESOURCES MANAGEMENT */}
          {activeTab === 'Resources' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-slate-900">Learning Resources</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Publish documentation links and AWS preparation guides.</p>
                </div>
                <button
                  onClick={() => setCreateType('Resource')}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Add Resource
                </button>
              </div>

              {/* Resources list */}
              <div className="divide-y divide-slate-100 text-xs">
                {resources.map((res) => (
                  <div key={res.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm font-display">{res.title}</span>
                        <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-sans uppercase">{res.category}</span>
                      </div>
                      <p className="text-slate-500 font-sans text-xs leading-relaxed max-w-xl">{res.description}</p>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px]">
                      <button
                        onClick={() => setEditItem(res)}
                        className="text-brand-navy hover:text-aws-orange font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this resource?')) {
                            const result = await apiCall({ action: 'delete-resource', id: res.id });
                            if (result && result.success) fetchTabItems();
                          }
                        }}
                        className="text-red-500 hover:text-red-600 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: VERIFICATION REQUESTS */}
          {activeTab === 'Verification' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base text-slate-900">Verification Requests</h3>
                <p className="text-[11px] text-slate-400 font-sans">Manage academic audit logs and group standing verification checks.</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="min-w-full divide-y divide-slate-200 text-xs font-sans">
                  <thead className="bg-slate-50 font-display font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Requester Name</th>
                      <th className="px-4 py-3 text-left">Organization</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                    {verifications.map((ver) => (
                      <tr key={ver.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{ver.name}</td>
                        <td className="px-4 py-3 font-medium">{ver.organization}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{ver.email}</td>
                        <td className="px-4 py-3">{ver.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            ver.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : ver.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-orange-50 text-aws-orange border border-orange-200'
                          }`}>
                            {ver.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => setViewItem(ver)}
                            className="text-brand-navy hover:text-aws-orange font-bold"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => updateVerStatus(ver.id, 'Verified')}
                            className="text-emerald-600 hover:text-emerald-700 font-bold"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => updateVerStatus(ver.id, 'Rejected')}
                            className="text-red-500 hover:text-red-600 font-bold"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: CORE TEAM MANAGEMENT */}
          {activeTab === 'CoreTeam' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-slate-900">Core Team Coordinators</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Manage coordinator bios, role titles, and display order.</p>
                </div>
                <button
                  onClick={() => setCreateType('TeamMember')}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  Add Team Member
                </button>
              </div>

              {/* Members listing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {teamMembers.map((member) => (
                  <div key={member.id} className="border border-slate-200 rounded-md p-5 bg-slate-50 flex flex-col justify-between items-center text-center space-y-4 hover:border-aws-orange transition-colors">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-display font-extrabold text-xs text-brand-navy flex-shrink-0 mx-auto">
                        {member.initials}
                      </div>
                      <div className="w-4 h-[2px] bg-aws-orange mx-auto my-2"></div>
                      <h4 className="font-display font-semibold text-sm text-slate-900 leading-none">{member.name}</h4>
                      <p className="text-[11px] text-slate-500 font-sans mt-2">{member.role}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 w-full flex items-center justify-between gap-4 text-[10px] font-sans">
                      <button
                        onClick={() => setEditItem(member)}
                        className="text-brand-navy hover:text-aws-orange font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTeamMember(member.id)}
                        className="text-red-500 hover:text-red-600 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: COLLABORATIONS */}
          {activeTab === 'Collaborations' && (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-base text-slate-900">Collaboration Requests</h3>
                <p className="text-[11px] text-slate-400 font-sans">Manage session requests and organizational partnerships.</p>
              </div>

              {/* Requests list */}
              <div className="divide-y divide-slate-100 text-xs">
                {collaborations.map((collab) => (
                  <div key={collab.id} className="py-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm font-display">{collab.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{collab.organization} &bull; {collab.email}</p>
                      </div>
                      <select
                        value={collab.status}
                        onChange={(e) => updateCollabStatus(collab.id, e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded focus:outline-none text-[10px] font-sans bg-white font-semibold"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Discussion">In Discussion</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <p className="text-slate-650 leading-relaxed font-sans bg-slate-50 p-3 rounded border border-slate-100">{collab.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: WEBSITE CONTENT CMS */}
          {activeTab === 'Content' && (
            <form onSubmit={handleUpdateContent} className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-6">
              <div className="space-y-1 border-b border-slate-100 pb-4">
                <h3 className="font-display font-bold text-base text-slate-900">Website Content CMS</h3>
                <p className="text-[11px] text-slate-400 font-sans">Edit landing page copywriting descriptions safely without changing code.</p>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Heading</label>
                    <input
                      type="text"
                      value={contentForm.heroTitle}
                      onChange={(e) => setContentForm({ ...contentForm, heroTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Subtitle</label>
                    <input
                      type="text"
                      value={contentForm.heroSubtitle}
                      onChange={(e) => setContentForm({ ...contentForm, heroSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Description (Max 2 lines)</label>
                  <textarea
                    rows={2}
                    value={contentForm.heroDescription}
                    onChange={(e) => setContentForm({ ...contentForm, heroDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">About Editorial Heading</label>
                  <input
                    type="text"
                    value={contentForm.aboutHeading}
                    onChange={(e) => setContentForm({ ...contentForm, aboutHeading: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">About Description Paragraph</label>
                  <textarea
                    rows={4}
                    value={contentForm.aboutDescription}
                    onChange={(e) => setContentForm({ ...contentForm, aboutDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button type="submit" className="btn-primary py-2 px-6 text-xs font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === 'Settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Card */}
              <div className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-4 text-xs font-sans">
                <h3 className="font-display font-bold text-base text-slate-900 border-b border-slate-100 pb-3">Admin Profile</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase tracking-wider">Role</span>
                    <p className="font-bold text-slate-800 mt-0.5 text-sm">System Administrator</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block uppercase tracking-wider">Default Username</span>
                    <p className="font-semibold text-slate-800 mt-0.5">admin</p>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-md shadow-sm p-6 space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900 border-b border-slate-100 pb-3">Change Password</h3>
                <div className="space-y-3 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Current Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.currentPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">New Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.confirmPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange text-sm font-sans"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="btn-primary py-2 px-6 text-xs font-bold">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900">Record Details</h3>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* If Registration details */}
            {viewItem.interests && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Name</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.fullName || viewItem.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Email</span>
                    <p className="font-mono text-slate-800 mt-0.5 select-all">{viewItem.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Program</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.program}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Year / Experience</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.year} / {viewItem.experienceLevel || viewItem.experience}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Interests</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewItem.interests.map((int: string, i: number) => (
                      <span key={i} className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium">{int}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Internal Note</span>
                  <textarea
                    rows={3}
                    defaultValue={viewItem.notes}
                    onBlur={(e) => addRegNote(viewItem.id, e.target.value)}
                    placeholder="Add notes (auto-saves on focus blur)..."
                    className="w-full p-2 border border-slate-200 rounded font-sans text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* If Verification details */}
            {viewItem.reason && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Requester Name</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Email</span>
                    <p className="font-mono text-slate-800 mt-0.5 select-all">{viewItem.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Organization</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.organization}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Reason</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.reason}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Details</span>
                  <p className="text-slate-650 leading-relaxed font-sans bg-slate-50 p-3 rounded border border-slate-100">{viewItem.details}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-slate-450 block uppercase tracking-wider text-[10px]">Internal Audit Note</span>
                  <textarea
                    rows={3}
                    defaultValue={viewItem.notes}
                    onBlur={(e) => addVerNote(viewItem.id, e.target.value)}
                    placeholder="Add audit notes (auto-saves on focus blur)..."
                    className="w-full p-2 border border-slate-200 rounded font-sans text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewItem(null)} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT/RESOURCE MODAL */}
      {createType === 'Event' && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900">Create planned community event</h3>
              <button type="button" onClick={() => setCreateType(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Month</label>
                  <select
                    value={eventForm.month}
                    onChange={(e) => setEventForm({ ...eventForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none bg-white"
                  >
                    {['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Format</label>
                  <input
                    type="text"
                    value={eventForm.format}
                    onChange={(e) => setEventForm({ ...eventForm, format: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Description / Overview</label>
                <textarea
                  rows={2}
                  required
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Key Focus Topics</label>
                <input
                  type="text"
                  required
                  value={eventForm.focus}
                  onChange={(e) => setEventForm({ ...eventForm, focus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                  placeholder="e.g. IAM, EC2, S3, Static Web"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Learning Outcome</label>
                <input
                  type="text"
                  required
                  value={eventForm.outcome}
                  onChange={(e) => setEventForm({ ...eventForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">What You Will Learn (One per line)</label>
                <textarea
                  rows={3}
                  value={eventForm.whatYouWillLearn}
                  onChange={(e) => setEventForm({ ...eventForm, whatYouWillLearn: e.target.value })}
                  placeholder="e.g. Designing instances&#10;Triggering functions"
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Publish Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Planned">Planned</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button type="button" onClick={() => setCreateType(null)} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-bold">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL (Generic handler depending on editItem type) */}
      {editItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <form onSubmit={handleUpdateEvent} className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900">Edit Event</h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Title</label>
                <input
                  type="text"
                  required
                  value={editItem.title}
                  onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Month</label>
                  <select
                    value={editItem.month}
                    onChange={(e) => setEditItem({ ...editItem, month: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none bg-white"
                  >
                    {['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Format</label>
                  <input
                    type="text"
                    value={editItem.format}
                    onChange={(e) => setEditItem({ ...editItem, format: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Description / Overview</label>
                <textarea
                  rows={2}
                  required
                  value={editItem.description || editItem.overview}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value, overview: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Key Focus Topics</label>
                <input
                  type="text"
                  required
                  value={editItem.focus}
                  onChange={(e) => setEditItem({ ...editItem, focus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Learning Outcome</label>
                <input
                  type="text"
                  required
                  value={editItem.outcome}
                  onChange={(e) => setEditItem({ ...editItem, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">What You Will Learn (One per line)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editItem.whatYouWillLearn) ? editItem.whatYouWillLearn.join('\n') : editItem.whatYouWillLearn}
                  onChange={(e) => setEditItem({ ...editItem, whatYouWillLearn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Publish Status</label>
                  <select
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none bg-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Planned">Planned</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button type="button" onClick={() => setEditItem(null)} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-bold">
                Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
