'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileImage,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sliders,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { EventSettings, GameConfig, RegistrationRecord } from '@/lib/types';
import { GalaAiChat } from './GalaAiChat';

interface DashboardData {
  kpis: {
    totalEntries: number;
    totalPlayers: number;
    totalFeesDue: number;
    totalVerifiedPaid: number;
    totalOutstanding: number;
    pendingApproval: number;
    approvedEntries: number;
    waitlistedEntries: number;
    playersVerified: number;
    playersPending: number;
    playersNotEligible: number;
    cashEntries: number;
    jazzcashEntries: number;
    cashVerified: number;
    jazzcashVerified: number;
    cashPending: number;
    jazzcashPending: number;
  };
  gameStats: Record<
    string,
    {
      entries: number;
      players: number;
      feesDue: number;
      verifiedPaid: number;
      outstanding: number;
      approved: number;
      pending: number;
    }
  >;
}

interface ReceiptModalData {
  registration_id: string;
  captain_name: string;
  captain_student_id: string;
  game_name: string;
  fee_due: number;
  payment_status: string;
  transaction_ref: string;
  receipt_data: string | null;
}

type AdminTab = 'desk' | 'metrics' | 'ai' | 'settings';

export function AdminPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [quickFilter, setQuickFilter] = useState<
    'all' | 'needs_verification' | 'jazzcash_pending' | 'cash_pending' | 'paid'
  >('all');

  const [activeTab, setActiveTab] = useState<AdminTab>('desk');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);

  const [receiptModal, setReceiptModal] = useState<ReceiptModalData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const [payModalReg, setPayModalReg] = useState<RegistrationRecord | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [manualMethod, setManualMethod] = useState<'Cash' | 'JazzCash'>('Cash');
  const [manualRef, setManualRef] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    gameName: 'Cricket',
    captainName: '',
    studentId: '',
    department: '',
    phone: '',
    email: '',
    teamName: '',
    paymentMethod: 'Cash' as 'Cash' | 'JazzCash',
    transactionRef: '',
    markPaidAndApproved: true,
    notes: '',
  });

  const [savingAction, setSavingAction] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(Boolean(d.authenticated));
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/admin/dashboard');
    if (res.ok) {
      setDashboard(await res.json());
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (gameFilter) params.set('game', gameFilter);
      if (methodFilter) params.set('method', methodFilter);
      if (payStatusFilter) params.set('paymentStatus', payStatusFilter);

      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } finally {
      setLoadingRecords(false);
    }
  }, [searchQuery, gameFilter, methodFilter, payStatusFilter]);

  const loadGamesAndSettings = useCallback(async () => {
    const [gRes, sRes] = await Promise.all([
      fetch('/api/admin/games'),
      fetch('/api/admin/settings'),
    ]);
    if (gRes.ok) {
      const gData = await gRes.json();
      setGames(gData.games || []);
    }
    if (sRes.ok) {
      const sData = await sRes.json();
      setSettings(sData.settings || null);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadDashboard();
      loadGamesAndSettings();
    }
  }, [authenticated, loadDashboard, loadGamesAndSettings]);

  useEffect(() => {
    if (!authenticated) return;
    const t = setTimeout(() => {
      loadRecords();
    }, 220);
    return () => clearTimeout(t);
  }, [authenticated, loadRecords]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Incorrect password');
      } else {
        setAuthenticated(true);
        setPassword('');
      }
    } catch {
      setLoginError('Network error while logging in');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  const handleQuickApprove = async (regId: string, name: string) => {
    if (!confirm(`Verify payment and approve registration ${regId} for ${name}?`)) return;
    setSavingAction(true);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: regId, verifiedBy: 'Organizer Desk' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Approval failed');
      }
      showToast(`Verified & Approved ${regId}!`);
      setReceiptModal(null);
      await Promise.all([loadRecords(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval error');
    } finally {
      setSavingAction(false);
    }
  };

  const openReceipt = async (regId: string) => {
    setLoadingReceipt(true);
    try {
      const res = await fetch(`/api/admin/receipt/${encodeURIComponent(regId)}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptModal(data.receipt);
      }
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleStatusChange = async (regId: string, status: string) => {
    const res = await fetch(`/api/admin/registrations/${encodeURIComponent(regId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationStatus: status }),
    });
    if (res.ok) {
      showToast(`${regId} marked ${status}`);
      await Promise.all([loadRecords(), loadDashboard()]);
    }
  };

  const handleDeleteReg = async (regId: string) => {
    if (!confirm(`Permanently delete registration ${regId} and all its players/payments?`)) return;
    const res = await fetch(`/api/admin/registrations/${encodeURIComponent(regId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast(`Deleted ${regId}`);
      await Promise.all([loadRecords(), loadDashboard()]);
    }
  };

  const handlePlayerEligChange = async (playerId: number, status: string) => {
    const res = await fetch(`/api/admin/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibilityStatus: status }),
    });
    if (res.ok) {
      showToast(`Player eligibility updated to ${status}`);
      await Promise.all([loadRecords(), loadDashboard()]);
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalReg) return;
    setSavingAction(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: payModalReg.registration_id,
          amount: Number(manualAmount),
          method: manualMethod,
          reference: manualRef,
          status: 'Verified',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to record payment');
      }
      showToast(`Payment recorded for ${payModalReg.registration_id}`);
      setPayModalReg(null);
      setManualAmount('');
      setManualRef('');
      await Promise.all([loadRecords(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment error');
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddDeskEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAction(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add entry');
      }
      showToast(`Added ${data.registrationId} successfully!`);
      setAddModalOpen(false);
      setNewEntry({
        gameName: games[0]?.name || 'Cricket',
        captainName: '',
        studentId: '',
        department: '',
        phone: '',
        email: '',
        teamName: '',
        paymentMethod: 'Cash',
        transactionRef: '',
        markPaidAndApproved: true,
        notes: '',
      });
      await Promise.all([loadRecords(), loadDashboard()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setSavingAction(false);
    }
  };

  const handleUpdateGame = async (game: GameConfig) => {
    const res = await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    if (res.ok) {
      const d = await res.json();
      setGames(d.games);
      showToast(`Saved ${game.name} rules`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      showToast('Event settings saved to Neon DB!');
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-[#0A1226]" />
      </div>
    );
  }

  // LOGIN GATE
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#1A2B52_0%,#060B18_85%)] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0A1226] text-amber-300 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">
            Organizer Desk Login
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Mechanical Sports Gala 2026 — Verification, Database Management &amp; Gala AI
          </p>

          {loginError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                Organizer Password / PIN
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Sign In to Admin Portal
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0A1226]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Registration Form
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0A1226] text-amber-300 border border-amber-400/40 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-[radial-gradient(circle_at_10%_10%,#1A2B52_0%,#060B18_90%)] text-white px-4 sm:px-8 py-5 border-b-2 border-amber-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Mechanical Sports Gala — Organizer Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Neon DB Live Control · Cash &amp; JazzCash Verification · Groq AI Assistant
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('desk');
                setAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A1226] text-xs sm:text-sm font-bold cursor-pointer transition"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-semibold cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4" /> Gala AI
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-100 text-xs sm:text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Public Form
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-[#0A1226]">
            <div className="text-[11px] font-bold uppercase text-slate-500">Entries</div>
            <div className="font-display text-2xl font-bold text-slate-900">
              {kpis?.totalEntries ?? 0}
            </div>
            <div className="text-[11px] text-slate-500">
              {kpis?.approvedEntries ?? 0} Appr · {kpis?.pendingApproval ?? 0} Pnd
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-blue-600">
            <div className="text-[11px] font-bold uppercase text-slate-500">Athletes</div>
            <div className="font-display text-2xl font-bold text-slate-900">
              {kpis?.totalPlayers ?? 0}
            </div>
            <div className="text-[11px] text-slate-500">
              {kpis?.playersVerified ?? 0} Ver · {kpis?.playersPending ?? 0} Pnd
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-amber-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Due</div>
            <div className="font-display text-xl font-bold text-slate-900">
              {(kpis?.totalFeesDue ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">All registrations</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">
              Verified Paid
            </div>
            <div className="font-display text-xl font-bold text-emerald-700">
              {(kpis?.totalVerifiedPaid ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">
              Cash: {(kpis?.cashVerified ?? 0).toLocaleString()} · JC:{' '}
              {(kpis?.jazzcashVerified ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-red-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">Outstanding</div>
            <div className="font-display text-xl font-bold text-red-600">
              {(kpis?.totalOutstanding ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">Unverified balance</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-purple-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">Methods</div>
            <div className="font-display text-lg font-bold text-slate-900 mt-0.5">
              {kpis?.cashEntries ?? 0} Cash / {kpis?.jazzcashEntries ?? 0} JC
            </div>
            <div className="text-[11px] text-slate-500">
              JC: {settings?.jazzcash_number || '03281159050'}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-5">
          {[
            { id: 'desk', label: 'Desk Verification', icon: Search },
            { id: 'metrics', label: 'Sports & CSV', icon: BarChart3 },
            { id: 'ai', label: 'Ask Gala AI', icon: Sparkles },
            { id: 'settings', label: 'Games & Settings', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-[#0A1226] text-amber-300 border-[#0A1226] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DESK VERIFICATION & REGISTRATIONS */}
        {activeTab === 'desk' && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              {/* 1-Click Team Workflow Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Views:
                </span>
                {[
                  {
                    id: 'all',
                    label: 'All Entries',
                    apply: () => {
                      setMethodFilter('');
                      setPayStatusFilter('');
                    },
                  },
                  {
                    id: 'needs_verification',
                    label: 'Needs Verification (Unpaid)',
                    apply: () => {
                      setMethodFilter('');
                      setPayStatusFilter('Unpaid');
                    },
                  },
                  {
                    id: 'jazzcash_pending',
                    label: 'JazzCash Receipts Pending',
                    apply: () => {
                      setMethodFilter('JazzCash');
                      setPayStatusFilter('Unpaid');
                    },
                  },
                  {
                    id: 'cash_pending',
                    label: 'Cash Desk Pending',
                    apply: () => {
                      setMethodFilter('Cash');
                      setPayStatusFilter('Unpaid');
                    },
                  },
                  {
                    id: 'paid',
                    label: 'Verified & Paid',
                    apply: () => {
                      setMethodFilter('');
                      setPayStatusFilter('Paid');
                    },
                  },
                ].map((pill) => {
                  const active = quickFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => {
                        setQuickFilter(pill.id as typeof quickFilter);
                        pill.apply();
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-[#0A1226] text-amber-300 shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Roll No (e.g. 2024-ME-104), Student Name, Team, Phone, or Reg ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#0A1226]/25 focus:border-[#0A1226] focus:outline-none text-sm font-medium"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={gameFilter}
                    onChange={(e) => setGameFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">All 10 Sports</option>
                    {games.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={methodFilter}
                    onChange={(e) => {
                      setMethodFilter(e.target.value);
                      setQuickFilter('all');
                    }}
                    className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">All Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="JazzCash">JazzCash</option>
                  </select>

                  <select
                    value={payStatusFilter}
                    onChange={(e) => {
                      setPayStatusFilter(e.target.value);
                      setQuickFilter('all');
                    }}
                    className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">All Pay Status</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      loadRecords();
                      loadDashboard();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Card View (< 1024px): Thumb-friendly zero-scroll desk verification */}
            <div className="lg:hidden space-y-3">
              {loadingRecords && records.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  Loading registrations from Neon DB...
                </div>
              ) : records.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No registrations found matching your search.
                </div>
              ) : (
                records.map((r) => {
                  const isPaid = r.payment_status === 'Paid';
                  const isExpanded = expandedRegId === r.registration_id;
                  return (
                    <div
                      key={`mob-${r.registration_id}`}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-xs text-[#0A1226]">
                            {r.registration_id}
                          </div>
                          <div className="font-bold text-slate-900 text-base leading-tight">
                            {r.game_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.team_name} ({r.format})
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm text-slate-900">
                            {r.fee_due.toLocaleString()} PKR
                          </div>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.payment_status === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.payment_method} · {r.payment_status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 text-sm">{r.captain_name}</strong>
                          <span className="font-mono font-bold text-[#0A1226]">
                            {r.captain_student_id}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          {r.department} · {r.contact_phone}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={r.registration_status}
                          onChange={(e) =>
                            handleStatusChange(r.registration_id, e.target.value)
                          }
                          className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          <option value="Pending Review">Pending Review</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Waitlisted">Waitlisted</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteReg(r.registration_id)}
                          className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                          title="Delete registration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {!isPaid ? (
                          <button
                            type="button"
                            disabled={savingAction}
                            onClick={() =>
                              handleQuickApprove(r.registration_id, r.captain_name)
                            }
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" /> Verify &amp; Approve
                          </button>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Paid
                          </div>
                        )}

                        {r.has_receipt ? (
                          <button
                            type="button"
                            onClick={() => openReceipt(r.registration_id)}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <FileImage className="w-3.5 h-3.5" /> View Receipt
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalReg(r);
                              setManualAmount(String(r.balance || r.fee_due));
                              setManualMethod(r.payment_method);
                            }}
                            className="inline-flex items-center justify-center gap-1 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Record Pay
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRegId(isExpanded ? null : r.registration_id)
                        }
                        className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {isExpanded ? 'Hide Roster' : `View Roster (${r.players?.length || r.player_count})`}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {(r.players || []).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">
                                  #{p.player_no} {p.full_name}
                                </div>
                                <div className="font-mono text-[11px] text-slate-600">
                                  {p.student_id} · {p.department}
                                </div>
                              </div>
                              <select
                                value={p.eligibility_status}
                                onChange={(e) =>
                                  handlePlayerEligChange(p.id, e.target.value)
                                }
                                className="px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-semibold shrink-0"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Verified">Verified</option>
                                <option value="Not Eligible">Not Eligible</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Records Table (>= 1024px, Zero-Overflow 6-Column Layout) */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                      <th className="py-3 px-3">Reg ID</th>
                      <th className="py-3 px-3">Sport &amp; Team</th>
                      <th className="py-3 px-3">Student / Roll No</th>
                      <th className="py-3 px-3">Payment &amp; Fee</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRecords && records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          Loading registrations from Neon DB...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          No registrations found matching your search.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const isPaid = r.payment_status === 'Paid';
                        const isExpanded = expandedRegId === r.registration_id;
                        return (
                          <React.Fragment key={r.registration_id}>
                            <tr className="border-b border-slate-200 hover:bg-slate-50/70">
                              <td className="py-3 px-3 font-mono font-bold text-xs text-[#0A1226] whitespace-nowrap">
                                {r.registration_id}
                                <div className="text-[10px] font-sans font-normal text-slate-400">
                                  {new Date(r.submitted_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 leading-tight">
                                  {r.game_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {r.team_name} ({r.format})
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 leading-tight">
                                  {r.captain_name}
                                </div>
                                <div className="font-mono text-xs font-bold text-[#0A1226]">
                                  {r.captain_student_id}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {r.department} · {r.contact_phone}
                                </div>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {r.fee_due.toLocaleString()} PKR{' '}
                                  <span className="text-[11px] font-semibold text-emerald-700">
                                    (Paid {r.verified_paid.toLocaleString()})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      r.payment_method === 'JazzCash'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {r.payment_method === 'JazzCash' ? (
                                      <Smartphone className="w-2.5 h-2.5" />
                                    ) : (
                                      <Banknote className="w-2.5 h-2.5" />
                                    )}
                                    {r.payment_method}
                                  </span>
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : r.payment_status === 'Partial'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {r.payment_status}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={r.registration_status}
                                  onChange={(e) =>
                                    handleStatusChange(r.registration_id, e.target.value)
                                  }
                                  className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                                >
                                  <option value="Pending Review">Pending Review</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Rejected">Rejected</option>
                                  <option value="Waitlisted">Waitlisted</option>
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {!isPaid ? (
                                    <button
                                      type="button"
                                      disabled={savingAction}
                                      onClick={() =>
                                        handleQuickApprove(r.registration_id, r.captain_name)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      <Zap className="w-3.5 h-3.5" /> Approve
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 px-1.5 py-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                    </span>
                                  )}

                                  {r.has_receipt && (
                                    <button
                                      type="button"
                                      onClick={() => openReceipt(r.registration_id)}
                                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      <FileImage className="w-3.5 h-3.5" /> Receipt
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayModalReg(r);
                                      setManualAmount(String(r.balance || r.fee_due));
                                      setManualMethod(r.payment_method);
                                    }}
                                    className="inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                                    title="Record manual or partial payment"
                                  >
                                    <Plus className="w-3 h-3" /> Pay
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRegId(isExpanded ? null : r.registration_id)
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                                  >
                                    <Users className="w-3.5 h-3.5" /> (
                                    {r.players?.length || r.player_count})
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReg(r.registration_id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete registration"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Player Roster */}
                            {isExpanded && (
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <td colSpan={6} className="p-4">
                                  <div className="text-xs font-bold uppercase text-slate-500 mb-2">
                                    Player Roster &amp; Eligibility — {r.registration_id}
                                  </div>
                                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-600">
                                        <tr>
                                          <th className="py-2 px-3">#</th>
                                          <th className="py-2 px-3">Full Name</th>
                                          <th className="py-2 px-3">Roll No / Student ID</th>
                                          <th className="py-2 px-3">Department</th>
                                          <th className="py-2 px-3">Phone</th>
                                          <th className="py-2 px-3">Eligibility</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(r.players || []).map((p) => (
                                          <tr key={p.id} className="border-t border-slate-100">
                                            <td className="py-2 px-3 font-bold">{p.player_no}</td>
                                            <td className="py-2 px-3 font-semibold text-slate-900">
                                              {p.full_name}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-bold text-[#0A1226]">
                                              {p.student_id}
                                            </td>
                                            <td className="py-2 px-3">{p.department}</td>
                                            <td className="py-2 px-3">{p.phone || '-'}</td>
                                            <td className="py-2 px-3">
                                              <select
                                                value={p.eligibility_status}
                                                onChange={(e) =>
                                                  handlePlayerEligChange(p.id, e.target.value)
                                                }
                                                className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-semibold"
                                              >
                                                <option value="Pending">Pending</option>
                                                <option value="Verified">Verified</option>
                                                <option value="Not Eligible">Not Eligible</option>
                                              </select>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SPORT METRICS & CSV EXPORTS */}
        {activeTab === 'metrics' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Export Live Database to Excel / CSV
                </h2>
                <p className="text-xs text-slate-500">
                  Download clean UTF-8 spreadsheets anytime for match fixtures or financial audits.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/api/admin/export?type=registrations"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1226] text-amber-300 text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Registrations CSV
                </a>
                <a
                  href="/api/admin/export?type=players"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Players CSV
                </a>
                <a
                  href="/api/admin/export?type=payments"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Payments CSV
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-display font-bold text-base text-slate-900">
                  Sport-by-Sport Live Reconciliation
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Entries</th>
                      <th className="py-3 px-4">Athletes</th>
                      <th className="py-3 px-4">Fees Due</th>
                      <th className="py-3 px-4">Verified Paid</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Approved / Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard &&
                      Object.entries(dashboard.gameStats).map(([gameName, s]) => (
                        <tr key={gameName} className="border-b border-slate-200">
                          <td className="py-3 px-4 font-bold text-slate-900">{gameName}</td>
                          <td className="py-3 px-4">{s.entries}</td>
                          <td className="py-3 px-4">{s.players}</td>
                          <td className="py-3 px-4">{s.feesDue.toLocaleString()} PKR</td>
                          <td className="py-3 px-4 text-emerald-700 font-semibold">
                            {s.verifiedPaid.toLocaleString()} PKR
                          </td>
                          <td
                            className={`py-3 px-4 font-bold ${
                              s.outstanding > 0 ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {s.outstanding.toLocaleString()} PKR
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold mr-1">
                              {s.approved} Appr
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              {s.pending} Pnd
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GROQ AI ASSISTANT */}
        {activeTab === 'ai' && <GalaAiChat />}

        {/* TAB 4: GAMES & EVENT SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Event Settings Form */}
            {settings && (
              <form
                onSubmit={handleSaveSettings}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#0A1226]" />
                    <h2 className="font-display font-bold text-lg text-slate-900">
                      Event-Wide Settings
                    </h2>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1226] text-amber-300 text-xs font-bold cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={settings.event_title}
                      onChange={(e) =>
                        setSettings({ ...settings, event_title: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Venue</label>
                    <input
                      type="text"
                      value={settings.venue}
                      onChange={(e) => setSettings({ ...settings, venue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="text"
                      value={settings.registration_deadline}
                      onChange={(e) =>
                        setSettings({ ...settings, registration_deadline: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      JazzCash Number
                    </label>
                    <input
                      type="text"
                      value={settings.jazzcash_number}
                      onChange={(e) =>
                        setSettings({ ...settings, jazzcash_number: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      JazzCash Account Title
                    </label>
                    <input
                      type="text"
                      value={settings.jazzcash_title}
                      onChange={(e) =>
                        setSettings({ ...settings, jazzcash_title: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Individual Pass Fee (PKR)
                    </label>
                    <input
                      type="number"
                      value={settings.package_fee}
                      onChange={(e) =>
                        setSettings({ ...settings, package_fee: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* Game Setup Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Game Setup &amp; Fees (All 10 Sports)
                </h2>
                <p className="text-xs text-slate-500">
                  Changes apply immediately to the live registration portal.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Min / Max Players</th>
                      <th className="py-3 px-4">Fee (PKR)</th>
                      <th className="py-3 px-4">Pass Eligible</th>
                      <th className="py-3 px-4">Open?</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g, idx) => (
                      <tr key={g.id} className="border-b border-slate-200">
                        <td className="py-3 px-4 font-bold text-slate-900">{g.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{g.entry_type}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={g.min_players}
                              onChange={(e) => {
                                const next = [...games];
                                next[idx] = { ...g, min_players: Number(e.target.value) };
                                setGames(next);
                              }}
                              className="w-14 px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                            <span>–</span>
                            <input
                              type="number"
                              value={g.max_players}
                              onChange={(e) => {
                                const next = [...games];
                                next[idx] = { ...g, max_players: Number(e.target.value) };
                                setGames(next);
                              }}
                              className="w-14 px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={g.fee_amount}
                            onChange={(e) => {
                              const next = [...games];
                              next[idx] = { ...g, fee_amount: Number(e.target.value) };
                              setGames(next);
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-300 text-xs font-bold"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={g.is_package_eligible}
                            onChange={(e) => {
                              const next = [...games];
                              next[idx] = { ...g, is_package_eligible: e.target.checked };
                              setGames(next);
                            }}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={g.is_open}
                            onChange={(e) => {
                              const next = [...games];
                              next[idx] = { ...g, is_open: e.target.checked };
                              setGames(next);
                            }}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleUpdateGame(g)}
                            className="px-3 py-1 rounded-lg bg-[#0A1226] text-amber-300 text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RECEIPT VIEWER MODAL */}
      {(receiptModal || loadingReceipt) && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl">
            {loadingReceipt || !receiptModal ? (
              <div className="py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading receipt...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900">
                      JazzCash Receipt Verification
                    </h3>
                    <p className="text-xs text-slate-500">
                      {receiptModal.registration_id} · {receiptModal.captain_name} (
                      {receiptModal.captain_student_id})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptModal(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3.5 py-2 mb-3 font-semibold">
                  Official JazzCash: {settings?.jazzcash_number || '03281159050'} (
                  {settings?.jazzcash_title || 'Abdul Ahad'}) · Fee:{' '}
                  {receiptModal.fee_due.toLocaleString()} PKR
                  {receiptModal.transaction_ref ? ` · TID: ${receiptModal.transaction_ref}` : ''}
                </div>

                <div className="bg-slate-100 rounded-xl p-2 max-h-[400px] overflow-auto mb-4 text-center">
                  {receiptModal.receipt_data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptModal.receipt_data}
                      alt="Uploaded payment receipt"
                      className="max-w-full mx-auto rounded-lg shadow-xs"
                    />
                  ) : (
                    <p className="py-8 text-sm text-slate-500">No image attached.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                  {receiptModal.payment_status !== 'Paid' && (
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() =>
                        handleQuickApprove(
                          receiptModal.registration_id,
                          receiptModal.captain_name
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve This Payment
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MANUAL PAYMENT MODAL */}
      {payModalReg && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordManualPayment}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  Record Verified Payment
                </h3>
                <p className="text-xs text-slate-500">
                  {payModalReg.registration_id} · {payModalReg.captain_name} (Balance:{' '}
                  {payModalReg.balance.toLocaleString()} PKR)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModalReg(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Amount Received (PKR)
              </label>
              <input
                type="number"
                required
                min={1}
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Method</label>
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value as 'Cash' | 'JazzCash')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="JazzCash">JazzCash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Receipt / Reference Note
              </label>
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="e.g. Desk Cash Copy #14 or TID"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalReg(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Save Verified Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD WALK-IN ENTRY MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDeskEntry}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  Add New Registration Entry
                </h3>
                <p className="text-xs text-slate-500">
                  Register a walk-in student or team directly from the Organizer Desk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Sport <span className="text-red-500">*</span>
                </label>
                <select
                  value={newEntry.gameName}
                  onChange={(e) => setNewEntry({ ...newEntry, gameName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {games.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} — {g.fee_amount.toLocaleString()} PKR ({g.entry_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Student / Captain Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.captainName}
                  onChange={(e) => setNewEntry({ ...newEntry, captainName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Roll No / Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.studentId}
                  onChange={(e) => setNewEntry({ ...newEntry, studentId: e.target.value })}
                  placeholder="e.g. 2024-ME-105"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Department / Class <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.department}
                  onChange={(e) => setNewEntry({ ...newEntry, department: e.target.value })}
                  placeholder="e.g. Mechanical 4th Sem"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newEntry.phone}
                  onChange={(e) => setNewEntry({ ...newEntry, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Team / Pair Name (Optional)
                </label>
                <input
                  type="text"
                  value={newEntry.teamName}
                  onChange={(e) => setNewEntry({ ...newEntry, teamName: e.target.value })}
                  placeholder="Leave blank for solo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={newEntry.paymentMethod}
                  onChange={(e) =>
                    setNewEntry({
                      ...newEntry,
                      paymentMethod: e.target.value as 'Cash' | 'JazzCash',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="JazzCash">JazzCash</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newEntry.markPaidAndApproved}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, markPaidAndApproved: e.target.checked })
                }
              />
              Mark Payment as Verified &amp; Registration Approved immediately
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAction}
                className="px-4 py-2 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 text-xs font-bold cursor-pointer"
              >
                {savingAction ? 'Saving...' : 'Save Registration Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
