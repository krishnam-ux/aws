'use client';

import { useState, useEffect } from 'react';
import { siteConfig } from '@/data/siteConfig';

interface CommunityEvent {
  id: string;
  number: string;
  month: string;
  title: string;
  focus: string;
  outcome: string;
  overview: string;
  format: string;
  whatYouWillLearn: string[] | string;
  status: string;
  date?: string;
  time?: string;
  venue?: string;
  speaker?: string;
  registrationLink?: string;
  image?: string;
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Tabs structure matching user specifications
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Registrations' | 'Verification' | 'Collaborations' | 'Events' | 'Announcements' | 'Resources' | 'CoreTeam' | 'Content' | 'Settings'>('Dashboard');

  // Stats / Dashboard data
  const [stats, setStats] = useState<any>({
    counts: { registrations: 0, events: 0, verifications: 0, announcements: 0, resources: 0, collaborations: 0 },
    recentRegistrations: [],
    recentVerifications: [],
    upcomingEvents: []
  });

  // DB Data
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
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
      whatYouWillLearn: typeof eventForm.whatYouWillLearn === 'string'
        ? eventForm.whatYouWillLearn.split('\n').filter((l: string) => l.trim().length > 0)
        : eventForm.whatYouWillLearn
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
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-[#E2E8F0] shadow-sm">
          <div className="text-center space-y-2">
            <h2 className="font-display font-extrabold text-2xl text-[#111827] tracking-tight">
              AWS SBG CU-UP
            </h2>
            <p className="text-xs text-[#64748B] font-sans">
              Enter credentials to access the secure administration dashboard.
            </p>
          </div>
          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-605 text-xs text-center font-sans">
                {loginError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#111827] uppercase tracking-wider block font-display">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] text-sm font-sans"
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#111827] uppercase tracking-wider block font-display">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] text-sm font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF9900] hover:bg-[#E08800] text-white py-2.5 text-xs flex items-center justify-center font-bold rounded cursor-pointer transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Active navigation checker helper
  const getNavClass = (tabId: typeof activeTab) => {
    const isActive = activeTab === tabId;
    return `w-full text-left px-3 py-2 text-xs font-semibold tracking-wide rounded flex items-center space-x-2.5 transition-colors border-l-4 ${
      isActive
        ? 'bg-[#152e46] text-white font-bold border-l-[#FF9900]'
        : 'text-[#64748B] hover:text-white hover:bg-[#0c2438] border-l-transparent'
    }`;
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex flex-col font-sans text-[#111827]">
      {/* 2. ADMIN HEADER */}
      <header className="bg-white border-b border-[#E2E8F0] h-16 flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center space-x-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded hover:bg-slate-100 md:hidden"
          >
            <svg className="h-5 w-5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="font-display font-extrabold text-sm tracking-tight text-[#111827]">
              AWS SBG CU-UP
            </span>
            <span className="text-[10px] text-[#64748B] font-medium hidden sm:inline">|</span>
            <span className="text-xs text-[#64748B] font-medium hidden sm:inline">Admin Portal</span>
            <span className="bg-orange-50 border border-orange-200 text-[#FF9900] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
              ADMIN
            </span>
          </div>
        </div>

        {/* Global Search Center */}
        <div className="hidden md:flex items-center flex-grow max-w-md mx-8 relative">
          <svg className="h-4 w-4 text-[#64748B] absolute left-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search registrations, events, resources..."
            className="w-full pl-9 pr-4 py-1.5 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA]"
          />
        </div>

        {/* Right Section Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-[#FF9900] hover:text-[#E08800] border border-[#FF9900]/20 hover:border-[#FF9900] px-3 py-1.5 rounded transition-colors cursor-pointer hidden sm:block"
          >
            Logout
          </button>

          {/* Notification Alert Trigger */}
          <button
            onClick={() => setActiveTab('Dashboard')}
            className="relative p-1.5 text-[#64748B] hover:text-[#111827] hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.some(n => n.status === 'unread') && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#FF9900]"></span>
            )}
          </button>

          {/* Admin profile drop-down container */}
          <div className="relative font-sans text-xs">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-2.5 p-1 rounded hover:bg-slate-50 cursor-pointer"
            >
              <div className="h-7 w-7 rounded-full bg-slate-100 border border-[#E2E8F0] flex items-center justify-center font-display font-extrabold text-[11px] text-brand-navy">
                A
              </div>
              <div className="text-left hidden sm:block">
                <p className="font-semibold text-slate-800 leading-none">Administrator</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">Manager</p>
              </div>
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E8F0] rounded shadow-lg py-1 z-40">
                <button
                  onClick={() => { setActiveTab('Settings'); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F6F8FA] text-slate-700 font-medium cursor-pointer"
                >
                  Profile / Settings
                </button>
                <div className="h-[1px] bg-slate-100 w-full my-1"></div>
                <button
                  onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F6F8FA] text-[#FF9900] font-bold cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <div className="flex-grow flex overflow-hidden">
        {/* 3. SIDEBAR NAVIGATION */}
        <aside
          className={`bg-[#081A2A] text-slate-350 shrink-0 p-4 flex flex-col justify-between transition-all duration-200 z-25 ${
            isSidebarCollapsed ? 'w-16 items-center' : 'w-64'
          } hidden md:flex`}
        >
          <div className="space-y-6 w-full">
            {/* Header info inside sidebar */}
            {!isSidebarCollapsed && (
              <div className="px-3 py-2 text-xs font-display">
                <span className="font-extrabold text-white tracking-widest uppercase block">AWS STUDENT GROUP</span>
                <span className="text-[#64748B] font-bold mt-1 block">CMS CONSOLE</span>
              </div>
            )}

            {/* Section groups */}
            <div className="space-y-4">
              {/* Group: Dashboard */}
              <div className="space-y-1">
                <button onClick={() => setActiveTab('Dashboard')} className={getNavClass('Dashboard')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </button>
              </div>

              {/* Group: Community */}
              <div className="space-y-1">
                {!isSidebarCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block">Community</span>}
                <button onClick={() => setActiveTab('Registrations')} className={getNavClass('Registrations')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Registrations</span>}
                </button>
                <button onClick={() => setActiveTab('Verification')} className={getNavClass('Verification')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Verification Requests</span>}
                </button>
                <button onClick={() => setActiveTab('Collaborations')} className={getNavClass('Collaborations')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Collaborations</span>}
                </button>
              </div>

              {/* Group: Content */}
              <div className="space-y-1">
                {!isSidebarCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block">Content</span>}
                <button onClick={() => setActiveTab('Events')} className={getNavClass('Events')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Events</span>}
                </button>
                <button onClick={() => setActiveTab('Announcements')} className={getNavClass('Announcements')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Announcements</span>}
                </button>
                <button onClick={() => setActiveTab('Resources')} className={getNavClass('Resources')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {!isSidebarCollapsed && <span>Resources</span>}
                </button>
              </div>

              {/* Group: Organization */}
              <div className="space-y-1">
                {!isSidebarCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block">Organization</span>}
                <button onClick={() => setActiveTab('CoreTeam')} className={getNavClass('CoreTeam')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Core Team</span>}
                </button>
                <button onClick={() => setActiveTab('Content')} className={getNavClass('Content')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Website Content</span>}
                </button>
              </div>

              {/* Group: System */}
              <div className="space-y-1">
                {!isSidebarCollapsed && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block">System</span>}
                <button onClick={() => setActiveTab('Settings')} className={getNavClass('Settings')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Settings</span>}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs font-semibold tracking-wide rounded flex items-center space-x-2.5 transition-colors border-l-4 border-l-transparent text-[#FF9900] hover:text-white hover:bg-[#0c2438] cursor-pointer"
                >
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {!isSidebarCollapsed && <span>Logout</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Collapse sidebar trigger for desktop */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full py-2 hover:bg-[#0c2438] rounded text-[#64748B] hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-[#152e46]/20 mt-6"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isSidebarCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
            </svg>
          </button>
        </aside>

        {/* 17. RESPONSIVE COMPACT LAYOUT CONTAINER */}
        <main className="flex-grow overflow-y-auto p-6 lg:p-8 space-y-8 bg-[#F6F8FA]">
          {/* Action alerts */}
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 rounded text-emerald-800 text-xs font-semibold text-center shadow-sm">
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-650 text-xs font-semibold text-center shadow-sm">
              {actionError}
            </div>
          )}

          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-8">
              {/* Header section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div className="space-y-1.5">
                  <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827] tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-xs text-[#64748B] font-sans leading-relaxed">
                    Manage community activity, registrations and website content.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#64748B] bg-white border border-[#E2E8F0] px-2.5 py-1 rounded shadow-sm">
                  Last updated: Just now
                </div>
              </div>

              {/* 5. STATISTICS METRICS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Registrations', value: stats.counts.registrations, desc: 'Enrolled student profiles', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z' },
                  { label: 'Upcoming Events', value: stats.counts.events, desc: 'Active calendar listings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z' },
                  { label: 'Pending Verifications', value: stats.counts.verifications, desc: 'Awaiting coordination audit', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04z' },
                  { label: 'Published Resources', value: stats.counts.resources, desc: 'AWS Skill ramp-up links', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253z' }
                ].map((card, idx) => (
                  <div key={idx} className="bg-white border border-[#E2E8F0] p-5 rounded-lg shadow-sm space-y-3 relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] font-display block">
                        {card.label}
                      </span>
                      <p className="text-3xl font-extrabold text-[#111827] leading-none">
                        {card.value || 0}
                      </p>
                      <span className="text-[10px] text-[#64748B] block font-sans">
                        {card.desc}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-[#E2E8F0] rounded-md text-[#64748B]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* 6. QUICK ACTIONS */}
              <div className="bg-white border border-[#E2E8F0] p-5 rounded-lg shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] font-display">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setActiveTab('Events'); setCreateType('Event'); }}
                    className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
                  >
                    + Add Event
                  </button>
                  <button
                    onClick={() => { setActiveTab('Announcements'); setCreateType('Announcement'); }}
                    className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
                  >
                    + Add Announcement
                  </button>
                  <button
                    onClick={() => { setActiveTab('Resources'); setCreateType('Resource'); }}
                    className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
                  >
                    + Add Resource
                  </button>
                  <button
                    onClick={() => setActiveTab('Registrations')}
                    className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
                  >
                    View Registrations
                  </button>
                </div>
              </div>

              {/* 7. RECENT ACTIVITY GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Registrations Card */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-lg shadow-sm space-y-5">
                  <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#E2E8F0] pb-3">
                    Recent Registrations
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {stats.recentRegistrations.length > 0 ? (
                      stats.recentRegistrations.map((reg: any, idx: number) => (
                        <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded transition-colors">
                          <div>
                            <p className="font-bold text-[#111827]">{reg.name}</p>
                            <p className="text-[10px] text-[#64748B] font-mono mt-0.5">{reg.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-sans ${
                            reg.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-[#64748B] space-y-2">
                        <svg className="h-8 w-8 mx-auto text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
                        </svg>
                        <p className="text-xs">No registrations yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Activity Log Card */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-lg shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <h3 className="font-display font-bold text-sm text-[#111827]">
                      System Activity
                    </h3>
                    <button
                      onClick={markNotificationsRead}
                      className="text-[9px] text-[#64748B] hover:text-[#FF9900] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Clear alerts
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto pr-2">
                    {notifications.length > 0 ? (
                      notifications.map((notif: any, idx: number) => (
                        <div key={idx} className="py-3 space-y-1 hover:bg-slate-50 px-2 rounded transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#111827]">{notif.title}</span>
                            <span className={`h-1.5 w-1.5 rounded-full ${notif.status === 'unread' ? 'bg-[#FF9900]' : 'bg-transparent'}`}></span>
                          </div>
                          <p className="text-[11px] text-[#64748B] leading-relaxed">{notif.description}</p>
                          <span className="text-[9px] text-[#64748B] block font-mono">{new Date(notif.date).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-[#64748B] space-y-2">
                        <svg className="h-8 w-8 mx-auto text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11" />
                        </svg>
                        <p className="text-xs">No active logs logged.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 8. UPCOMING EVENTS LOG */}
              <div className="bg-white border border-[#E2E8F0] p-6 rounded-lg shadow-sm space-y-5">
                <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#E2E8F0] pb-3">
                  Upcoming Events
                </h3>
                <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                    <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Month</th>
                        <th className="px-4 py-2.5 text-left">Event Title</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                      {stats.upcomingEvents.length > 0 ? (
                        stats.upcomingEvents.map((event: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-700">{event.month}</td>
                            <td className="px-4 py-3 font-medium text-[#111827]">{event.title}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-bold bg-orange-50 border border-orange-200 text-[#FF9900] uppercase tracking-wider">
                                {event.status || 'PLANNED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => { setViewItem(event); setActiveTab('Events'); }}
                                className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-[#64748B]">No planned events scheduled.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTRATIONS TABLE */}
          {activeTab === 'Registrations' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div className="space-y-1">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">User Registrations</h2>
                  <p className="text-xs text-[#64748B] font-sans">Manage student community enrollment applications.</p>
                </div>
                <button
                  onClick={() => exportToCSV(registrations, 'registrations')}
                  className="px-3.5 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded transition-colors cursor-pointer"
                >
                  Export CSV
                </button>
              </div>

              {/* Search & filters */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email..."
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] w-64 bg-[#F6F8FA]"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-white font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">NEW</option>
                  <option value="Approved">APPROVED</option>
                  <option value="Rejected">REJECTED</option>
                </select>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">University</th>
                      <th className="px-4 py-3 text-left">Program</th>
                      <th className="px-4 py-3 text-left">Year</th>
                      <th className="px-4 py-3 text-left">Experience</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {registrations
                      .filter(r => {
                        const matchesQuery = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.email.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
                        return matchesQuery && matchesStatus;
                      })
                      .map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-[#111827]">{reg.name}</td>
                          <td className="px-4 py-3 font-mono text-[11px] select-all">{reg.email}</td>
                          <td className="px-4 py-3 max-w-xs truncate">{reg.university}</td>
                          <td className="px-4 py-3">{reg.program}</td>
                          <td className="px-4 py-3 font-medium">{reg.year}</td>
                          <td className="px-4 py-3">{reg.experience}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              reg.status === 'Approved' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : reg.status === 'Rejected' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button onClick={() => setViewItem(reg)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                              View
                            </button>
                            <button onClick={() => updateRegStatus(reg.id, 'Approved')} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer">
                              Approve
                            </button>
                            <button onClick={() => updateRegStatus(reg.id, 'Rejected')} className="text-red-500 hover:text-red-600 font-bold cursor-pointer">
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

          {/* TAB 5: EVENTS CMS PAGE */}
          {activeTab === 'Events' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="space-y-1">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">Events</h2>
                  <p className="text-xs text-[#64748B] font-sans">Manage community event listing registries.</p>
                </div>
                <button
                  onClick={() => setCreateType('Event')}
                  className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  + Create Event
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {['All', 'Draft', 'Planned', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 border rounded font-medium transition-colors cursor-pointer ${
                      filterStatus === status
                        ? 'border-[#FF9900] bg-orange-50 text-[#FF9900]'
                        : 'border-[#E2E8F0] bg-white text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Events CMS Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Event</th>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Format</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {events
                      .filter(e => filterStatus === 'All' || e.status === filterStatus)
                      .map((event) => (
                        <tr key={event.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-[#111827]">{event.title}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{event.month}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              event.status === 'Draft' 
                                ? 'bg-slate-100 text-slate-550 border border-slate-200' 
                                : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{event.format}</td>
                          <td className="px-4 py-3 text-right space-x-3">
                            <button onClick={() => setEditItem(event)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                              Edit
                            </button>
                            <button onClick={() => deleteEvent(event.id)} className="text-red-500 hover:text-red-600 font-bold cursor-pointer">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS CMS */}
          {activeTab === 'Announcements' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="space-y-1">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">Announcements</h2>
                  <p className="text-xs text-[#64748B] font-sans">Manage community updates and public broadcast postings.</p>
                </div>
                <button
                  onClick={() => setCreateType('Announcement')}
                  className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  + New Announcement
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {announcements.length > 0 ? (
                      announcements.map((ann) => (
                        <tr key={ann.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-[#111827]">{ann.title}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{ann.category}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              ann.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-205' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {ann.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button onClick={() => setEditItem(ann)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">Edit</button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete announcement?')) {
                                  const r = await apiCall({ action: 'delete-announcement', id: ann.id });
                                  if (r && r.success) fetchTabItems();
                                }
                              }}
                              className="text-red-500 hover:text-red-650 font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-[#64748B]">No announcements published yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: RESOURCES */}
          {activeTab === 'Resources' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="space-y-1">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">Resources</h2>
                  <p className="text-xs text-[#64748B] font-sans">Organize documentation hubs and learning pathway files.</p>
                </div>
                <button
                  onClick={() => setCreateType('Resource')}
                  className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  + Add Resource
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Resource</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Difficulty</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {resources.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-[#111827]">{res.title}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{res.category}</td>
                        <td className="px-4 py-3 font-medium">{res.difficulty}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            res.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => setEditItem(res)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">Edit</button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete resource?')) {
                                const r = await apiCall({ action: 'delete-resource', id: res.id });
                                if (r && r.success) fetchTabItems();
                              }
                            }}
                            className="text-red-500 hover:text-red-650 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: VERIFICATION REQUESTS */}
          {activeTab === 'Verification' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-lg text-[#111827]">Verification Requests</h2>
                <p className="text-xs text-[#64748B] font-sans">Validate community status checks and academic verification credentials.</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Organization</th>
                      <th className="px-4 py-3 text-left">Requester</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-655 bg-white">
                    {verifications.map((ver) => (
                      <tr key={ver.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-[#111827]">{ver.organization}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{ver.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] select-all">{ver.email}</td>
                        <td className="px-4 py-3">{ver.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            ver.status === 'Verified' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold' 
                              : ver.status === 'Rejected' 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                          }`}>
                            {ver.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => setViewItem(ver)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                            View
                          </button>
                          <button onClick={() => updateVerStatus(ver.id, 'Verified')} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer">
                            Verify
                          </button>
                          <button onClick={() => updateVerStatus(ver.id, 'Rejected')} className="text-red-500 hover:text-red-655 font-bold cursor-pointer">
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

          {/* TAB 9: CORE TEAM */}
          {activeTab === 'CoreTeam' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="space-y-1">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">Core Team</h2>
                  <p className="text-xs text-[#64748B] font-sans">Add, remove or update community student coordinators.</p>
                </div>
                <button
                  onClick={() => setCreateType('TeamMember')}
                  className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
                >
                  + Add Team Member
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-[#111827]">{member.name}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{member.role}</td>
                        <td className="px-4 py-3 font-mono">{member.displayOrder}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            member.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => setEditItem(member)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">Edit</button>
                          <button onClick={() => deleteTeamMember(member.id)} className="text-red-500 hover:text-red-600 font-bold cursor-pointer">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 10: COLLABORATIONS */}
          {activeTab === 'Collaborations' && (
            <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-lg text-[#111827]">Collaborations</h2>
                <p className="text-xs text-[#64748B] font-sans">Review message requests from academic partners or guest speakers.</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                  <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 text-left">Organization</th>
                      <th className="px-4 py-3 text-left">Requester</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                    {collaborations.map((collab) => (
                      <tr key={collab.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-[#111827]">{collab.organization}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{collab.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] select-all">{collab.email}</td>
                        <td className="px-4 py-3">{collab.type}</td>
                        <td className="px-4 py-3 font-medium">{collab.status}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => setViewItem({ ...collab, details: collab.message, reason: collab.type })} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 11: WEBSITE CONTENT CMS */}
          {activeTab === 'Content' && (
            <form onSubmit={handleUpdateContent} className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
              <div className="space-y-1 border-b border-[#E2E8F0] pb-4">
                <h2 className="font-display font-extrabold text-lg text-[#111827]">Website Content CMS</h2>
                <p className="text-xs text-[#64748B] font-sans">Modify landing page hero titles and about descriptions dynamically.</p>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Heading</label>
                    <input
                      type="text"
                      value={contentForm.heroTitle}
                      onChange={(e) => setContentForm({ ...contentForm, heroTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Subtitle</label>
                    <input
                      type="text"
                      value={contentForm.heroSubtitle}
                      onChange={(e) => setContentForm({ ...contentForm, heroSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Hero Description</label>
                  <textarea
                    rows={2}
                    value={contentForm.heroDescription}
                    onChange={(e) => setContentForm({ ...contentForm, heroDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">About Editorial Heading</label>
                  <input
                    type="text"
                    value={contentForm.aboutHeading}
                    onChange={(e) => setContentForm({ ...contentForm, aboutHeading: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">About Description Paragraph</label>
                  <textarea
                    rows={4}
                    value={contentForm.aboutDescription}
                    onChange={(e) => setContentForm({ ...contentForm, aboutDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button type="submit" className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm cursor-pointer transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 12: SETTINGS */}
          {activeTab === 'Settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-5 text-xs font-sans">
                <h2 className="font-display font-extrabold text-lg text-[#111827] border-b border-[#E2E8F0] pb-3">Admin Profile</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase tracking-wider">Role</span>
                    <p className="font-bold text-slate-800 mt-0.5 text-sm">System Administrator</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block uppercase tracking-wider">Default Username</span>
                    <p className="font-semibold text-slate-850 mt-0.5">admin</p>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <form onSubmit={handlePasswordChange} className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-5">
                <h2 className="font-display font-extrabold text-lg text-[#111827] border-b border-[#E2E8F0] pb-3">Change Password</h2>
                <div className="space-y-3 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Current Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.currentPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">New Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={settingsForm.confirmPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm cursor-pointer transition-colors">
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
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-sm text-[#111827]">Record Details</h3>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
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
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Name</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Email</span>
                    <p className="font-mono text-slate-800 mt-0.5 select-all">{viewItem.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Program</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.program}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Year / Experience</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.year} / {viewItem.experience}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Interests</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewItem.interests.map((int: string, i: number) => (
                      <span key={i} className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium">{int}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Internal Note</span>
                  <textarea
                    rows={3}
                    defaultValue={viewItem.notes}
                    onBlur={(e) => addRegNote(viewItem.id, e.target.value)}
                    placeholder="Add notes (saves on blur)..."
                    className="w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* If Verification details */}
            {viewItem.reason && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Requester Name</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Email</span>
                    <p className="font-mono text-slate-800 mt-0.5 select-all">{viewItem.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Organization</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.organization}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Reason</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.reason}</p>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Details</span>
                  <p className="text-slate-650 leading-relaxed font-sans bg-slate-50 p-3 rounded border border-slate-100">{viewItem.details}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Internal Audit Note</span>
                  <textarea
                    rows={3}
                    defaultValue={viewItem.notes}
                    onBlur={(e) => addVerNote(viewItem.id, e.target.value)}
                    placeholder="Add audit notes (saves on blur)..."
                    className="w-full p-2 border border-[#E2E8F0] rounded font-sans text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button onClick={() => setViewItem(null)} className="px-4 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded font-semibold cursor-pointer hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT/RESOURCE MODAL */}
      {createType === 'Event' && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-display font-bold text-sm text-[#111827]">Create Event</h3>
              <button type="button" onClick={() => setCreateType(null)} className="text-[#64748B] hover:text-[#111827] cursor-pointer">
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Month</label>
                  <select
                    value={eventForm.month}
                    onChange={(e) => setEventForm({ ...eventForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Key Focus Topics</label>
                <input
                  type="text"
                  required
                  value={eventForm.focus}
                  onChange={(e) => setEventForm({ ...eventForm, focus: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">What You Will Learn (One per line)</label>
                <textarea
                  rows={3}
                  value={eventForm.whatYouWillLearn}
                  onChange={(e) => setEventForm({ ...eventForm, whatYouWillLearn: e.target.value })}
                  placeholder="e.g. Designing instances&#10;Triggering functions"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Publish Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
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

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end space-x-3">
              <button type="button" onClick={() => setCreateType(null)} className="px-4 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded font-semibold cursor-pointer hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded cursor-pointer transition-colors">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <form onSubmit={handleUpdateEvent} className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-display font-bold text-sm text-[#111827]">Edit Event</h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-[#64748B] hover:text-[#111827] cursor-pointer">
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Month</label>
                  <select
                    value={editItem.month}
                    onChange={(e) => setEditItem({ ...editItem, month: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
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
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
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
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Key Focus Topics</label>
                <input
                  type="text"
                  required
                  value={editItem.focus}
                  onChange={(e) => setEditItem({ ...editItem, focus: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Learning Outcome</label>
                <input
                  type="text"
                  required
                  value={editItem.outcome}
                  onChange={(e) => setEditItem({ ...editItem, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">What You Will Learn (One per line)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editItem.whatYouWillLearn) ? editItem.whatYouWillLearn.join('\n') : editItem.whatYouWillLearn}
                  onChange={(e) => setEditItem({ ...editItem, whatYouWillLearn: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Publish Status</label>
                  <select
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
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

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end space-x-3">
              <button type="button" onClick={() => setEditItem(null)} className="px-4 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded font-semibold cursor-pointer hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded cursor-pointer transition-colors">
                Update
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
