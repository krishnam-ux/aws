'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DigitalIdentity, DigitalIdStats, DigitalIdType, DigitalIdStatus, VerificationLog } from '@/types/digitalIdentity';
import { formatDisplayDate, getVerificationUrl, getCardUrl } from '@/lib/digitalIdUtils';

interface AdminDigitalIdManagerProps {
  token?: string | null;
}

const MEMBER_TYPES: DigitalIdType[] = [
  'Founding Member',
  'Core Team',
  'Anchor & Speaker',
  'Other'
];

const initialFormState = {
  fullName: '',
  memberType: 'Core Team' as DigitalIdType,
  role: '',
  domain: '',
  university: 'Chandigarh University – Uttar Pradesh',
  course: '',
  branch: '',
  currentYear: '',
  email: '',
  linkedin: '',
  joiningDate: '',
  additionalInformation: '',
  photoUrl: ''
};

export default function AdminDigitalIdManager({ token }: AdminDigitalIdManagerProps) {
  const [items, setItems] = useState<DigitalIdentity[]>([]);
  const [stats, setStats] = useState<DigitalIdStats>({
    total: 0,
    active: 0,
    suspended: 0,
    revoked: 0,
    recentlyIssued: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'id'>('recent');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Active / Selected item states
  const [selectedItem, setSelectedItem] = useState<DigitalIdentity | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [formData, setFormData] = useState(initialFormState);
  const [revokeReason, setRevokeReason] = useState('');
  const [itemLogs, setItemLogs] = useState<VerificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch Items & Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/digital-ids', {
        headers: {
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to fetch Digital IDs.');
      }
    } catch (err: any) {
      console.error('Error fetching digital IDs:', err);
      setActionError('Network error while loading digital IDs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered & Sorted list
  const domainsList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.domain && item.domain.trim()) set.add(item.domain.trim());
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch =
        !searchQuery ||
        item.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.publicId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.domain?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === 'All' || item.memberType === typeFilter;
      const matchStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchDomain = domainFilter === 'All' || item.domain === domainFilter;

      return matchSearch && matchType && matchStatus && matchDomain;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'id') return a.publicId.localeCompare(b.publicId);
      return new Date(b.createdAt || b.issuedAt).getTime() - new Date(a.createdAt || a.issuedAt).getTime();
    });
  }, [items, searchQuery, typeFilter, statusFilter, domainFilter, sortBy]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setActionError('Only JPG, JPEG, PNG, and WebP images are allowed.');
      setTimeout(() => setActionError(''), 4000);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setActionError('Photo size exceeds 2MB maximum limit.');
      setTimeout(() => setActionError(''), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, photoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Submit Issue Digital ID
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!formData.fullName || !formData.role || !formData.memberType || !formData.photoUrl) {
      setActionError('Full Name, Member Type, Role, and Profile Photo are required.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/digital-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        },
        body: JSON.stringify({
          action: 'create',
          data: formData
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setActionSuccess(`Digital ID ${resData.item.publicId} issued successfully!`);
        setIsCreateModalOpen(false);
        setFormData(initialFormState);
        fetchData();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(resData.error || 'Failed to issue Digital ID.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error while issuing Digital ID.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit Digital ID
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setActionError('');
    setActionSuccess('');

    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/digital-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        },
        body: JSON.stringify({
          action: 'update',
          id: selectedItem.id,
          data: formData
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setActionSuccess(`Digital ID ${selectedItem.publicId} profile updated successfully!`);
        setIsEditModalOpen(false);
        setSelectedItem(null);
        fetchData();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(resData.error || 'Failed to update Digital ID.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error while updating Digital ID.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change: Activate / Suspend / Revoke
  const handleStatusChange = async (targetItem: DigitalIdentity, nextStatus: DigitalIdStatus, reason?: string) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/digital-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        },
        body: JSON.stringify({
          action: 'change-status',
          publicId: targetItem.publicId,
          status: nextStatus,
          reason: reason || undefined
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setActionSuccess(`Status for ${targetItem.publicId} updated to ${nextStatus}.`);
        setIsRevokeModalOpen(false);
        setRevokeReason('');
        fetchData();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(resData.error || 'Failed to update status.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error while updating status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: DigitalIdentity) => {
    setSelectedItem(item);
    setFormData({
      fullName: item.fullName || '',
      memberType: item.memberType || 'Core Team',
      role: item.role || '',
      domain: item.domain || '',
      university: item.university || 'Chandigarh University – Uttar Pradesh',
      course: item.course || '',
      branch: item.branch || '',
      currentYear: item.currentYear || '',
      email: item.email || '',
      linkedin: item.linkedin || '',
      joiningDate: item.joiningDate || '',
      additionalInformation: item.additionalInformation || '',
      photoUrl: item.photoUrl || ''
    });
    setIsEditModalOpen(true);
  };

  // Open View Details Modal
  const openViewModal = (item: DigitalIdentity) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  // Open Revoke Confirmation Modal
  const openRevokeModal = (item: DigitalIdentity) => {
    setSelectedItem(item);
    setRevokeReason('');
    setIsRevokeModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (item: DigitalIdentity) => {
    setSelectedItem(item);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  // Submit Permanent Delete
  const handleDeleteSubmit = async () => {
    if (!selectedItem) return;
    try {
      setActionLoading(true);
      setActionError('');
      setActionSuccess('');

      const res = await fetch(`/api/admin/digital-ids?id=${encodeURIComponent(selectedItem.id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        }
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setActionSuccess(resData.message || `Digital ID ${selectedItem.publicId} permanently deleted.`);
        setIsDeleteModalOpen(false);
        setIsViewModalOpen(false);
        setSelectedItem(null);
        setDeleteConfirmText('');
        fetchData();
        setTimeout(() => setActionSuccess(''), 5000);
      } else {
        setActionError(resData.error || 'Failed to delete Digital ID.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error while deleting Digital ID.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open QR Modal
  const openQrModal = (item: DigitalIdentity) => {
    setSelectedItem(item);
    setIsQrModalOpen(true);
  };

  // Open Logs Modal
  const openLogsModal = async (item: DigitalIdentity) => {
    setSelectedItem(item);
    setIsLogsModalOpen(true);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/digital-ids?publicId=${item.publicId}`, {
        headers: {
          'Authorization': `Bearer ${token || 'awssbg-admin-session-token-secure-hash'}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItemLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  // Helper for Copy Link
  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setActionSuccess(`${label} copied to clipboard!`);
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-red-500 font-bold">✕</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* 1. HEADER & TOP STATS BAR */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[#081A2A] text-[#FF9900] flex items-center justify-center font-bold text-lg shadow-inner">
              🪪
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">
                Digital ID Cards &amp; Public Verification Hub
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Official identity credentials &amp; real-time public verification registry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setFormData(initialFormState);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] hover:text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span>+ Issue Digital ID</span>
          </button>
          <button
            onClick={fetchData}
            title="Refresh registry"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total IDs</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-1">All issued identities</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-display font-extrabold text-emerald-600 mt-1">{stats.active}</p>
          <p className="text-[10px] text-slate-400 mt-1">Live verified status</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Suspended</p>
          <p className="text-2xl font-display font-extrabold text-amber-600 mt-1">{stats.suspended}</p>
          <p className="text-[10px] text-slate-400 mt-1">Temporarily inactive</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Revoked</p>
          <p className="text-2xl font-display font-extrabold text-red-600 mt-1">{stats.revoked}</p>
          <p className="text-[10px] text-slate-400 mt-1">Permanently revoked</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Recently Issued</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 mt-1">{stats.recentlyIssued.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Latest batch in registry</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name, Digital ID, Role, Email..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#FF9900] focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Member Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              <option value="All">All Member Types</option>
              {MEMBER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#FF9900]"
            >
              <option value="recent">Recently Issued</option>
              <option value="name">Name (A-Z)</option>
              <option value="id">Digital ID (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary row for domain filter if domains exist */}
        {domainsList.length > 0 && (
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs text-slate-500 overflow-x-auto">
            <span className="font-semibold text-slate-600">Domain:</span>
            <button
              onClick={() => setDomainFilter('All')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                domainFilter === 'All'
                  ? 'bg-[#081A2A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {domainsList.map(dom => (
              <button
                key={dom}
                onClick={() => setDomainFilter(dom)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                  domainFilter === dom
                    ? 'bg-[#081A2A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. DIGITAL IDS DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Photo</th>
                <th scope="col" className="px-4 py-3">Full Name</th>
                <th scope="col" className="px-4 py-3">Member Type</th>
                <th scope="col" className="px-4 py-3">Digital ID</th>
                <th scope="col" className="px-4 py-3">Role / Position</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Issued Date</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin mr-2">⚙️</div>
                    Loading Digital ID Registry...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No Digital IDs found matching current filters. Click <strong>+ Issue Digital ID</strong> to register an identity.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isRevoked = item.status === 'REVOKED';
                  const isSuspended = item.status === 'SUSPENDED';
                  const isActive = item.status === 'ACTIVE';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Photo Thumbnail */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-display font-extrabold text-slate-600 text-sm">
                              {item.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name & Domain */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-slate-900 leading-tight">{item.fullName}</p>
                        {item.domain && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.domain}</p>
                        )}
                        {item.email && (
                          <p className="text-[10px] text-slate-400">{item.email}</p>
                        )}
                      </td>

                      {/* Member Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.memberType === 'Founding Member'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.memberType === 'Core Team'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : item.memberType === 'Anchor & Speaker'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.memberType}
                        </span>
                      </td>

                      {/* Digital ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[11px]">
                          {item.publicId}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{item.role}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : isSuspended
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : isSuspended ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Issued Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDisplayDate(item.issuedAt || item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Digital Card Webpage */}
                          <a
                            href={getCardUrl(item.publicId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Interactive Digital Card"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            💳
                          </a>

                          {/* Live Verification Page */}
                          <a
                            href={getVerificationUrl(item.publicId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Live Public Verification Page"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded transition-colors font-bold"
                          >
                            ✓
                          </a>

                          {/* Download PDF Card */}
                          <a
                            href={`/api/digital-ids/pdf/${item.publicId}`}
                            download
                            title="Download PDF Card Badge"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            📄
                          </a>

                          {/* QR Modal */}
                          <button
                            onClick={() => openQrModal(item)}
                            title="View & Download QR Code"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                          >
                            📱
                          </button>

                          {/* Copy Verification Link */}
                          <button
                            onClick={() => copyToClipboard(getVerificationUrl(item.publicId), 'Verification Link')}
                            title="Copy Public Verification Link"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                          >
                            🔗
                          </button>

                          {/* Details / Edit / Status Dropdown */}
                          <button
                            onClick={() => openViewModal(item)}
                            title="View Member Full Profile"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer text-xs font-semibold"
                          >
                            👁️
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Member Information"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer text-xs font-semibold"
                          >
                            ✏️
                          </button>

                          {/* Status buttons */}
                          {isActive && (
                            <button
                              onClick={() => handleStatusChange(item, 'SUSPENDED')}
                              title="Suspend this Digital ID"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold border border-amber-200 transition-colors cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              onClick={() => handleStatusChange(item, 'ACTIVE')}
                              title="Reactivate this Digital ID"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Activate
                            </button>
                          )}

                          {!isRevoked && (
                            <button
                              onClick={() => openRevokeModal(item)}
                              title="Revoke this Digital ID"
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200 transition-colors cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}

                          {/* Audit Logs */}
                          <button
                            onClick={() => openLogsModal(item)}
                            title="View Scan Audit History"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                          >
                            📊
                          </button>

                          {/* Permanent Delete Action */}
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Permanently Delete Digital ID"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors cursor-pointer text-xs font-semibold border border-red-200"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. ISSUE NEW DIGITAL ID MODAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-[#FF9900]/10 text-[#FF9900] flex items-center justify-center font-bold text-lg">
                  🪪
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-base">Issue New Digital ID</h3>
                  <p className="text-xs text-slate-500">Auto-generates permanent ID, QR code &amp; live verification</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Photo Upload Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Profile Photo *</label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full border-2 border-slate-300 bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl text-slate-400">👤</span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handlePhotoUpload}
                      required={!formData.photoUrl}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#081A2A] file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">JPG, JPEG, PNG, or WebP. Maximum size 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Required Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Abhay Shukla"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Member Type *</label>
                  <select
                    required
                    value={formData.memberType}
                    onChange={(e) => setFormData({ ...formData, memberType: e.target.value as DigitalIdType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900] bg-white"
                  >
                    {MEMBER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Required Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Position *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. AWS Student Community Leader"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g. Cloud & Infrastructure / AI & ML"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Academic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">University</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Course / Branch</label>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    placeholder="e.g. B.Tech CSE (Cloud)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Year</label>
                  <input
                    type="text"
                    value={formData.currentYear}
                    onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                    placeholder="e.g. 3rd Year"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Contact & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="member@culko.in"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    placeholder="e.g. August 2026"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Additional Information</label>
                <textarea
                  rows={2}
                  value={formData.additionalInformation}
                  onChange={(e) => setFormData({ ...formData, additionalInformation: e.target.value })}
                  placeholder="Special achievements, certs, or notes..."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] hover:text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {actionLoading ? 'Issuing ID...' : '✓ Issue Digital ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. EDIT DIGITAL ID MODAL */}
      {/* ======================================================== */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">
                  Edit Digital ID — <span className="font-mono text-[#FF9900]">{selectedItem.publicId}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Digital ID and QR URL remain permanent. Updates reflect instantly on card and verification.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Photo Upload Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Update Profile Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full border-2 border-slate-300 bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl text-slate-400">👤</span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handlePhotoUpload}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#081A2A] file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">Leave unchanged to keep current photo.</p>
                  </div>
                </div>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Member Type *</label>
                  <select
                    required
                    value={formData.memberType}
                    onChange={(e) => setFormData({ ...formData, memberType: e.target.value as DigitalIdType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900] bg-white"
                  >
                    {MEMBER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Position *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Academic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">University</label>
                  <input
                    type="text"
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Course / Branch</label>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Year</label>
                  <input
                    type="text"
                    value={formData.currentYear}
                    onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Contact & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Additional Information</label>
                <textarea
                  rows={2}
                  value={formData.additionalInformation}
                  onChange={(e) => setFormData({ ...formData, additionalInformation: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#FF9900]"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#EC7211] text-[#081A2A] hover:text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. REVOKE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isRevokeModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-bold">
                ⚠
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Revoke Digital ID?</h3>
                <p className="text-xs text-red-600 font-semibold">{selectedItem.publicId} — {selectedItem.fullName}</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800 space-y-1">
              <p className="font-bold">Important Security Notice:</p>
              <p>After revocation, this Digital ID will no longer verify as active in the official verification registry. The permanent ID will remain reserved and never reused.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Revocation *</label>
              <textarea
                required
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Completed tenure / Departed organization / Replaced credential"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-500"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !revokeReason.trim()}
                onClick={() => handleStatusChange(selectedItem, 'REVOKED', revokeReason)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. VIEW MEMBER FULL DETAILS MODAL */}
      {/* ======================================================== */}
      {isViewModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                  {selectedItem.photoUrl ? (
                    <img src={selectedItem.photoUrl} alt={selectedItem.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-extrabold text-slate-600 text-lg">{selectedItem.fullName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-base">{selectedItem.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedItem.publicId} • {selectedItem.memberType}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Role</span>
                  <span className="font-semibold text-slate-800">{selectedItem.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className={`inline-block font-bold ${
                    selectedItem.status === 'ACTIVE' ? 'text-emerald-600' : selectedItem.status === 'SUSPENDED' ? 'text-amber-600' : 'text-red-600'
                  }`}>{selectedItem.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Domain</span>
                  <span className="font-semibold text-slate-800">{selectedItem.domain || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Date</span>
                  <span className="font-semibold text-slate-800">{formatDisplayDate(selectedItem.issuedAt)}</span>
                </div>
              </div>

              {selectedItem.email && (
                <div className="p-2 border-b border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold">Email:</span>
                  <span className="font-medium text-slate-800">{selectedItem.email}</span>
                </div>
              )}
              {selectedItem.university && (
                <div className="p-2 border-b border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold">University:</span>
                  <span className="font-medium text-slate-800">{selectedItem.university}</span>
                </div>
              )}
              {(selectedItem.course || selectedItem.branch) && (
                <div className="p-2 border-b border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold">Course / Branch:</span>
                  <span className="font-medium text-slate-800">{selectedItem.course} {selectedItem.branch} ({selectedItem.currentYear || ''})</span>
                </div>
              )}
              {selectedItem.linkedin && (
                <div className="p-2 border-b border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold">LinkedIn:</span>
                  <a href={selectedItem.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {selectedItem.linkedin}
                  </a>
                </div>
              )}
              {selectedItem.additionalInformation && (
                <div className="p-2 bg-amber-50/50 rounded border border-amber-100">
                  <span className="text-slate-500 block text-[10px] font-bold">Notes:</span>
                  <span className="text-slate-700">{selectedItem.additionalInformation}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <a
                href={getCardUrl(selectedItem.publicId)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#081A2A] text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Open Card Page ↗
              </a>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openDeleteModal(selectedItem);
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  🗑️ Delete ID
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. QR CODE MODAL */}
      {/* ======================================================== */}
      {isQrModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-slate-900 text-sm">Official QR Code</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <img
                src={`/api/digital-ids/qr/${selectedItem.publicId}?format=png`}
                alt="QR Code"
                className="h-48 w-48 object-contain rounded shadow-sm border border-slate-200 bg-white"
              />
              <p className="font-mono font-bold text-slate-800 mt-2 text-xs">{selectedItem.publicId}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{getVerificationUrl(selectedItem.publicId)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/api/digital-ids/qr/${selectedItem.publicId}?format=png`}
                download={`qr-${selectedItem.publicId}.png`}
                className="px-3 py-2 bg-[#081A2A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold text-center"
              >
                Download PNG
              </a>
              <a
                href={`/api/digital-ids/qr/${selectedItem.publicId}?format=svg`}
                download={`qr-${selectedItem.publicId}.svg`}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold text-center border border-slate-200"
              >
                Download SVG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. VERIFICATION AUDIT LOGS MODAL */}
      {/* ======================================================== */}
      {isLogsModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8 animate-scaleUp max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Verification Scan History</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedItem.publicId} — {selectedItem.fullName}</p>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            {logsLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading audit records...</div>
            ) : itemLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No public verifications recorded yet for this ID.
              </div>
            ) : (
              <div className="space-y-2">
                {itemLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.result === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                        log.result === 'SUSPENDED' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.result}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Device: {log.deviceType || 'Unknown'} • Browser: {log.browser || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-medium">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. PERMANENT DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isDeleteModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-300 max-w-md w-full p-6 space-y-5 animate-scaleUp my-8">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-inner">
                🗑️
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">Permanently Delete Digital ID?</h3>
                <p className="text-xs text-red-600 font-mono font-bold">{selectedItem.publicId} • {selectedItem.fullName}</p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-2 leading-relaxed">
              <div className="flex items-center space-x-1.5 font-bold text-red-700">
                <span>⚠️</span>
                <span>Irreversible Permanent Action</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-red-800">
                <li>This will permanently remove the member record, profile data, and verification registry entry.</li>
                <li>Public verification at <strong className="font-mono text-[10px]">/verify/{selectedItem.publicId}</strong> will return <strong>NOT FOUND (404)</strong>.</li>
                <li>The ID number <strong className="font-mono text-[10px]">{selectedItem.publicId}</strong> will <strong>NEVER be reused or reassigned</strong>.</li>
                <li>Future Digital IDs continue forward monotonically in sequence.</li>
              </ul>
            </div>

            {/* Target Identity Summary */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-800">{selectedItem.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member Type:</span>
                <span className="font-semibold text-slate-800">{selectedItem.memberType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-semibold text-slate-800">{selectedItem.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-slate-800">{selectedItem.status}</span>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <strong className="font-mono text-red-600">{selectedItem.publicId}</strong> or <strong className="font-mono text-red-600">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Type ${selectedItem.publicId} or DELETE`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  actionLoading ||
                  (deleteConfirmText.trim() !== selectedItem.publicId &&
                   deleteConfirmText.trim().toUpperCase() !== 'DELETE')
                }
                onClick={handleDeleteSubmit}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {actionLoading ? (
                  <>
                    <span className="inline-block animate-spin text-xs">⚙️</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Permanently Delete ID</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
