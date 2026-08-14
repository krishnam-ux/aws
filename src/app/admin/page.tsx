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
  isPublished?: boolean;
  isRegistrationOpen?: boolean;
  maxRegistrations?: number;
  registrationStatus?: string;
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

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Tabs structure matching user specifications
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Registrations' | 'EventRegistrations' | 'Verification' | 'Collaborations' | 'Events' | 'Announcements' | 'Resources' | 'CoreTeam' | 'Content' | 'Settings' | 'ContactMessages' | 'Feedback'>('Dashboard');

  // Stats / Dashboard data
  const [stats, setStats] = useState<any>({
    counts: { registrations: 0, joinCommunity: 0, events: 0, upcomingEvents: 0, openRegistrations: 0, pendingRegistrations: 0, verifications: 0, announcements: 0, resources: 0, collaborations: 0, contactMessages: 0 },
    recentRegistrations: [],
    recentVerifications: [],
    recentContactMessages: [],
    upcomingEvents: []
  });

  const [contactMessages, setContactMessages] = useState<any[]>([]);
  // DB Data
  const [eventRegistrations, setEventRegistrations] = useState<any[]>([]);
  const [selectedEventRegs, setSelectedEventRegs] = useState<CommunityEvent | null>(null);

  // Registration data deletion selection & confirmation states
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'single' | 'bulk' | 'all-event';
    count: number;
    targetId?: string;
    targetName?: string;
    selectedIds?: string[];
  } | null>(null);

  const [statusSaveState, setStatusSaveState] = useState<Record<string, 'saving' | 'saved' | 'failed' | null>>({});

  // DB Data
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
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

  // Contact messages filter states
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactFilterStatus, setContactFilterStatus] = useState('All');
  const [contactSortOrder, setContactSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [contactCurrentPage, setContactCurrentPage] = useState(1);
  const [selectedContactMessage, setSelectedContactMessage] = useState<any | null>(null);
  const [contactDeleteConfirmation, setContactDeleteConfirmation] = useState<any | null>(null);

  // Reset bulk selection when layout state changes to prevent unintended operations on hidden records
  useEffect(() => {
    setSelectedRegIds([]);
  }, [activeTab, selectedEventRegs, searchQuery, filterStatus]);

  useEffect(() => {
    setContactCurrentPage(1);
  }, [contactSearchQuery, contactFilterStatus]);

  // Crud/View Modals
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [createType, setCreateType] = useState<'Event' | 'Announcement' | 'Resource' | 'TeamMember' | null>(null);

  // Form Fields
  const [eventForm, setEventForm] = useState<any>({
    title: '', month: 'August', date: '', time: 'TBA', venue: 'TBA', description: '', focus: '', outcome: '', speaker: 'TBA', registrationLink: '', status: 'Draft', registrationStatus: 'Not Open', image: '', format: 'Hands-on Technical Workshop', whatYouWillLearn: '', collaborations: [], customCollab: '', customCollabLogo: ''
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
  // Feedback states
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'All' | 'New' | 'Reviewed' | 'Published' | 'Archived'>('All');
  const [feedbackSort, setFeedbackSort] = useState<'Newest' | 'Oldest' | 'Highest' | 'Lowest'>('Newest');
  const [feedbackEventFilter, setFeedbackEventFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [isViewFeedbackModalOpen, setIsViewFeedbackModalOpen] = useState(false);
  const [isEditFeedbackModalOpen, setIsEditFeedbackModalOpen] = useState(false);
  const [feedbackCurrentPage, setFeedbackCurrentPage] = useState(1);

  const [settingsForm, setSettingsForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  // Action status indicators
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [exportingStates, setExportingStates] = useState<Record<string, boolean>>({});

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

  // Reset feedback page on filters change
  useEffect(() => {
    setFeedbackCurrentPage(1);
  }, [feedbackSearch, feedbackStatusFilter, feedbackSort, feedbackEventFilter]);

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
    } else if (activeTab === 'EventRegistrations') {
      const data = await apiCall({ action: 'get-event-registrations' });
      if (data) setEventRegistrations(data);
    } else if (activeTab === 'Events') {
      const data = await apiCall({ action: 'get-events' });
      if (data) setEvents(data);
      const regs = await apiCall({ action: 'get-event-registrations' });
      if (regs) setEventRegistrations(regs);
      const feeds = await apiCall({ action: 'get-feedbacks' });
      if (feeds) setFeedbacks(feeds);
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
    } else if (activeTab === 'ContactMessages') {
      const data = await apiCall({ action: 'get-contact-messages' });
      if (data) setContactMessages(data);
    } else if (activeTab === 'Feedback') {
      const data = await apiCall({ action: 'get-feedbacks' });
      if (data) setFeedbacks(data);
      const evts = await apiCall({ action: 'get-events' });
      if (evts) setEvents(evts);
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

  // 1b. Event Registrations CRUD
  const updateEventRegStatus = async (id: string, status: string) => {
    const res = await apiCall({ action: 'update-event-registration', id, status });
    if (res && res.success) {
      fetchTabItems();
      fetchStats();
    }
  };

  const addEventRegNote = async (id: string, notes: string) => {
    const res = await apiCall({ action: 'update-event-registration', id, notes });
    if (res && res.success) {
      fetchTabItems();
      setViewItem(null);
    }
  };

  const confirmDeleteIndividual = (reg: any) => {
    setDeleteConfirmation({
      type: 'single',
      count: 1,
      targetId: reg.id,
      targetName: reg.name
    });
  };

  const confirmDeleteBulk = () => {
    if (selectedRegIds.length === 0) return;
    setDeleteConfirmation({
      type: 'bulk',
      count: selectedRegIds.length,
      selectedIds: [...selectedRegIds]
    });
  };

  const confirmDeleteAllForEvent = (event: CommunityEvent) => {
    const count = eventRegistrations.filter(r => r.eventId === event.id).length;
    setDeleteConfirmation({
      type: 'all-event',
      count,
      targetId: event.id,
      targetName: event.title
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation) return;
    setLoading(true);
    let res = null;
    if (deleteConfirmation.type === 'single') {
      res = await apiCall({ action: 'delete-event-registration', id: deleteConfirmation.targetId });
    } else if (deleteConfirmation.type === 'bulk') {
      res = await apiCall({ action: 'delete-event-registrations-bulk', ids: deleteConfirmation.selectedIds });
    } else if (deleteConfirmation.type === 'all-event') {
      res = await apiCall({ action: 'delete-event-registrations-all', eventId: deleteConfirmation.targetId });
    }

    if (res && res.success) {
      setDeleteConfirmation(null);
      setSelectedRegIds([]);
      setViewItem(null);
      fetchTabItems();
      fetchStats();
    } else {
      setActionError('Failed to delete registration data.');
    }
    setLoading(false);
  };

  const updateEventStatusField = async (eventId: string, field: string, value: string) => {
    const prevEvents = [...events];
    const stateKey = `${eventId}-${field}`;
    
    // Optimistic UI state update
    setEvents(prevEvents.map(e => e.id === eventId ? { ...e, [field]: value } : e));
    
    // Set saving indicator
    setStatusSaveState(prev => ({ ...prev, [stateKey]: 'saving' }));
    setActionError('');
    setActionSuccess('');

    try {
      const res = await apiCall({ action: 'update-event', event: { id: eventId, [field]: value } });
      if (res && res.success) {
        await fetchTabItems();
        await fetchStats();
        
        setStatusSaveState(prev => ({ ...prev, [stateKey]: 'saved' }));
        // Clear saved status after 2 seconds
        setTimeout(() => {
          setStatusSaveState(prev => ({ ...prev, [stateKey]: null }));
        }, 2000);
      } else {
        // Rollback state on failure
        setEvents(prevEvents);
        setStatusSaveState(prev => ({ ...prev, [stateKey]: 'failed' }));
        setActionError('Update failed. Please try again.');
        setTimeout(() => {
          setStatusSaveState(prev => ({ ...prev, [stateKey]: null }));
        }, 4000);
      }
    } catch (err) {
      // Rollback state on error
      setEvents(prevEvents);
      setStatusSaveState(prev => ({ ...prev, [stateKey]: 'failed' }));
      setActionError('Update failed. Please try again.');
      setTimeout(() => {
        setStatusSaveState(prev => ({ ...prev, [stateKey]: null }));
      }, 4000);
    }
  };

  const markContactMessageStatus = async (id: string, status: string) => {
    setActionError('');
    setActionSuccess('');
    const res = await apiCall({ action: 'update-contact-message', id, status });
    if (res && res.success) {
      if (selectedContactMessage && selectedContactMessage.id === id) {
        setSelectedContactMessage({ ...selectedContactMessage, status });
      }
      setActionSuccess(`Message marked as ${status.toLowerCase()}!`);
      setTimeout(() => setActionSuccess(''), 3000);
      await fetchTabItems();
      await fetchStats();
    } else {
      setActionError('Failed to update message status.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const deleteContactMessageConfirmed = async (id: string) => {
    setActionError('');
    setActionSuccess('');
    const res = await apiCall({ action: 'delete-contact-message', id });
    if (res && res.success) {
      setActionSuccess('Contact message deleted successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
      setContactDeleteConfirmation(null);
      if (selectedContactMessage && selectedContactMessage.id === id) {
        setSelectedContactMessage(null);
      }
      await fetchTabItems();
      await fetchStats();
    } else {
      setActionError('Failed to delete contact message.');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const openViewContactMessage = async (msg: any) => {
    setSelectedContactMessage(msg);
    if (msg.status === 'NEW') {
      const res = await apiCall({ action: 'update-contact-message', id: msg.id, status: 'READ' });
      if (res && res.success) {
        await fetchTabItems();
        await fetchStats();
      }
    }
  };

  const exportEventData = async (event: CommunityEvent, format: 'csv' | 'excel' | 'pdf') => {
    const key = `${event.id}-${format}`;
    if (exportingStates[key]) return;

    setExportingStates(prev => ({ ...prev, [key]: true }));

    try {
      const action = format === 'csv' ? 'export-csv' : format === 'excel' ? 'export-excel' : 'export-pdf';
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, eventId: event.id })
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Unable to export registrations. Please try again.';
        try {
          const errData = JSON.parse(errText);
          if (errData.error) errMsg = errData.error;
        } catch (_) {}
        alert(errMsg);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = event.title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      a.download = `${safeTitle}-registrations.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`${format} export error:`, err);
      alert('Unable to export registrations. Please try again.');
    } finally {
      setExportingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  const exportEventCSV = (event: CommunityEvent) => exportEventData(event, 'csv');
  const exportEventExcel = (event: CommunityEvent) => exportEventData(event, 'excel');
  const exportEventPDF = (event: CommunityEvent) => exportEventData(event, 'pdf');

  const exportFeedbackData = async (format: 'csv' | 'excel' | 'pdf') => {
    const key = `feedback-${format}`;
    if (exportingStates[key]) return;
    setExportingStates(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: `export-feedbacks-${format}`,
          eventId: feedbackEventFilter || null
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'Unable to export feedback. Please try again.';
        try {
          const errData = JSON.parse(errText);
          if (errData.error) errMsg = errData.error;
        } catch (_) {}
        alert(errMsg);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const allEvents = events || [];
      const event = allEvents.find(e => e.id === feedbackEventFilter);
      const title = event ? event.title : 'All-Events';
      const formattedTitle = title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

      a.download = `${formattedTitle}-feedback.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Feedback ${format} export error:`, err);
      alert('Unable to export feedback. Please try again.');
    } finally {
      setExportingStates(prev => ({ ...prev, [key]: false }));
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

  const handleLogoUpload = async (file: File, isEdit: boolean) => {
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'].includes(file.type)) {
      alert('Invalid image format. Allowed formats: PNG, JPG, JPEG, SVG, GIF.');
      return;
    }
    if (file.size > 500 * 1024) {
      alert('File too large. Maximum size allowed: 500KB.');
      return;
    }
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'upload-logo', base64Data })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          if (isEdit) {
            setEditItem({ ...editItem, customCollabLogo: data.url });
          } else {
            setEventForm({ ...eventForm, customCollabLogo: data.url });
          }
        } else {
          alert(data.error || 'Failed to upload logo.');
        }
      } catch (err) {
        alert('Network error uploading logo.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const openEditModal = (event: any) => {
    const dbCollabs = event.collaborations || [];
    const uiCollabs: string[] = [];
    let customCollab = '';
    
    dbCollabs.forEach((c: string) => {
      if (['GitHub', 'DataCamp', 'AI/ML Club'].includes(c)) {
        uiCollabs.push(c);
      } else {
        if (!uiCollabs.includes('Other')) {
          uiCollabs.push('Other');
        }
        customCollab = c;
      }
    });

    setEditItem({
      ...event,
      collaborations: uiCollabs,
      customCollab,
      customCollabLogo: event.customCollabLogo || ''
    });
  };

  // 2. Events CRUD
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const collabs = (eventForm.collaborations || []).filter((c: string) => c !== 'Other');
    if ((eventForm.collaborations || []).includes('Other') && eventForm.customCollab) {
      collabs.push(eventForm.customCollab);
    }
    const hasOther = (eventForm.collaborations || []).includes('Other');
    const formatted = {
      ...eventForm,
      collaborations: collabs,
      customCollabLogo: hasOther ? eventForm.customCollabLogo : '',
      whatYouWillLearn: typeof eventForm.whatYouWillLearn === 'string'
        ? eventForm.whatYouWillLearn.split('\n').filter((l: string) => l.trim().length > 0)
        : eventForm.whatYouWillLearn
    };
    delete formatted.customCollab;
    const res = await apiCall({ action: 'create-event', event: formatted });
    if (res && res.success) {
      fetchTabItems();
      setCreateType(null);
      setEventForm({ title: '', month: 'August', date: '', time: 'TBA', venue: 'TBA', description: '', focus: '', outcome: '', speaker: 'TBA', registrationLink: '', status: 'Draft', registrationStatus: 'Not Open', image: '', format: 'Hands-on Technical Workshop', whatYouWillLearn: '', collaborations: [], customCollab: '', customCollabLogo: '' });
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const collabs = (editItem.collaborations || []).filter((c: string) => c !== 'Other');
    if ((editItem.collaborations || []).includes('Other') && editItem.customCollab) {
      collabs.push(editItem.customCollab);
    }
    const hasOther = (editItem.collaborations || []).includes('Other');
    const formatted = {
      ...editItem,
      collaborations: collabs,
      customCollabLogo: hasOther ? editItem.customCollabLogo : '',
      whatYouWillLearn: Array.isArray(editItem.whatYouWillLearn) 
        ? editItem.whatYouWillLearn 
        : editItem.whatYouWillLearn.split('\n').filter((l: string) => l.trim().length > 0)
    };
    delete formatted.customCollab;
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
      <div className="min-h-screen bg-[#F6F8FA] bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full sm:w-[450px] space-y-6">
          <div className="bg-white p-8 sm:p-10 rounded-xl border border-[#E2E8F0] shadow-sm space-y-8">
            {/* Logos header */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center space-x-3 justify-center">
                <img
                  src="/aws-logo.svg"
                  style={{ height: '35px', width: 'auto', objectFit: 'contain' }}
                  className="flex-shrink-0"
                  alt="AWS"
                />
                <span className="text-slate-300 font-sans">|</span>
                <img
                  src="/chandigarh-university-logo.jpg"
                  style={{ height: '46px', width: 'auto', objectFit: 'contain' }}
                  className="flex-shrink-0"
                  alt="Chandigarh University"
                />
              </div>

              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-sm text-[#111827] uppercase tracking-wider block">
                  AWS SBG CU-UP
                </h2>
                <p className="text-xs text-[#64748B] font-medium font-sans">
                  Admin Portal
                </p>
              </div>

              <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded text-[10px] text-slate-500 font-medium font-sans">
                <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure Administration</span>
              </div>
            </div>

            <div className="h-[1px] w-full bg-slate-100"></div>

            {/* Login form */}
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <h3 className="font-display font-extrabold text-lg text-slate-900 leading-none">
                  Welcome back
                </h3>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                  Sign in to access the AWS SBG CU-UP administration portal.
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-650 text-xs text-center font-sans">
                  {loginError}
                </div>
              )}

              <div className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="font-bold text-[#64748B] uppercase tracking-wider block font-display">Username or Email</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] text-sm font-sans"
                    placeholder="Enter admin username"
                  />
                </div>

                <div className="space-y-1 relative">
                  <label className="font-bold text-[#64748B] uppercase tracking-wider block font-display">Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-12 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900] text-sm font-sans"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-2.5 text-[10px] font-bold text-slate-400 hover:text-slate-650 uppercase cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
                    />
                    <span className="text-[#64748B] font-sans text-xs">Remember me</span>
                  </label>
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

          {/* Branding Footnote */}
          <div className="text-center font-sans text-[10px] text-[#64748B] tracking-wide space-y-0.5">
            <p className="font-bold text-[#111827]">AWS Student Builder Group</p>
            <p>Chandigarh University – Uttar Pradesh</p>
            <p className="italic text-[9px] mt-1 text-[#64748B]">Authorized administration portal</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter, sort and paginate contact messages
  const filteredContactMessages = contactMessages.filter(msg => {
    const query = contactSearchQuery.toLowerCase();
    const nameMatch = msg.name?.toLowerCase().includes(query) || false;
    const emailMatch = msg.email?.toLowerCase().includes(query) || false;
    const subjectMatch = msg.subject?.toLowerCase().includes(query) || false;
    const messageMatch = msg.message?.toLowerCase().includes(query) || false;
    const matchesSearch = nameMatch || emailMatch || subjectMatch || messageMatch;

    const matchesStatus = contactFilterStatus === 'All' || msg.status === contactFilterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedContactMessages = [...filteredContactMessages].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return contactSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const contactItemsPerPage = 10;
  const contactTotalPages = Math.ceil(sortedContactMessages.length / contactItemsPerPage) || 1;
  const paginatedContactMessages = sortedContactMessages.slice(
    (contactCurrentPage - 1) * contactItemsPerPage,
    contactCurrentPage * contactItemsPerPage
  );

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
          
          <div className="flex items-center space-x-3">
            <img src="/aws-logo.svg" className="h-4 w-auto object-contain flex-shrink-0" alt="AWS" />
            <span className="text-slate-350 font-sans">|</span>
            <img src="/chandigarh-university-logo.jpg" className="h-6 w-auto object-contain flex-shrink-0" alt="CU" />
            <span className="text-slate-350 hidden sm:inline">|</span>
            <div className="flex flex-col hidden sm:flex">
              <span className="font-display font-extrabold text-xs text-[#111827] leading-none">
                AWS SBG CU-UP
              </span>
              <span className="text-[9px] text-[#64748B] font-semibold mt-1">Admin Panel</span>
            </div>
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
            <div className="px-3 py-2 flex items-center space-x-3 border-b border-[#152e46]/20 pb-4">
              <img
                src="/aws-logo.svg"
                className="h-5 w-auto object-contain brightness-0 invert flex-shrink-0"
                alt="AWS"
              />
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-[11px] tracking-tight text-white uppercase leading-none">AWS SBG CU-UP</span>
                  <span className="text-[9px] text-[#64748B] font-bold mt-1">Admin Portal</span>
                </div>
              )}
            </div>

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
                <button onClick={() => setActiveTab('EventRegistrations')} className={getNavClass('EventRegistrations')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                  {!isSidebarCollapsed && <span>Event Registrations</span>}
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
                <button onClick={() => setActiveTab('ContactMessages')} className={getNavClass('ContactMessages')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Contact Messages</span>}
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
                <button onClick={() => setActiveTab('Feedback')} className={getNavClass('Feedback')}>
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {!isSidebarCollapsed && <span>Feedback</span>}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {[
                  { label: 'Total Students Registered', value: stats.counts.registrations, desc: 'Total event enrollment logs', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z' },
                  { label: 'Upcoming Events', value: stats.counts.upcomingEvents, desc: 'Planned calendar schedules', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { label: 'Open Registrations', value: stats.counts.openRegistrations, desc: 'Active student intakes open', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04z' },
                  { label: 'Pending Registrations', value: stats.counts.pendingRegistrations, desc: 'New submissions to review', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253z' },
                  { label: 'New Contact Messages', value: stats.counts.contactMessages, desc: 'New submissions from visitors', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
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
                    onClick={() => setActiveTab('EventRegistrations')}
                    className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
                  >
                    View Registrations
                  </button>
                </div>
              </div>

              {/* 7. RECENT ACTIVITY GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                            <p className="text-[10px] text-[#64748B] font-mono mt-0.5">{reg.eventName} - {reg.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-sans ${
                            reg.status === 'Approved' || reg.status === 'Attended' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-[#FF9900] border border-orange-200'
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

                {/* Recent Contact Messages Card */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-lg shadow-sm space-y-5">
                  <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#E2E8F0] pb-3">
                    Recent Contact Messages
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {stats.recentContactMessages && stats.recentContactMessages.length > 0 ? (
                      stats.recentContactMessages.map((msg: any, idx: number) => (
                        <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded transition-colors">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-[#111827] truncate">{msg.name}</p>
                            <p className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate">{msg.subject} - {msg.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-sans flex-shrink-0 ${
                            msg.status === 'NEW' ? 'bg-orange-50 text-[#FF9900] border border-orange-200' :
                            msg.status === 'READ' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            msg.status === 'REPLIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {msg.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-[#64748B] space-y-2">
                        <svg className="h-8 w-8 mx-auto text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs">No messages yet.</p>
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

          {/* TAB 2b: EVENT REGISTRATIONS TABLE */}
          {activeTab === 'EventRegistrations' && (() => {
            const visibleRegs = eventRegistrations.filter(r => {
              const matchesQuery = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.email.toLowerCase().includes(searchQuery.toLowerCase()) || r.eventName.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
              return matchesQuery && matchesStatus;
            });
            const allVisibleSelected = visibleRegs.length > 0 && visibleRegs.every(r => selectedRegIds.includes(r.id));
            
            return (
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                  <div className="space-y-1">
                    <h2 className="font-display font-extrabold text-lg text-[#111827]">Event Registrations</h2>
                    <p className="text-xs text-[#64748B] font-sans">Manage student workshop and bootcamp enrollment sheets.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedRegIds.length > 0 && (
                      <button
                        onClick={confirmDeleteBulk}
                        className="px-3.5 py-1.5 bg-red-50 border border-red-200 hover:border-red-300 text-red-700 hover:bg-red-100 text-xs font-bold rounded transition-colors cursor-pointer"
                      >
                        Delete Selected ({selectedRegIds.length})
                      </button>
                    )}
                    <button
                      onClick={() => exportToCSV(eventRegistrations, 'event_registrations')}
                      className="px-3.5 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] hover:border-[#FF9900] text-slate-800 hover:text-[#FF9900] text-xs font-bold rounded transition-colors cursor-pointer"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Search & filters */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name, email, event..."
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
                    <option value="Attended">ATTENDED</option>
                    <option value="Cancelled">CANCELLED</option>
                  </select>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                    <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelection = Array.from(new Set([...selectedRegIds, ...visibleRegs.map(r => r.id)]));
                                setSelectedRegIds(newSelection);
                              } else {
                                const newSelection = selectedRegIds.filter(id => !visibleRegs.some(r => r.id === id));
                                setSelectedRegIds(newSelection);
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-[#E2E8F0] accent-[#FF9900] cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">Event</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">University</th>
                        <th className="px-4 py-3 text-left">Program</th>
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-left">Registered On</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                      {visibleRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-left w-10">
                            <input
                              type="checkbox"
                              checked={selectedRegIds.includes(reg.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegIds([...selectedRegIds, reg.id]);
                                } else {
                                  setSelectedRegIds(selectedRegIds.filter(id => id !== reg.id));
                                }
                              }}
                              className="h-3.5 w-3.5 rounded border-[#E2E8F0] accent-[#FF9900] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#111827]">{reg.name}</td>
                          <td className="px-4 py-3 font-medium text-slate-700 max-w-[150px] truncate">{reg.eventName}</td>
                          <td className="px-4 py-3 font-mono text-[11px] select-all">{reg.email}</td>
                          <td className="px-4 py-3 max-w-xs truncate">{reg.university}</td>
                          <td className="px-4 py-3">{reg.program}</td>
                          <td className="px-4 py-3 font-medium">{reg.year}</td>
                          <td className="px-4 py-3 font-mono text-[10px]">{new Date(reg.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              reg.status === 'Approved' || reg.status === 'Attended'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : reg.status === 'Rejected' || reg.status === 'Cancelled'
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => setViewItem(reg)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                              View
                            </button>
                            <button onClick={() => updateEventRegStatus(reg.id, 'Approved')} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer">
                              Approve
                            </button>
                            <button onClick={() => updateEventRegStatus(reg.id, 'Rejected')} className="text-red-500 hover:text-red-650 font-bold cursor-pointer">
                              Reject
                            </button>
                            <button onClick={() => updateEventRegStatus(reg.id, 'Attended')} className="text-indigo-650 hover:text-indigo-800 font-bold cursor-pointer">
                              Attended
                            </button>
                            <button onClick={() => updateEventRegStatus(reg.id, 'Cancelled')} className="text-slate-400 hover:text-slate-655 font-bold cursor-pointer">
                              Cancel
                            </button>
                            <button onClick={() => confirmDeleteIndividual(reg)} className="text-red-600 hover:text-red-700 font-bold cursor-pointer">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

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
                      <th className="px-4 py-3 text-left">Event Status</th>
                      <th className="px-4 py-3 text-left">Registration Status</th>
                      <th className="px-4 py-3 text-left">Registrations</th>
                      <th className="px-4 py-3 text-left">Feedback</th>
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <select
                                value={event.status || 'Draft'}
                                disabled={statusSaveState[`${event.id}-status`] === 'saving'}
                                onChange={(e) => updateEventStatusField(event.id, 'status', e.target.value)}
                                className={`px-2 py-1 border border-[#E2E8F0] rounded bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] ${
                                  statusSaveState[`${event.id}-status`] === 'saving' ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Planned">Planned</option>
                                <option value="Upcoming">Upcoming</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Unpublished">Unpublished</option>
                              </select>
                              {statusSaveState[`${event.id}-status`] === 'saving' && (
                                <span className="text-[10px] text-slate-500 font-semibold animate-pulse">Saving...</span>
                              )}
                              {statusSaveState[`${event.id}-status`] === 'saved' && (
                                <span className="text-[10px] text-emerald-600 font-bold">Saved</span>
                              )}
                              {statusSaveState[`${event.id}-status`] === 'failed' && (
                                <span className="text-[10px] text-red-650 font-bold">Update failed. Please try again.</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <select
                                value={event.registrationStatus || 'Not Open'}
                                disabled={statusSaveState[`${event.id}-registrationStatus`] === 'saving'}
                                onChange={(e) => updateEventStatusField(event.id, 'registrationStatus', e.target.value)}
                                className={`px-2 py-1 border border-[#E2E8F0] rounded bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] ${
                                  statusSaveState[`${event.id}-registrationStatus`] === 'saving' ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <option value="Not Open">Not Open</option>
                                <option value="Open">Open</option>
                                <option value="Closed">Closed</option>
                                <option value="Full">Full</option>
                              </select>
                              {statusSaveState[`${event.id}-registrationStatus`] === 'saving' && (
                                <span className="text-[10px] text-slate-500 font-semibold animate-pulse">Saving...</span>
                              )}
                              {statusSaveState[`${event.id}-registrationStatus`] === 'saved' && (
                                <span className="text-[10px] text-emerald-600 font-bold">Saved</span>
                              )}
                              {statusSaveState[`${event.id}-registrationStatus`] === 'failed' && (
                                <span className="text-[10px] text-red-650 font-bold">Update failed. Please try again.</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            <button
                              onClick={() => setSelectedEventRegs(event)}
                              className="underline text-brand-navy hover:text-[#FF9900] transition-colors"
                            >
                              {eventRegistrations.filter(r => r.eventId === event.id).length} / {event.maxRegistrations && event.maxRegistrations > 0 ? event.maxRegistrations : '∞'}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            <button
                              onClick={() => {
                                setFeedbackEventFilter(event.id);
                                setActiveTab('Feedback');
                              }}
                              className="underline text-[#FF9900] hover:text-orange-700 transition-colors"
                            >
                              {feedbacks.filter(f => f.eventId === event.id).length}
                            </button>
                          </td>
                          <td className="px-4 py-3 truncate max-w-[120px]">{event.format}</td>
                          <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                            <button onClick={() => setSelectedEventRegs(event)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                              View Registrations
                            </button>
                            <button
                              onClick={() => {
                                setFeedbackEventFilter(event.id);
                                setActiveTab('Feedback');
                              }}
                              className="text-[#FF9900] hover:text-orange-700 font-bold cursor-pointer"
                            >
                              View Feedback
                            </button>
                            <button 
                              disabled={exportingStates[`${event.id}-csv`]} 
                              onClick={() => exportEventCSV(event)} 
                              className="text-slate-600 hover:text-[#FF9900] font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {exportingStates[`${event.id}-csv`] ? 'Preparing...' : 'Export CSV'}
                            </button>
                            <button 
                              disabled={exportingStates[`${event.id}-excel`]} 
                              onClick={() => exportEventExcel(event)} 
                              className="text-slate-600 hover:text-[#FF9900] font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {exportingStates[`${event.id}-excel`] ? 'Preparing...' : 'Export Excel'}
                            </button>
                            <button 
                              disabled={exportingStates[`${event.id}-pdf`]} 
                              onClick={() => exportEventPDF(event)} 
                              className="text-slate-600 hover:text-[#FF9900] font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {exportingStates[`${event.id}-pdf`] ? 'Preparing...' : 'Export PDF'}
                            </button>
                            <button onClick={() => openEditModal(event)} className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer">
                              Edit
                            </button>
                            {event.status === 'Completed' && (
                              <button
                                onClick={() => confirmDeleteAllForEvent(event)}
                                className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                              >
                                Delete Registration Data
                              </button>
                            )}
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
            <div className="space-y-6">
              {/* Profile Card & Header */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden text-xs font-sans">
                {/* Visual Header Banner */}
                <div className="h-24 bg-gradient-to-r from-brand-navy to-slate-800 relative">
                  <div className="absolute top-4 right-6 bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/25 px-2.5 py-0.5 rounded-full text-[9px] font-bold font-sans">
                    AWS SBG CU-UP System Profile
                  </div>
                </div>

                {/* Profile Header Details block */}
                <div className="px-6 pb-6 relative">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-5 -mt-10 mb-6">
                    {/* Circular Avatar */}
                    <div className="h-20 w-20 rounded-full border-4 border-white bg-gradient-to-br from-[#FF9900] to-orange-600 flex items-center justify-center font-display font-extrabold text-white text-xl shadow-md flex-shrink-0">
                      AA
                    </div>
                    {/* Name & Role block */}
                    <div className="mt-4 sm:mt-0 space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <h2 className="font-display font-extrabold text-lg text-slate-900 leading-none">
                          AWS SBG CU-UP Administrator
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold font-sans bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                          Active
                        </span>
                      </div>
                      <p className="text-slate-500 font-semibold">{siteConfig.orgShortName} • System Administrator</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    {/* Column 1: Account Information */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
                          Account Information
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">ADMIN EMAIL</span>
                          <span className="font-bold text-slate-800 text-[13px]">awsadmin@culko.in</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">ROLE</span>
                          <span className="font-semibold text-slate-800 text-[13px]">System Administrator</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">ACCOUNT STATUS</span>
                          <span className="inline-flex items-center font-bold text-emerald-700">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Login Credentials & Security */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
                          Security & Login Credentials
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Login Username</span>
                          <span className="font-mono text-slate-800 text-[12px]">awsadmin@culko.in</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">System Security</span>
                          <span className="text-slate-500 font-medium">PBKDF2 SHA-512 Enforced</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">LAST LOGIN</span>
                          <span className="text-slate-500 font-semibold">Current Active Session</span>
                        </div>
                      </div>
                      
                      <div className="pt-3 flex justify-start">
                        <button
                          type="button"
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-[11px] font-bold rounded shadow-sm cursor-pointer transition-colors flex items-center space-x-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Change System Password</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: CONTACT MESSAGES */}
          {activeTab === 'ContactMessages' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div className="space-y-1.5">
                  <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827] tracking-tight">
                    Contact Messages
                  </h1>
                  <p className="text-xs text-[#64748B] font-sans leading-relaxed">
                    View and manage user messages submitted through the public contact page.
                  </p>
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-grow max-w-3xl">
                  {/* Search */}
                  <div className="relative min-w-[200px] flex-grow">
                    <input
                      type="text"
                      placeholder="Search messages (Name, email, subject, message)..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA] font-medium font-sans"
                    />
                    <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-display">Status:</span>
                    <select
                      value={contactFilterStatus}
                      onChange={(e) => setContactFilterStatus(e.target.value)}
                      className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-sans"
                    >
                      <option value="All">All Statuses</option>
                      <option value="NEW">New</option>
                      <option value="READ">Read</option>
                      <option value="REPLIED">Replied</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-display">Sort:</span>
                    <select
                      value={contactSortOrder}
                      onChange={(e) => setContactSortOrder(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-sans"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">
                  Showing {paginatedContactMessages.length} of {sortedContactMessages.length} messages
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-650 font-sans">
                    <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Submitted</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedContactMessages.length > 0 ? (
                        paginatedContactMessages.map((msg: any) => (
                          <tr key={msg.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-[#111827]">{msg.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 select-all">{msg.email}</td>
                            <td className="px-4 py-3 font-medium text-slate-700 max-w-xs truncate" title={msg.subject}>
                              {msg.subject}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                              {new Date(msg.date).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-sans ${
                                msg.status === 'NEW' ? 'bg-orange-50 text-[#FF9900] border border-orange-200 animate-pulse' :
                                msg.status === 'READ' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                msg.status === 'REPLIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {msg.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                              <button
                                onClick={() => openViewContactMessage(msg)}
                                className="underline font-bold text-[#FF9900] hover:text-orange-700 cursor-pointer"
                              >
                                View
                              </button>
                              {msg.status === 'NEW' && (
                                <button
                                  onClick={() => markContactMessageStatus(msg.id, 'READ')}
                                  className="underline text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  Read
                                </button>
                              )}
                              {msg.status !== 'REPLIED' && (
                                <button
                                  onClick={() => markContactMessageStatus(msg.id, 'REPLIED')}
                                  className="underline text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                >
                                  Replied
                                </button>
                              )}
                              {msg.status !== 'ARCHIVED' && (
                                <button
                                  onClick={() => markContactMessageStatus(msg.id, 'ARCHIVED')}
                                  className="underline text-slate-500 hover:text-slate-700 cursor-pointer"
                                >
                                  Archive
                                </button>
                              )}
                              <button
                                onClick={() => setContactDeleteConfirmation(msg.id)}
                                className="underline text-red-500 hover:text-red-700 cursor-pointer font-semibold"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-[#64748B] space-y-2">
                            <svg className="h-8 w-8 mx-auto text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs">No contact messages match search or filters.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {contactTotalPages > 1 && (
                  <div className="bg-slate-50 border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between font-sans">
                    <button
                      onClick={() => setContactCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={contactCurrentPage === 1}
                      className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded hover:border-[#FF9900] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      Page {contactCurrentPage} of {contactTotalPages}
                    </span>
                    <button
                      onClick={() => setContactCurrentPage(prev => Math.min(prev + 1, contactTotalPages))}
                      disabled={contactCurrentPage === contactTotalPages}
                      className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded hover:border-[#FF9900] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 13: FEEDBACK */}
          {activeTab === 'Feedback' && (() => {
            const getFilteredFeedbacks = () => {
              let result = [...feedbacks];

              // Event Filter
              if (feedbackEventFilter) {
                result = result.filter(f => f.eventId === feedbackEventFilter);
              }

              // Status Filter
              if (feedbackStatusFilter !== 'All') {
                result = result.filter(f => f.status === feedbackStatusFilter);
              }

              // Search
              if (feedbackSearch.trim()) {
                const q = feedbackSearch.toLowerCase().trim();
                result = result.filter(f => {
                  const evt = events.find(e => e.id === f.eventId);
                  const eventTitle = evt ? evt.title.toLowerCase() : 'general community / others';
                  return (
                    f.name.toLowerCase().includes(q) ||
                    f.email.toLowerCase().includes(q) ||
                    (f.university && f.university.toLowerCase().includes(q)) ||
                    eventTitle.includes(q) ||
                    f.feedback.toLowerCase().includes(q)
                  );
                });
              }

              // Sort
              if (feedbackSort === 'Newest') {
                result.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
              } else if (feedbackSort === 'Oldest') {
                result.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());
              } else if (feedbackSort === 'Highest') {
                result.sort((a, b) => b.rating - a.rating);
              } else if (feedbackSort === 'Lowest') {
                result.sort((a, b) => a.rating - b.rating);
              }

              return result;
            };

            const processedFeedbacks = getFilteredFeedbacks();
            const feedbackItemsPerPage = 20;
            const feedbackTotalPages = Math.ceil(processedFeedbacks.length / feedbackItemsPerPage) || 1;
            const paginatedFeedbacks = processedFeedbacks.slice(
              (feedbackCurrentPage - 1) * feedbackItemsPerPage,
              feedbackCurrentPage * feedbackItemsPerPage
            );

            return (
              <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                  <div className="space-y-1.5">
                    <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827] tracking-tight">
                      Feedback CMS
                    </h1>
                    <p className="text-xs text-[#64748B] font-sans leading-relaxed">
                      Monitor, filter, edit, and export student feedback submissions.
                    </p>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                  {/* Total Feedback */}
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
                    <span className="text-lg font-extrabold text-[#111827] block">{feedbacks.length}</span>
                  </div>
                  {/* Average Rating */}
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      Avg Rating <span className="text-[#FF9900]">★</span>
                    </span>
                    <span className="text-lg font-extrabold text-[#FF9900] block">
                      {feedbacks.length > 0
                        ? (feedbacks.reduce((acc, f) => acc + Number(f.rating), 0) / feedbacks.length).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                  {/* Star breakdowns */}
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{star} Star</span>
                      <span className="text-lg font-extrabold text-slate-700 block">
                        {feedbacks.filter(f => Number(f.rating) === star).length}
                      </span>
                    </div>
                  ))}
                  {/* New count */}
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">New</span>
                    <span className={`text-lg font-extrabold block ${feedbacks.filter(f => f.status === 'New').length > 0 ? 'text-[#FF9900] animate-pulse' : 'text-slate-700'}`}>
                      {feedbacks.filter(f => f.status === 'New').length}
                    </span>
                  </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-white border border-[#E2E8F0] p-4 rounded-lg shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-grow md:max-w-xs">
                      <input
                        type="text"
                        placeholder="Search (Name, email, university, feedback)..."
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#FF9900] bg-[#F6F8FA] font-medium font-sans"
                      />
                      <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Event filter */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-display">Event:</span>
                      <select
                        value={feedbackEventFilter}
                        onChange={(e) => setFeedbackEventFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-sans"
                      >
                        <option value="">All Events</option>
                        {events.map((evt) => (
                          <option key={evt.id} value={evt.id}>
                            {evt.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-display">Status:</span>
                      <select
                        value={feedbackStatusFilter}
                        onChange={(e) => setFeedbackStatusFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-sans"
                      >
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Published">Published</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-display">Sort:</span>
                      <select
                        value={feedbackSort}
                        onChange={(e) => setFeedbackSort(e.target.value as any)}
                        className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF9900] font-sans"
                      >
                        <option value="Newest">Newest First</option>
                        <option value="Oldest">Oldest First</option>
                        <option value="Highest">Highest Rating</option>
                        <option value="Lowest">Lowest Rating</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-3">
                    {/* Export buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportFeedbackData('csv')}
                        disabled={exportingStates['feedback-csv']}
                        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] hover:text-[#FF9900] rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {exportingStates['feedback-csv'] ? 'Preparing...' : 'Export CSV'}
                      </button>
                      <button
                        onClick={() => exportFeedbackData('excel')}
                        disabled={exportingStates['feedback-excel']}
                        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] hover:text-[#FF9900] rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {exportingStates['feedback-excel'] ? 'Preparing...' : 'Export Excel'}
                      </button>
                      <button
                        onClick={() => exportFeedbackData('pdf')}
                        disabled={exportingStates['feedback-pdf']}
                        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#FF9900] hover:text-[#FF9900] rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {exportingStates['feedback-pdf'] ? 'Preparing...' : 'Export PDF'}
                      </button>
                    </div>

                    <div className="text-[10px] text-[#64748B] font-mono">
                      Showing {paginatedFeedbacks.length} of {processedFeedbacks.length} feedbacks
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden font-sans">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-650">
                      <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Student Name</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">University</th>
                          <th className="px-4 py-3 text-left">Event</th>
                          <th className="px-4 py-3 text-center">Rating</th>
                          <th className="px-4 py-3 text-center">Experience</th>
                          <th className="px-4 py-3 text-left">Feedback comments</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paginatedFeedbacks.length > 0 ? (
                          paginatedFeedbacks.map((f: any) => {
                            const evt = events.find(e => e.id === f.eventId);
                            const eventTitle = evt ? evt.title : 'General / Others';
                            return (
                              <tr key={f.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-[#111827]">{f.name}</td>
                                <td className="px-4 py-3 font-mono text-slate-500 select-all">{f.email}</td>
                                <td className="px-4 py-3 text-slate-600">{f.university}</td>
                                <td className="px-4 py-3 font-medium text-slate-700 max-w-[120px] truncate" title={eventTitle}>
                                  {eventTitle}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-[#FF9900] whitespace-nowrap">{f.rating} ★</td>
                                <td className="px-4 py-3 text-center font-medium text-slate-600">{f.experience}</td>
                                <td className="px-4 py-3 max-w-[180px] truncate text-slate-500" title={f.feedback}>
                                  {f.feedback}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    f.status === 'New' ? 'bg-orange-50 text-[#FF9900] border border-orange-200 animate-pulse' :
                                    f.status === 'Reviewed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    f.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    'bg-slate-50 text-slate-700 border border-slate-200'
                                  }`}>
                                    {f.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                                  {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ''}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedFeedback(f);
                                      setIsViewFeedbackModalOpen(true);
                                    }}
                                    className="underline font-bold text-[#FF9900] hover:text-orange-700 cursor-pointer"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedFeedback({ ...f });
                                      setIsEditFeedbackModalOpen(true);
                                    }}
                                    className="underline text-blue-600 hover:text-blue-800 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Are you sure you want to delete this feedback?')) {
                                        try {
                                          const res = await fetch(`/api/admin/feedback/${f.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });
                                          if (res.ok) {
                                            alert('Feedback deleted successfully.');
                                            fetchTabItems();
                                          } else {
                                            const err = await res.json();
                                            alert(err.error || 'Failed to delete feedback.');
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          alert('An error occurred while deleting.');
                                        }
                                      }
                                    }}
                                    className="underline text-red-500 hover:text-red-700 cursor-pointer font-semibold"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={10} className="text-center py-12 text-[#64748B] space-y-2">
                              <svg className="h-8 w-8 mx-auto text-slate-350" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <p className="text-xs">No feedback matches search or filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {feedbackTotalPages > 1 && (
                    <div className="bg-slate-50 border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between font-sans">
                      <button
                        onClick={() => setFeedbackCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={feedbackCurrentPage === 1}
                        className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded hover:border-[#FF9900] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        Page {feedbackCurrentPage} of {feedbackTotalPages}
                      </span>
                      <button
                        onClick={() => setFeedbackCurrentPage(prev => Math.min(prev + 1, feedbackTotalPages))}
                        disabled={feedbackCurrentPage === feedbackTotalPages}
                        className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded hover:border-[#FF9900] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* View Feedback Modal */}
                {isViewFeedbackModalOpen && selectedFeedback && (
                  <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
                    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs text-slate-700">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-[#111827]">Feedback Details</h3>
                        <button onClick={() => { setIsViewFeedbackModalOpen(false); setSelectedFeedback(null); }} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Feedback ID</span>
                          <span className="font-mono text-slate-600 select-all">{selectedFeedback.id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Event</span>
                          <span className="font-medium text-slate-800">
                            {events.find(e => e.id === selectedFeedback.eventId)?.title || 'General / Others'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Student Name</span>
                          <span className="font-medium text-slate-800">{selectedFeedback.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Email</span>
                          <span className="font-mono text-slate-800 select-all">{selectedFeedback.email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">University</span>
                          <span className="font-medium text-slate-800">{selectedFeedback.university}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Submitted Date</span>
                          <span className="font-mono text-slate-600">{new Date(selectedFeedback.createdAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Rating</span>
                          <span className="font-bold text-[#FF9900] text-sm">{selectedFeedback.rating} ★</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Experience</span>
                          <span className="font-medium text-slate-800">{selectedFeedback.experience}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Recommendation</span>
                          <span className="font-medium text-slate-800">{selectedFeedback.recommendation}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Status</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase mt-1 ${
                            selectedFeedback.status === 'New' ? 'bg-orange-50 text-[#FF9900]' :
                            selectedFeedback.status === 'Reviewed' ? 'bg-blue-50 text-blue-700' :
                            selectedFeedback.status === 'Published' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-slate-50 text-slate-700'
                          }`}>
                            {selectedFeedback.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Detailed Comments</span>
                          <p className="bg-slate-50 border border-slate-100 p-2.5 rounded text-slate-700 leading-relaxed whitespace-pre-wrap mt-1">
                            {selectedFeedback.feedback}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">What they liked</span>
                          <p className="bg-slate-50 border border-slate-100 p-2.5 rounded text-slate-700 leading-relaxed whitespace-pre-wrap mt-1">
                            {selectedFeedback.liked || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">What can be improved</span>
                          <p className="bg-slate-50 border border-slate-100 p-2.5 rounded text-slate-700 leading-relaxed whitespace-pre-wrap mt-1">
                            {selectedFeedback.improvements || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Admin Notes</span>
                          <p className="bg-orange-50/50 border border-orange-100 p-2.5 rounded text-slate-700 leading-relaxed whitespace-pre-wrap mt-1 font-medium">
                            {selectedFeedback.adminNotes || 'No notes added.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Feedback Modal */}
                {isEditFeedbackModalOpen && selectedFeedback && (
                  <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
                    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs text-slate-700">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-sm text-[#111827]">Edit Feedback Record</h3>
                        <button onClick={() => { setIsEditFeedbackModalOpen(false); setSelectedFeedback(null); }} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(selectedFeedback)
                          });

                          if (res.ok) {
                            alert('Feedback updated successfully.');
                            setIsEditFeedbackModalOpen(false);
                            setSelectedFeedback(null);
                            fetchTabItems();
                          } else {
                            const err = await res.json();
                            alert(err.error || 'Failed to update feedback.');
                          }
                        } catch (err) {
                          console.error(err);
                          alert('An error occurred during save.');
                        }
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Student Name</label>
                            <input
                              type="text"
                              value={selectedFeedback.name}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, name: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded"
                              required
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Email</label>
                            <input
                              type="email"
                              value={selectedFeedback.email}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, email: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded"
                              required
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">University</label>
                            <input
                              type="text"
                              value={selectedFeedback.university}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, university: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Event</label>
                            <select
                              value={selectedFeedback.eventId || ''}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, eventId: e.target.value || null })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white"
                            >
                              <option value="">General Community / Others</option>
                              {events.map((evt) => (
                                <option key={evt.id} value={evt.id}>
                                  {evt.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Rating (1 to 5 Stars)</label>
                            <select
                              value={selectedFeedback.rating}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, rating: Number(e.target.value) })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white font-bold text-[#FF9900]"
                            >
                              <option value={1}>1 Star ★</option>
                              <option value={2}>2 Stars ★★</option>
                              <option value={3}>3 Stars ★★★</option>
                              <option value={4}>4 Stars ★★★★</option>
                              <option value={5}>5 Stars ★★★★★</option>
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Experience</label>
                            <select
                              value={selectedFeedback.experience}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, experience: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white"
                            >
                              <option value="Excellent">Excellent</option>
                              <option value="Very Good">Very Good</option>
                              <option value="Good">Good</option>
                              <option value="Average">Average</option>
                              <option value="Poor">Poor</option>
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Recommendation</label>
                            <select
                              value={selectedFeedback.recommendation}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, recommendation: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white"
                            >
                              <option value="Yes">Yes, definitely</option>
                              <option value="Maybe">Maybe</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="font-bold text-slate-800">Status</label>
                            <select
                              value={selectedFeedback.status}
                              onChange={(e) => setSelectedFeedback({ ...selectedFeedback, status: e.target.value })}
                              className="px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white font-bold"
                            >
                              <option value="New">New</option>
                              <option value="Reviewed">Reviewed</option>
                              <option value="Published">Published</option>
                              <option value="Archived">Archived</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="font-bold text-slate-800">Feedback Comments</label>
                          <textarea
                            rows={3}
                            value={selectedFeedback.feedback}
                            onChange={(e) => setSelectedFeedback({ ...selectedFeedback, feedback: e.target.value })}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded resize-y"
                            required
                          />
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="font-bold text-slate-800">What they liked</label>
                          <textarea
                            rows={2}
                            value={selectedFeedback.liked}
                            onChange={(e) => setSelectedFeedback({ ...selectedFeedback, liked: e.target.value })}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded resize-y"
                          />
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="font-bold text-slate-800">What can be improved</label>
                          <textarea
                            rows={2}
                            value={selectedFeedback.improvements}
                            onChange={(e) => setSelectedFeedback({ ...selectedFeedback, improvements: e.target.value })}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded resize-y"
                          />
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="font-bold text-slate-800">Admin Notes</label>
                          <textarea
                            rows={2}
                            placeholder="Add coordinator notes or summary here..."
                            value={selectedFeedback.adminNotes}
                            onChange={(e) => setSelectedFeedback({ ...selectedFeedback, adminNotes: e.target.value })}
                            className="px-2.5 py-1.5 border border-[#E2E8F0] rounded resize-y bg-orange-50/20 focus:bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => { setIsEditFeedbackModalOpen(false); setSelectedFeedback(null); }}
                            className="px-4 py-2 border border-[#E2E8F0] rounded text-slate-650 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white font-bold rounded shadow-sm transition-colors cursor-pointer"
                          >
                            Save Changes
                        </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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

            {/* If general community Registration details */}
            {viewItem.interests && !viewItem.eventName && (
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

            {/* If Event Registration details */}
            {viewItem.eventName && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Student Name</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">{viewItem.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Email / Phone</span>
                    <p className="font-mono text-slate-800 mt-0.5 select-all">{viewItem.email}</p>
                    <p className="text-slate-600 mt-0.5">{viewItem.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Event Name</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.eventName}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Academic Details</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{viewItem.university}</p>
                    <p className="text-slate-600 mt-0.5">{viewItem.program} - {viewItem.year}</p>
                    <p className="text-[10px] text-slate-450 font-mono mt-0.5">UID: {viewItem.studentId || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Experience & Interests</span>
                    <p className="font-semibold text-slate-850 mt-0.5">{viewItem.experienceLevel || 'Beginner'}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewItem.interests?.map((int: string, i: number) => (
                        <span key={i} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-medium">{int}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Social Profiles</span>
                    {viewItem.linkedin && <p className="text-slate-600 mt-0.5 truncate"><a href={viewItem.linkedin} target="_blank" rel="noopener noreferrer" className="underline text-brand-navy font-medium hover:text-aws-orange">LinkedIn Profile</a></p>}
                    {viewItem.github && <p className="text-slate-600 mt-0.5 truncate"><a href={viewItem.github} target="_blank" rel="noopener noreferrer" className="underline text-brand-navy font-medium hover:text-aws-orange">GitHub Profile</a></p>}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Motivation / Statement</span>
                  <p className="text-slate-650 leading-relaxed font-sans bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">{viewItem.motivation || 'No statement provided.'}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-[#64748B] block uppercase tracking-wider text-[10px]">Internal Note</span>
                  <textarea
                    rows={3}
                    defaultValue={viewItem.notes}
                    onBlur={(e) => addEventRegNote(viewItem.id, e.target.value)}
                    placeholder="Add internal notes (saves on blur)..."
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Status</label>
                  <select
                    value={eventForm.status || 'Draft'}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Registration Status</label>
                  <select
                    value={eventForm.registrationStatus || 'Not Open'}
                    onChange={(e) => setEventForm({ ...eventForm, registrationStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
                  >
                    <option value="Not Open">Not Open</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Max Registrations Limit</label>
                  <input
                    type="number"
                    value={eventForm.maxRegistrations || -1}
                    onChange={(e) => setEventForm({ ...eventForm, maxRegistrations: parseInt(e.target.value) || -1 })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none font-medium"
                    placeholder="-1 for Unlimited"
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Collaboration</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['GitHub', 'DataCamp', 'AI/ML Club', 'Other'].map(org => {
                    const current = eventForm.collaborations || [];
                    const isChecked = current.includes(org);
                    return (
                      <label key={org} className="inline-flex items-center space-x-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked ? current.filter((c: string) => c !== org) : [...current, org];
                            setEventForm({ ...eventForm, collaborations: updated });
                          }}
                          className="rounded text-aws-orange focus:ring-aws-orange h-3.5 w-3.5 border-slate-350"
                        />
                        <span className="inline-flex items-center space-x-1.5">
                          {renderCollabLogo(org, org === 'Other' ? eventForm.customCollabLogo : undefined, "h-3.5 w-3.5 object-contain flex-shrink-0")}
                          <span>{org}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {(eventForm.collaborations || []).includes('Other') && (
                  <div className="mt-3 space-y-2.5">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 text-[9px] uppercase tracking-wider">Organization / Company Name</label>
                      <input
                        type="text"
                        required
                        value={eventForm.customCollab || ''}
                        onChange={(e) => setEventForm({ ...eventForm, customCollab: e.target.value })}
                        placeholder="Enter custom organization name"
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 text-[9px] uppercase tracking-wider">Organization Logo (Optional)</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file, false);
                          }}
                          className="w-full text-[10px] text-slate-505 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-aws-orange/10 file:text-aws-orange hover:file:bg-aws-orange/20 cursor-pointer"
                        />
                        {isUploading && <span className="text-[10px] text-slate-400 animate-pulse font-medium">Uploading...</span>}
                        {eventForm.customCollabLogo && (
                          <img src={eventForm.customCollabLogo} alt="Preview" className="h-6 w-auto max-h-6 object-contain rounded border border-slate-100 bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Status</label>
                  <select
                    value={editItem.status || 'Draft'}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Registration Status</label>
                  <select
                    value={editItem.registrationStatus || 'Not Open'}
                    onChange={(e) => setEditItem({ ...editItem, registrationStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none bg-white font-medium"
                  >
                    <option value="Not Open">Not Open</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Max Registrations Limit</label>
                  <input
                    type="number"
                    value={editItem.maxRegistrations || -1}
                    onChange={(e) => setEditItem({ ...editItem, maxRegistrations: parseInt(e.target.value) || -1 })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">Event Collaboration</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {['GitHub', 'DataCamp', 'AI/ML Club', 'Other'].map(org => {
                    const current = editItem.collaborations || [];
                    const isChecked = current.includes(org);
                    return (
                      <label key={org} className="inline-flex items-center space-x-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked ? current.filter((c: string) => c !== org) : [...current, org];
                            setEditItem({ ...editItem, collaborations: updated });
                          }}
                          className="rounded text-aws-orange focus:ring-aws-orange h-3.5 w-3.5 border-slate-350"
                        />
                        <span className="inline-flex items-center space-x-1.5">
                          {renderCollabLogo(org, org === 'Other' ? editItem.customCollabLogo : undefined, "h-3.5 w-3.5 object-contain flex-shrink-0")}
                          <span>{org}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {(editItem.collaborations || []).includes('Other') && (
                  <div className="mt-3 space-y-2.5">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 text-[9px] uppercase tracking-wider">Organization / Company Name</label>
                      <input
                        type="text"
                        required
                        value={editItem.customCollab || ''}
                        onChange={(e) => setEditItem({ ...editItem, customCollab: e.target.value })}
                        placeholder="Enter custom organization name"
                        className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded focus:outline-none font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-600 text-[9px] uppercase tracking-wider">Organization Logo (Optional)</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file, true);
                          }}
                          className="w-full text-[10px] text-slate-550 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-aws-orange/10 file:text-aws-orange hover:file:bg-aws-orange/20 cursor-pointer"
                        />
                        {isUploading && <span className="text-[10px] text-slate-400 animate-pulse font-medium">Uploading...</span>}
                        {editItem.customCollabLogo && (
                          <img src={editItem.customCollabLogo} alt="Preview" className="h-6 w-auto max-h-6 object-contain rounded border border-slate-100 bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

      {/* EVENT SPECIFIC REGISTRATIONS SUB-PANEL MODAL */}
      {selectedEventRegs && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-[#111827]">Event Registrations</h3>
                <p className="text-xs text-[#64748B] mt-0.5">{selectedEventRegs.title}</p>
              </div>
              <button onClick={() => setSelectedEventRegs(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Counters Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: eventRegistrations.filter(r => r.eventId === selectedEventRegs.id).length, bg: 'bg-slate-50 text-slate-800' },
                { label: 'New', value: eventRegistrations.filter(r => r.eventId === selectedEventRegs.id && r.status === 'New').length, bg: 'bg-orange-50 text-[#FF9900]' },
                { label: 'Approved', value: eventRegistrations.filter(r => r.eventId === selectedEventRegs.id && r.status === 'Approved').length, bg: 'bg-emerald-50 text-emerald-700' },
                { label: 'Rejected', value: eventRegistrations.filter(r => r.eventId === selectedEventRegs.id && r.status === 'Rejected').length, bg: 'bg-red-50 text-red-700' },
                { label: 'Attended', value: eventRegistrations.filter(r => r.eventId === selectedEventRegs.id && r.status === 'Attended').length, bg: 'bg-indigo-50 text-indigo-700' }
              ].map((c, i) => (
                <div key={i} className={`p-3 rounded border border-slate-100 text-center font-display font-bold ${c.bg}`}>
                  <span className="text-[9px] uppercase tracking-wider block opacity-75">{c.label}</span>
                  <span className="text-lg block mt-0.5">{c.value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-505 font-semibold">Registrations Table</span>
              <div className="flex items-center space-x-2">
                {selectedRegIds.length > 0 && (
                  <button
                    onClick={confirmDeleteBulk}
                    className="px-3.5 py-1.5 bg-red-50 border border-red-200 hover:border-red-300 text-red-750 hover:bg-red-100 rounded font-bold transition-colors cursor-pointer text-[10px]"
                  >
                    Delete Selected ({selectedRegIds.length})
                  </button>
                )}
                {eventRegistrations.filter(r => r.eventId === selectedEventRegs.id).length > 0 && (
                  <button
                    onClick={() => confirmDeleteAllForEvent(selectedEventRegs)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded font-bold transition-colors cursor-pointer text-[10px]"
                  >
                    Delete All Registrations
                  </button>
                )}
                <button
                  disabled={exportingStates[`${selectedEventRegs.id}-csv`]}
                  onClick={() => exportEventCSV(selectedEventRegs)}
                  className="px-3 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] text-slate-800 hover:border-[#FF9900] hover:text-[#FF9900] rounded font-bold transition-colors cursor-pointer text-[10px] disabled:opacity-50"
                >
                  {exportingStates[`${selectedEventRegs.id}-csv`] ? 'Preparing...' : 'Export CSV'}
                </button>
                <button
                  disabled={exportingStates[`${selectedEventRegs.id}-excel`]}
                  onClick={() => exportEventExcel(selectedEventRegs)}
                  className="px-3 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] text-slate-800 hover:border-[#FF9900] hover:text-[#FF9900] rounded font-bold transition-colors cursor-pointer text-[10px] disabled:opacity-50"
                >
                  {exportingStates[`${selectedEventRegs.id}-excel`] ? 'Preparing...' : 'Export Excel'}
                </button>
                <button
                  disabled={exportingStates[`${selectedEventRegs.id}-pdf`]}
                  onClick={() => exportEventPDF(selectedEventRegs)}
                  className="px-3 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] text-slate-800 hover:border-[#FF9900] hover:text-[#FF9900] rounded font-bold transition-colors cursor-pointer text-[10px] disabled:opacity-50"
                >
                  {exportingStates[`${selectedEventRegs.id}-pdf`] ? 'Preparing...' : 'Export PDF'}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#E2E8F0] rounded">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-sans">
                <thead className="bg-[#F6F8FA] font-display font-bold text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={
                          eventRegistrations.filter(r => r.eventId === selectedEventRegs.id).length > 0 &&
                          eventRegistrations.filter(r => r.eventId === selectedEventRegs.id).every((r) => selectedRegIds.includes(r.id))
                        }
                        onChange={(e) => {
                          const modalRegs = eventRegistrations.filter(r => r.eventId === selectedEventRegs.id);
                          if (e.target.checked) {
                            const newSelection = Array.from(new Set([...selectedRegIds, ...modalRegs.map(r => r.id)]));
                            setSelectedRegIds(newSelection);
                          } else {
                            const newSelection = selectedRegIds.filter(id => !modalRegs.some(r => r.id === id));
                            setSelectedRegIds(newSelection);
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-[#E2E8F0] accent-[#FF9900] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">University</th>
                    <th className="px-4 py-3 text-left">Program</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                  {eventRegistrations
                    .filter(r => r.eventId === selectedEventRegs.id)
                    .map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedRegIds.includes(reg.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                  setSelectedRegIds([...selectedRegIds, reg.id]);
                              } else {
                                  setSelectedRegIds(selectedRegIds.filter(id => id !== reg.id));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-[#E2E8F0] accent-[#FF9900] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#111827]">{reg.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] select-all">{reg.email}</td>
                        <td className="px-4 py-3 truncate max-w-[150px]">{reg.university}</td>
                        <td className="px-4 py-3">{reg.program}</td>
                        <td className="px-4 py-3 font-medium">{reg.year}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            reg.status === 'Approved' || reg.status === 'Attended'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : reg.status === 'Rejected' || reg.status === 'Cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-orange-50 text-[#FF9900] border border-orange-200'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setViewItem(reg)}
                            className="text-brand-navy hover:text-[#FF9900] font-bold cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => updateEventRegStatus(reg.id, 'Approved')}
                            className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateEventRegStatus(reg.id, 'Rejected')}
                            className="text-red-500 hover:text-red-655 font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => updateEventRegStatus(reg.id, 'Attended')}
                            className="text-indigo-650 hover:text-indigo-850 font-bold cursor-pointer"
                          >
                            Attended
                          </button>
                          <button
                            onClick={() => confirmDeleteIndividual(reg)}
                            className="text-red-600 hover:text-red-750 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  {eventRegistrations.filter(r => r.eventId === selectedEventRegs.id).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                        No registrations recorded for this event yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button onClick={() => setSelectedEventRegs(null)} className="px-4 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded font-semibold cursor-pointer hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE REGISTRATION CONFIRMATION DIALOG */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-5 font-sans">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-display font-extrabold text-sm text-red-650">
                  {deleteConfirmation.type === 'all-event'
                    ? `Delete all registrations for ${deleteConfirmation.targetName}?`
                    : 'Delete Registration Data?'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-slate-700 leading-relaxed font-medium">
                This action will permanently delete the selected student registration data. This action cannot be undone.
              </p>

              {/* Record Count Audit Statistics */}
              <div className="p-3 bg-red-50 border border-red-100 text-red-750 font-semibold rounded flex items-center space-x-2">
                <svg className="h-4 w-4 text-red-655 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>
                  You are about to permanently delete <strong className="underline decoration-wavy decoration-red-650">{deleteConfirmation.count}</strong> registration record{deleteConfirmation.count === 1 ? '' : 's'}.
                </span>
              </div>

              {/* Mandatory Privacy Rule Warning */}
              <div className="p-3.5 bg-amber-50 border border-amber-250 text-amber-850 rounded space-y-1">
                <span className="font-bold text-[9px] uppercase tracking-wider block text-amber-750 font-sans">Important Privacy Rule</span>
                <p className="text-[10px] leading-relaxed font-sans font-medium">
                  Delete registration data only when it is no longer required for legitimate community/event administration purposes.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-1.5 bg-[#F6F8FA] border border-slate-200 rounded font-semibold cursor-pointer hover:bg-slate-100 font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded cursor-pointer transition-colors font-sans"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VIEW CONTACT MESSAGE DETAILS MODAL */}
      {selectedContactMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto font-sans text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-display font-bold text-sm text-[#111827]">Contact Message Details</h3>
                <span className="text-[9px] font-mono text-slate-400">ID: {selectedContactMessage.id}</span>
              </div>
              <button onClick={() => setSelectedContactMessage(null)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md border border-slate-100">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">From</span>
                <span className="font-bold text-slate-800">{selectedContactMessage.name}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Email Address</span>
                <span className="font-mono text-slate-800 select-all font-semibold">{selectedContactMessage.email}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Subject</span>
                <span className="font-medium text-slate-800">{selectedContactMessage.subject}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Submitted At</span>
                <span className="font-mono text-slate-800">{new Date(selectedContactMessage.date).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Message Body</span>
              <div className="p-4 bg-white border border-slate-200 rounded text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text font-sans font-medium">
                {selectedContactMessage.message}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex space-x-2">
                {selectedContactMessage.status !== 'REPLIED' && (
                  <button
                    onClick={() => markContactMessageStatus(selectedContactMessage.id, 'REPLIED')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded cursor-pointer transition-colors"
                  >
                    Mark as Replied
                  </button>
                )}
                {selectedContactMessage.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => markContactMessageStatus(selectedContactMessage.id, 'ARCHIVED')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded cursor-pointer transition-colors"
                  >
                    Archive
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                <a
                  href={`mailto:${selectedContactMessage.email}?subject=Re:%20${encodeURIComponent(selectedContactMessage.subject)}`}
                  onClick={() => markContactMessageStatus(selectedContactMessage.id, 'REPLIED')}
                  className="px-4 py-1.5 bg-[#FF9900] hover:bg-orange-600 text-white font-bold rounded cursor-pointer transition-colors inline-flex items-center space-x-1"
                >
                  ✉️ Reply via Email
                </a>
                <button
                  onClick={() => setSelectedContactMessage(null)}
                  className="px-4 py-1.5 bg-[#F6F8FA] border border-slate-200 rounded font-semibold cursor-pointer hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONTACT MESSAGE CONFIRMATION DIALOG */}
      {contactDeleteConfirmation && (
        <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-5 font-sans">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-sm text-red-650">Delete Contact Message?</h3>
              <button
                type="button"
                onClick={() => setContactDeleteConfirmation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-slate-700 leading-relaxed font-medium">
              This action will permanently delete this contact message. This action cannot be undone.
            </p>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setContactDeleteConfirmation(null)}
                className="px-4 py-1.5 bg-[#F6F8FA] border border-slate-200 rounded font-semibold cursor-pointer hover:bg-slate-100 font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteContactMessageConfirmed(contactDeleteConfirmation)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded cursor-pointer transition-colors font-sans"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE SYSTEM PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xl max-w-md w-full overflow-hidden transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-slate-50 px-6 py-4">
              <h3 className="font-display font-extrabold text-base text-[#111827]">
                Change System Password
              </h3>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setSettingsForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (settingsForm.newPassword !== settingsForm.confirmPassword) {
                alert('New passwords do not match.');
                return;
              }
              const res = await apiCall({
                action: 'change-password',
                currentPassword: settingsForm.currentPassword,
                newPassword: settingsForm.newPassword
              });
              if (res && res.success) {
                alert('Password updated successfully!');
                setSettingsForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setIsPasswordModalOpen(false);
              } else {
                alert(res.error || 'Failed to update password.');
              }
            }} className="p-6 space-y-4">
              <div className="space-y-1.5 text-xs font-sans">
                <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={settingsForm.currentPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>
              <div className="space-y-1.5 text-xs font-sans">
                <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={settingsForm.newPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>
              <div className="space-y-1.5 text-xs font-sans">
                <label className="font-bold text-slate-700 uppercase tracking-wider block font-display">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={settingsForm.confirmPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
                />
              </div>
              
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSettingsForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded shadow-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-white text-xs font-bold rounded shadow-sm cursor-pointer transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
