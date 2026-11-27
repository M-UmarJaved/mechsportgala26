'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  FileImage,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Printer,
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
} from 'lucide-react';
import { EventSettings, GameConfig, RegistrationRecord } from '@/lib/types';
import { GalaAiChat } from './GalaAiChat';

interface DashboardData {
  kpis: {
    totalEntries: number;
    totalPlayers: number;
    totalFeesDue: number;
    totalVerifiedPaid: number;
    cashEntries: number;
    jazzcashEntries: number;
    cashVerified: number;
    jazzcashVerified: number;
  };
  gameStats: Record<
    string,
    {
      entries: number;
      players: number;
      feesDue: number;
      verifiedPaid: number;
    }
  >;
}

interface ReceiptModalData {
  registration_id: string;
  captain_name: string;
  captain_student_id: string;
  game_name: string;
  fee_due: number;
  transaction_ref: string;
  receipt_data: string | null;
}

interface ReceiptGalleryItem {
  registration_id: string;
  submitted_at: string;
  game_name: string;
  format: string;
  team_name: string;
  captain_name: string;
  captain_student_id: string;
  contact_phone: string;
  department: string;
  institution: string;
  fee_due: number;
  payment_method: string;
  transaction_ref: string;
  receipt_data: string;
}

type AdminTab = 'desk' | 'receipts' | 'metrics' | 'ai' | 'settings';

export function AdminPortal() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('desk');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'online' | 'cash'>('all');
  const [showGuide, setShowGuide] = useState(true);
  const [rosterExportGame, setRosterExportGame] = useState('');

  const [galleryReceipts, setGalleryReceipts] = useState<ReceiptGalleryItem[]>([]);
  const [gallerySearch, setGallerySearch] = useState('');
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [loadingRecords, setLoadingRecords] = useState(false);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);

  const [receiptModal, setReceiptModal] = useState<ReceiptModalData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    gameName: 'Cricket',
    captainName: '',
    studentId: '',
    department: '',
    section: '',
    phone: '',
    email: '',
    teamName: '',
    paymentMethod: 'Cash' as 'Cash' | 'Bank Transfer (UBL)',
    transactionRef: '',
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
    if (res.ok) setDashboard(await res.json());
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (gameFilter) params.set('game', gameFilter);
      if (methodFilter) params.set('method', methodFilter);

      const res = await fetch(`/api/admin/registrations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } finally {
      setLoadingRecords(false);
    }
  }, [searchQuery, gameFilter, methodFilter]);

  const loadGalleryReceipts = useCallback(async () => {
    setLoadingGallery(true);
    try {
      const params = new URLSearchParams();
      if (gallerySearch.trim()) params.set('q', gallerySearch.trim());
      const res = await fetch(`/api/admin/receipts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGalleryReceipts(data.receipts || []);
      }
    } finally {
      setLoadingGallery(false);
    }
  }, [gallerySearch]);

  useEffect(() => {
    if (authenticated && activeTab === 'receipts') {
      const t = setTimeout(() => loadGalleryReceipts(), 200);
      return () => clearTimeout(t);
    }
  }, [authenticated, activeTab, loadGalleryReceipts]);

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
        setLoginError(data.message || 'Invalid secret key');
      } else {
        setAuthenticated(true);
        setPassword('');
      }
    } catch {
      setLoginError('Network error while unlocking');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
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

  const handleDeleteReg = async (regId: string) => {
    if (!confirm(`Permanently delete registration ${regId} and its players/payments?`)) return;
    const res = await fetch(`/api/admin/registrations/${encodeURIComponent(regId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast(`Deleted ${regId}`);
      await Promise.all([loadRecords(), loadDashboard()]);
    }
  };

  const handleAddDeskEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAction(true);
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEntry, markPaidAndApproved: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add entry');
      }
      showToast(`Added ${data.registrationId} (${newEntry.paymentMethod})!`);
      setAddModalOpen(false);
      setNewEntry({
        gameName: games[0]?.name || 'Cricket',
        captainName: '',
        studentId: '',
        department: '',
        section: '',
        phone: '',
        email: '',
        teamName: '',
        paymentMethod: 'Cash',
        transactionRef: '',
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

  // SECRET KEY ACCESS GATE
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#1A2B52_0%,#060B18_85%)] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#0A1226] text-amber-300 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">
            Organizer Secret Access
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            No account or signup required. Enter the Mechanical Sports Gala secret key to open the Management Desk, Reports &amp; Gala AI.
          </p>

          {loginError && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                Organizer Secret Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret access key..."
                  required
                  autoFocus
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Toggle secret key visibility"
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
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Unlock Organizer Desk
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
    <div className="min-h-screen bg-slate-50 pb-16 overflow-x-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0A1226] text-amber-300 border border-amber-400/40 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="no-print bg-[radial-gradient(circle_at_10%_10%,#1A2B52_0%,#060B18_90%)] text-white px-4 sm:px-8 py-5 border-b-2 border-amber-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              Mechanical Sports Gala — Organizer Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Live Registrations · Classroom Cash Entry · UBL Bank Receipts Gallery · Reports &amp; Gala AI
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
              <Plus className="w-4 h-4" /> Add Cash Entry
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
              <LogOut className="w-4 h-4" /> Lock Desk
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Clean 5-Card KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-[#0A1226]">
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Entries</div>
            <div className="font-display text-2xl font-bold text-slate-900">
              {kpis?.totalEntries ?? 0}
            </div>
            <div className="text-[11px] text-slate-500">Confirmed registrations</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-blue-600">
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Athletes</div>
            <div className="font-display text-2xl font-bold text-slate-900">
              {kpis?.totalPlayers ?? 0}
            </div>
            <div className="text-[11px] text-slate-500">Across all 11 sports</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-emerald-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Collected</div>
            <div className="font-display text-xl font-bold text-emerald-700">
              {(kpis?.totalFeesDue ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">Online UBL + Classroom Cash</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-amber-500">
            <div className="text-[11px] font-bold uppercase text-slate-500">UBL Bank Online</div>
            <div className="font-display text-xl font-bold text-slate-900">
              {(kpis?.jazzcashVerified ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">
              {kpis?.jazzcashEntries ?? 0} entries ({settings?.jazzcash_title || 'Sharjil Bilal'})
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-purple-500 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold uppercase text-slate-500">Classroom Cash</div>
            <div className="font-display text-xl font-bold text-slate-900">
              {(kpis?.cashVerified ?? 0).toLocaleString()} PKR
            </div>
            <div className="text-[11px] text-slate-500">
              {kpis?.cashEntries ?? 0} entries added by team
            </div>
          </div>
        </div>

        {/* Collapsible Quick Team Guide */}
        <div className="no-print bg-amber-50/80 border border-amber-200 rounded-2xl mb-5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Quick Organizer Team Guide — How Everything Works
            </span>
            {showGuide ? (
              <ChevronUp className="w-4 h-4 text-amber-700 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-700 shrink-0" />
            )}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs text-slate-700">
              <div className="bg-white rounded-xl p-3 border border-amber-200/80">
                <strong className="text-[#0A1226] block mb-0.5">1. Receipts Gallery (Visual Audit)</strong>
                Open <strong>Receipts Gallery</strong> to inspect all uploaded UBL Bank Transfer screenshots side-by-side with student name, Roll No &amp; exact fee.
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200/80">
                <strong className="text-[#0A1226] block mb-0.5">2. Classroom Cash Collection</strong>
                When your team collects cash in classes, click yellow <strong>+ Add Cash Entry</strong> at top right to record the student directly as Paid.
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200/80">
                <strong className="text-[#0A1226] block mb-0.5">3. Reports &amp; Match Sheets</strong>
                Open <strong>Reports &amp; Downloads</strong> to export Excel files (All Registrations, Per-Sport Rosters, Payments) or Print a PDF summary.
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200/80">
                <strong className="text-[#0A1226] block mb-0.5">4. Ask Gala AI Anything</strong>
                Open <strong>Ask Gala AI</strong> to ask questions like <em>&ldquo;How many Cricket teams registered?&rdquo;</em> or check any Roll Number.
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="no-print grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-5">
          {[
            { id: 'desk', label: 'All Registrations', icon: Search },
            { id: 'receipts', label: 'Receipts Gallery', icon: FileImage },
            { id: 'metrics', label: 'Reports & Downloads', icon: BarChart3 },
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

        {/* TAB 1: ALL REGISTRATIONS & RECEIPTS */}
        {activeTab === 'desk' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              {/* Quick Method Pills */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Filter:
                </span>
                {[
                  {
                    id: 'all',
                    label: 'All Registrations',
                    apply: () => {
                      setSearchQuery('');
                      setGameFilter('');
                      setMethodFilter('');
                    },
                  },
                  {
                    id: 'online',
                    label: 'UBL Bank (Online Receipts)',
                    apply: () => setMethodFilter('Online'),
                  },
                  {
                    id: 'cash',
                    label: 'Cash (Classroom Entries)',
                    apply: () => setMethodFilter('Cash'),
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
                    placeholder="Search Roll No, Student Name, Team, Phone, Session, or Reg ID..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#0A1226]/25 focus:border-[#0A1226] focus:outline-none text-sm font-medium"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={gameFilter}
                    onChange={(e) => setGameFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">All 11 Sports</option>
                    {games.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
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

            {/* Mobile Card View (< 1024px) */}
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
                            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.payment_method === 'JazzCash'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {r.payment_method} · Paid
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
                          {r.department}
                          {r.institution ? ` · ${r.institution}` : ''} · {r.contact_phone}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.has_receipt && (
                          <button
                            type="button"
                            onClick={() => openReceipt(r.registration_id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                          >
                            <FileImage className="w-3.5 h-3.5" /> View Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRegId(isExpanded ? null : r.registration_id)
                          }
                          className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {isExpanded ? 'Hide Roster' : `Roster (${r.players?.length || r.player_count})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReg(r.registration_id)}
                          className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                          title="Delete registration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {(r.players || []).map((p) => (
                            <div
                              key={p.id}
                              className="bg-slate-50 rounded-lg p-2.5 text-xs"
                            >
                              <div className="font-bold text-slate-900">
                                #{p.player_no} {p.full_name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-600">
                                {p.student_id} · {p.department} {p.phone ? `· ${p.phone}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Clean 5-Column Table (>= 1024px) */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Reg ID</th>
                      <th className="py-3 px-4">Sport &amp; Team</th>
                      <th className="py-3 px-4">Student / Roll No / Session</th>
                      <th className="py-3 px-4">Fee Paid &amp; Method</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRecords && records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          Loading registrations from Neon DB...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          No registrations found matching your search.
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => {
                        const isExpanded = expandedRegId === r.registration_id;
                        return (
                          <React.Fragment key={r.registration_id}>
                            <tr className="border-b border-slate-200 hover:bg-slate-50/70">
                              <td className="py-3 px-4 font-mono font-bold text-xs text-[#0A1226] whitespace-nowrap">
                                {r.registration_id}
                                <div className="text-[10px] font-sans font-normal text-slate-400">
                                  {new Date(r.submitted_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{r.game_name}</div>
                                <div className="text-xs text-slate-500">
                                  {r.team_name} ({r.format})
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{r.captain_name}</div>
                                <div className="font-mono text-xs font-bold text-[#0A1226]">
                                  {r.captain_student_id}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {r.department}
                                  {r.institution ? ` · ${r.institution}` : ''} · {r.contact_phone}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900">
                                  {r.fee_due.toLocaleString()} PKR
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                    r.payment_method === 'JazzCash'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {r.payment_method === 'JazzCash' ? (
                                    <Smartphone className="w-3 h-3" />
                                  ) : (
                                    <Banknote className="w-3 h-3" />
                                  )}
                                  {r.payment_method} · Paid
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {r.has_receipt && (
                                    <button
                                      type="button"
                                      onClick={() => openReceipt(r.registration_id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                    >
                                      <FileImage className="w-3.5 h-3.5" /> Receipt
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRegId(isExpanded ? null : r.registration_id)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                                  >
                                    <Users className="w-3.5 h-3.5" /> Roster (
                                    {r.players?.length || r.player_count})
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReg(r.registration_id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete registration"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <td colSpan={5} className="p-4">
                                  <div className="text-xs font-bold uppercase text-slate-500 mb-2">
                                    Player Roster — {r.registration_id}
                                  </div>
                                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-600">
                                        <tr>
                                          <th className="py-2 px-3">#</th>
                                          <th className="py-2 px-3">Full Name</th>
                                          <th className="py-2 px-3">Roll No / Student ID</th>
                                          <th className="py-2 px-3">Session</th>
                                          <th className="py-2 px-3">Phone</th>
                                          <th className="py-2 px-3">Email</th>
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
                                            <td className="py-2 px-3">{p.email || '-'}</td>
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

        {/* TAB: RECEIPTS GALLERY (EASY VISUAL AUDIT FOR TEAM) */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Online Payment Receipts Gallery
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  All uploaded UBL Bank Transfer screenshots stored in Neon DB — inspect student name, Roll No, TID &amp; exact fee side-by-side. Click any receipt to zoom or download.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Filter Roll No, Name, TID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadGalleryReceipts}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingGallery ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingGallery && galleryReceipts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading receipt screenshots...
              </div>
            ) : galleryReceipts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
                No online payment receipts uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleryReceipts.map((item) => (
                  <div
                    key={item.registration_id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptModal({
                            registration_id: item.registration_id,
                            captain_name: item.captain_name,
                            captain_student_id: item.captain_student_id,
                            game_name: item.game_name,
                            fee_due: item.fee_due,
                            transaction_ref: item.transaction_ref,
                            receipt_data: item.receipt_data,
                          })
                        }
                        className="w-full h-56 bg-slate-100 overflow-hidden flex items-center justify-center relative group cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.receipt_data}
                          alt={`Receipt ${item.registration_id}`}
                          className="w-full h-full object-contain group-hover:scale-105 transition duration-200"
                        />
                        <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-bold">
                          Tap to Zoom
                        </span>
                      </button>

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs font-bold text-[#0A1226]">
                              {item.registration_id}
                            </div>
                            <div className="font-bold text-slate-900 text-sm">
                              {item.captain_name}
                            </div>
                            <div className="font-mono text-xs text-slate-600">
                              {item.captain_student_id} · {item.department}
                              {item.institution ? ` (${item.institution})` : ''}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs whitespace-nowrap">
                            {item.fee_due.toLocaleString()} PKR
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
                          <div>
                            <strong>Sport:</strong> {item.game_name} ({item.team_name})
                          </div>
                          <div>
                            <strong>Phone:</strong> {item.contact_phone}
                          </div>
                          {item.transaction_ref && (
                            <div>
                              <strong>TID:</strong>{' '}
                              <span className="font-mono">{item.transaction_ref}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex items-center gap-2">
                      <a
                        href={item.receipt_data}
                        download={`receipt-${item.registration_id}-${item.captain_student_id}.jpg`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0A1226] text-amber-300 text-xs font-bold"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteReg(item.registration_id)}
                        className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Delete registration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REPORTS & DOWNLOADS CENTER */}
        {activeTab === 'metrics' && (
          <div className="space-y-5">
            <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Official Reports &amp; Excel Downloads
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Download ready-to-open Excel spreadsheets for registrations, per-sport match sheets, or Cash/JazzCash collections — or print a PDF summary.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 text-xs sm:text-sm font-bold cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF Summary
              </button>
            </div>

            {/* 4 Clean Report Cards */}
            <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Report 1: Master Registrations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {kpis?.totalEntries ?? 0} Entries
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    1. Master Registrations Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Every team &amp; individual entry with Registration ID, Session, Section, Email, Fee Paid, Method (JazzCash/Cash), and TID.
                  </p>
                </div>
                <a
                  href="/api/admin/export?type=registrations"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Download Registrations (Excel/CSV)
                </a>
              </div>

              {/* Report 2: Athlete Rosters (All or By Sport) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                      {kpis?.totalPlayers ?? 0} Athletes
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    2. Athlete Rosters &amp; Match Sheets
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Full list of players with Roll Numbers, Sessions &amp; Contact details. Pick a specific sport or export all 10 sports.
                  </p>
                  <select
                    value={rosterExportGame}
                    onChange={(e) => setRosterExportGame(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50"
                  >
                    <option value="">All 11 Sports Combined</option>
                    {games.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name} Players Only
                      </option>
                    ))}
                  </select>
                </div>
                <a
                  href={
                    rosterExportGame
                      ? `/api/admin/export?type=players&game=${encodeURIComponent(rosterExportGame)}`
                      : '/api/admin/export?type=players'
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  {rosterExportGame ? `Download ${rosterExportGame} Roster` : 'Download All Players (CSV)'}
                </a>
              </div>

              {/* Report 3: Financial & Payments Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <Banknote className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      {(kpis?.totalFeesDue ?? 0).toLocaleString()} PKR
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    3. Payments &amp; Cash/UBL Bank Ledger
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete financial log of every UBL Bank Transfer and classroom Cash entry with TID references and timestamps.
                  </p>
                </div>
                <a
                  href="/api/admin/export?type=payments"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <Download className="w-4 h-4" /> Download Payments Ledger (CSV)
                </a>
              </div>

              {/* Report 4: Sport-by-Sport Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                      10 Sports Overview
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    4. Sport-by-Sport Executive Summary
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Clean 10-row summary of entries, athletes, and total revenue collected per sport — ideal for department heads.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/admin/export?type=summary"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" /> Summary CSV
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Clean 4-Column Live Sport-by-Sport Table */}
            <div className="print-slip bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-display font-bold text-base text-slate-900">
                  Live Sport-by-Sport Summary Report
                </h3>
                <p className="text-xs text-slate-500">
                  UBL Bank Online: {(kpis?.jazzcashVerified ?? 0).toLocaleString()} PKR · Classroom Cash:{' '}
                  {(kpis?.cashVerified ?? 0).toLocaleString()} PKR · Total Collected:{' '}
                  {(kpis?.totalFeesDue ?? 0).toLocaleString()} PKR
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase border-b border-slate-200">
                      <th className="py-3 px-4">Sport</th>
                      <th className="py-3 px-4">Entries</th>
                      <th className="py-3 px-4">Athletes</th>
                      <th className="py-3 px-4 text-right">Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard &&
                      Object.entries(dashboard.gameStats).map(([gameName, s]) => (
                        <tr key={gameName} className="border-b border-slate-200">
                          <td className="py-3 px-4 font-bold text-slate-900">{gameName}</td>
                          <td className="py-3 px-4">{s.entries}</td>
                          <td className="py-3 px-4">{s.players}</td>
                          <td className="py-3 px-4 text-right text-emerald-700 font-bold whitespace-nowrap">
                            {s.feesDue.toLocaleString()} PKR
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
                      Bank IBAN Number
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
                      Bank Account Holder
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

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Game Setup &amp; Fees (All 11 Sports)
                </h2>
                <p className="text-xs text-slate-500">
                  Changes apply immediately to the live student registration website.
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

      {/* RECEIPT VIEWER MODAL (with Download button) */}
      {(receiptModal || loadingReceipt) && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl">
            {loadingReceipt || !receiptModal ? (
              <div className="py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading receipt from Neon DB...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-900">
                      UBL Bank Transfer Receipt
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
                  UBL — {settings?.jazzcash_title || 'Sharjil Bilal'} ({settings?.jazzcash_number || 'PK15UNIL0109000336020741'}) · Paid:{' '}
                  {receiptModal.fee_due.toLocaleString()} PKR
                  {receiptModal.transaction_ref ? ` · TID: ${receiptModal.transaction_ref}` : ''}
                </div>

                <div className="bg-slate-100 rounded-xl p-2 max-h-[400px] overflow-auto mb-4 text-center">
                  {receiptModal.receipt_data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptModal.receipt_data}
                      alt="Uploaded JazzCash receipt"
                      className="max-w-full mx-auto rounded-lg shadow-xs"
                    />
                  ) : (
                    <p className="py-8 text-sm text-slate-500">No receipt image attached.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  {receiptModal.receipt_data && (
                    <a
                      href={receiptModal.receipt_data}
                      download={`receipt-${receiptModal.registration_id}.jpg`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1226] text-amber-300 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" /> Download Image
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setReceiptModal(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADD CLASSROOM CASH / MANUAL ENTRY MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDeskEntry}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  Add Classroom Cash / Manual Entry
                </h3>
                <p className="text-xs text-slate-500">
                  Enter a student collected in class — automatically recorded as Paid &amp; Confirmed.
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
                  Session <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.department}
                  onChange={(e) => setNewEntry({ ...newEntry, department: e.target.value })}
                  placeholder="e.g. 2023–2027"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.section}
                  onChange={(e) => setNewEntry({ ...newEntry, section: e.target.value })}
                  placeholder="e.g. Section A"
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
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEntry.email}
                  onChange={(e) => setNewEntry({ ...newEntry, email: e.target.value })}
                  placeholder="student@university.edu.pk"
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
                      paymentMethod: e.target.value as 'Cash' | 'Bank Transfer (UBL)',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Cash">Cash (Classroom Collection)</option>
                  <option value="Bank Transfer (UBL)">Bank Transfer (UBL)</option>
                </select>
              </div>
            </div>

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
                {savingAction ? 'Saving...' : 'Save Paid Registration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
