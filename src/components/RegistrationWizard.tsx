'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  GraduationCap,
  Hash,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_GAMES, DEFAULT_SETTINGS } from '@/lib/defaults';
import {
  EventSettings,
  FeeCalculationResult,
  GameConfig,
  GameSelectionInput,
  PlayerInput,
  RegistrantInput,
} from '@/lib/types';
import { SportIcon } from './SportIcon';

interface SubmissionResult {
  success: boolean;
  submissionTime: string;
  registrant: RegistrantInput;
  paymentMethod: 'Cash' | 'JazzCash';
  transactionRef: string;
  totalFeeDue: number;
  currency: string;
  packageApplied: boolean;
  entries: {
    registrationId: string;
    gameName: string;
    format: string;
    teamName: string;
    playerCount: number;
    feeDue: number;
    feeNote: string;
  }[];
  paymentInstructions: {
    jazzcashNumber: string;
    jazzcashTitle: string;
  };
}

const STEP_LABELS = ['Overview', 'Student', 'Sports', 'Rosters', 'Payment', 'Slip'];

export function RegistrationWizard() {
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_SETTINGS);
  const [games, setGames] = useState<GameConfig[]>(
    DEFAULT_GAMES.map((g, i) => ({ ...g, id: i + 1 }))
  );

  const [step, setStep] = useState<number>(1);
  const [registrant, setRegistrant] = useState<RegistrantInput>({
    name: '',
    studentId: '',
    department: '',
    phone: '',
    email: '',
    institution: '',
  });

  const [usePackage, setUsePackage] = useState<boolean>(false);
  const [selectedGames, setSelectedGames] = useState<Record<string, GameSelectionInput>>({});
  const [feeSummary, setFeeSummary] = useState<FeeCalculationResult | null>(null);
  const [calculatingFee, setCalculatingFee] = useState<boolean>(false);

  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'JazzCash'>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [receiptData, setReceiptData] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
  const [compressing, setCompressing] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [copiedSlip, setCopiedSlip] = useState<boolean>(false);
  const [copiedJazzCash, setCopiedJazzCash] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyJazzCashNumber = () => {
    navigator.clipboard.writeText(settings.jazzcash_number).then(() => {
      setCopiedJazzCash(true);
      setTimeout(() => setCopiedJazzCash(false), 2000);
    });
  };

  // Client-side live estimate for Step 3 sticky bar (authoritative total always computed on server in Step 5)
  const estimatedStep3Total = (() => {
    const entries = Object.values(selectedGames);
    if (entries.length === 0) return 0;
    let total = 0;
    let passCharged = false;
    const hasEligible = entries.some((e) => {
      const g = games.find((x) => x.name === e.gameName);
      return Boolean(g?.is_package_eligible);
    });
    const applyPass = usePackage && settings.package_enabled && hasEligible;
    for (const e of entries) {
      const g = games.find((x) => x.name === e.gameName);
      if (!g) continue;
      if (applyPass && g.is_package_eligible) {
        if (!passCharged) {
          total += settings.package_fee;
          passCharged = true;
        }
      } else {
        total += g.fee_amount;
      }
    }
    return total;
  })();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
        if (Array.isArray(data.games) && data.games.length > 0) setGames(data.games);
      })
      .catch(() => {
        // Fallback to DEFAULT_SETTINGS / DEFAULT_GAMES already rendered
      });
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleGame = (game: GameConfig) => {
    if (!game.is_open) return;
    setErrorMsg('');
    setSelectedGames((prev) => {
      const next = { ...prev };
      if (next[game.name]) {
        delete next[game.name];
      } else {
        const players: PlayerInput[] = [];
        for (let i = 0; i < game.min_players; i++) {
          if (i === 0) {
            players.push({
              name: registrant.name.trim(),
              studentId: registrant.studentId.trim(),
              department: registrant.department.trim(),
              phone: registrant.phone.trim(),
              email: registrant.email?.trim() || '',
            });
          } else {
            players.push({
              name: '',
              studentId: '',
              department: registrant.department.trim(),
              phone: '',
              email: '',
            });
          }
        }
        next[game.name] = {
          gameName: game.name,
          format: game.allowed_format,
          teamName:
            game.entry_type === 'Individual'
              ? registrant.name.trim()
              : '',
          players,
        };
      }
      return next;
    });
  };

  // Keep player #1 synchronized with primary registrant when entering Step 4
  const syncCaptainIntoSelections = () => {
    setSelectedGames((prev) => {
      const next: Record<string, GameSelectionInput> = {};
      for (const [gameName, entry] of Object.entries(prev)) {
        const updatedPlayers = entry.players.map((p, idx) =>
          idx === 0
            ? {
                ...p,
                name: p.name || registrant.name.trim(),
                studentId: p.studentId || registrant.studentId.trim(),
                department: p.department || registrant.department.trim(),
                phone: p.phone || registrant.phone.trim(),
                email: p.email || registrant.email?.trim() || '',
              }
            : p
        );
        next[gameName] = { ...entry, players: updatedPlayers };
      }
      return next;
    });
  };

  const updateTeamName = (gameName: string, val: string) => {
    setSelectedGames((prev) => ({
      ...prev,
      [gameName]: { ...prev[gameName], teamName: val },
    }));
  };

  const updatePlayer = (
    gameName: string,
    idx: number,
    field: keyof PlayerInput,
    val: string
  ) => {
    setSelectedGames((prev) => {
      const entry = prev[gameName];
      if (!entry) return prev;
      const players = entry.players.map((p, i) =>
        i === idx ? { ...p, [field]: val } : p
      );
      return { ...prev, [gameName]: { ...entry, players } };
    });
  };

  const addPlayer = (gameName: string) => {
    const game = games.find((g) => g.name === gameName);
    const entry = selectedGames[gameName];
    if (!game || !entry || entry.players.length >= game.max_players) return;
    setSelectedGames((prev) => ({
      ...prev,
      [gameName]: {
        ...entry,
        players: [
          ...entry.players,
          {
            name: '',
            studentId: '',
            department: registrant.department.trim(),
            phone: '',
            email: '',
          },
        ],
      },
    }));
  };

  const removePlayer = (gameName: string, idx: number) => {
    const game = games.find((g) => g.name === gameName);
    const entry = selectedGames[gameName];
    if (!game || !entry || idx === 0 || entry.players.length <= game.min_players) return;
    setSelectedGames((prev) => ({
      ...prev,
      [gameName]: {
        ...entry,
        players: entry.players.filter((_, i) => i !== idx),
      },
    }));
  };

  const validateStep2 = (): boolean => {
    if (
      !registrant.name.trim() ||
      !registrant.studentId.trim() ||
      !registrant.department.trim() ||
      !registrant.phone.trim()
    ) {
      setErrorMsg(
        'Please complete all required fields: Full Name, Roll No / Student ID, Department / Class, and Phone Number.'
      );
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep3 = (): boolean => {
    if (Object.keys(selectedGames).length === 0) {
      setErrorMsg('Please select at least one sport to continue.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep4 = (): boolean => {
    for (const [gameName, entry] of Object.entries(selectedGames)) {
      const game = games.find((g) => g.name === gameName);
      if (!game) continue;
      const isTeamOrPair = game.entry_type === 'Team' || game.entry_type === 'Pair';
      if (isTeamOrPair && !entry.teamName?.trim()) {
        setErrorMsg(`Please enter a Team / Pair Name for ${gameName}.`);
        return false;
      }
      if (entry.players.length < game.min_players || entry.players.length > game.max_players) {
        setErrorMsg(
          `${gameName} requires ${game.min_players}–${game.max_players} players.`
        );
        return false;
      }
      for (let i = 0; i < entry.players.length; i++) {
        const p = entry.players[i];
        if (!p.name.trim() || !p.studentId.trim() || !p.department.trim()) {
          setErrorMsg(
            `Please fill Full Name, Roll No / Student ID, and Department for Player #${i + 1} in ${gameName}.`
          );
          return false;
        }
      }
    }
    setErrorMsg('');
    return true;
  };

  const loadFeeSummary = async () => {
    setCalculatingFee(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/calculate-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: Object.values(selectedGames),
          usePackage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fee calculation failed');
      setFeeSummary(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fee calculation error');
    } finally {
      setCalculatingFee(false);
    }
  };

  const handleNext = async (targetStep: number) => {
    if (targetStep === 3 && !validateStep2()) return;
    if (targetStep === 4) {
      if (!validateStep3()) return;
      syncCaptainIntoSelections();
    }
    if (targetStep === 5) {
      if (!validateStep4()) return;
      setStep(5);
      scrollToTop();
      await loadFeeSummary();
      return;
    }
    setStep(targetStep);
    scrollToTop();
  };

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image exceeds 15MB limit. Please choose a smaller screenshot.');
      return;
    }

    setErrorMsg('');
    setCompressing(true);
    setReceiptName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawUrl = String(ev.target?.result || '');
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1100;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setReceiptData(compressed);
        } catch {
          setReceiptData(rawUrl);
        } finally {
          setCompressing(false);
        }
      };
      img.onerror = () => {
        setReceiptData(rawUrl);
        setCompressing(false);
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptData(null);
    setReceiptName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (paymentMethod === 'JazzCash' && !receiptData) {
      setErrorMsg('Please upload a screenshot/photo of your JazzCash transaction receipt.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrant,
          selections: Object.values(selectedGames),
          usePackage,
          paymentMethod,
          transactionRef: transactionRef.trim(),
          receiptData: paymentMethod === 'JazzCash' ? receiptData : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      setSubmissionResult(data);
      setStep(6);
      scrollToTop();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyWhatsAppSummary = () => {
    if (!submissionResult) return;
    const r = submissionResult;
    let text = `🏆 ${settings.event_title.toUpperCase()} — REGISTRATION SLIP 🏆\n`;
    text += `Student: ${r.registrant.name} (Roll No: ${r.registrant.studentId})\n`;
    text += `Department: ${r.registrant.department}\n`;
    text += `Payment: ${r.paymentMethod === 'JazzCash' ? 'JazzCash' : 'Cash at Registration Desk'}\n`;
    text += `Total Fee: ${r.totalFeeDue.toLocaleString()} ${r.currency}\n\n`;
    text += `REGISTERED SPORTS:\n`;
    r.entries.forEach((e) => {
      text += `• ${e.gameName} (${e.format}) | ID: ${e.registrationId} | ${e.feeDue.toLocaleString()} ${r.currency}\n`;
    });
    text += `\nPresent this slip at the Sports Desk for verification.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSlip(true);
      setTimeout(() => setCopiedSlip(false), 2500);
    });
  };

  const resetWizard = () => {
    setSelectedGames({});
    setUsePackage(false);
    setFeeSummary(null);
    setPaymentMethod('Cash');
    setTransactionRef('');
    clearReceipt();
    setSubmissionResult(null);
    setErrorMsg('');
    setStep(1);
    scrollToTop();
  };

  const selectedCount = Object.keys(selectedGames).length;

  return (
    <div
      className={`min-h-screen bg-slate-50 overflow-x-hidden ${
        step === 3 && selectedCount > 0 ? 'pb-28 sm:pb-24' : 'pb-14'
      }`}
    >
      {/* Top Hero Header */}
      <header className="no-print relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#1B3163_0%,#0A1226_55%,#050814_100%)] text-white px-4 pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-amber-400/30">
        {/* Subtle decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #FDE68A 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-bold mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Registrations Open · {settings.registration_deadline}</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-amber-300/90 mb-2">
            <Award className="w-4 h-4" />
            <span>Department of Mechanical Engineering</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            {settings.event_title}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
            Official online registration portal for team, pair, and individual championships. Instant official PDF proof slip upon submission.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-slate-100 backdrop-blur-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              {settings.venue}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-200 font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Solo Pass: {settings.package_fee.toLocaleString()} {settings.currency}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-slate-100 backdrop-blur-xs">
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
              Enrolled Students Only
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 -mt-8 relative z-10">
        {/* Step Progress Bar: Compact Mobile Bar + Full Desktop Stepper */}
        <div className="no-print bg-white rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-200/90 px-4 py-3.5 sm:px-6 sm:py-4 mb-5">
          {/* Mobile View (< 640px): Zero horizontal scroll */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-[#0A1226]">
                Step {step} of {STEP_LABELS.length}:{' '}
                <span className="text-amber-700">{STEP_LABELS[step - 1]}</span>
              </span>
              <span className="text-slate-400">
                {Math.round((step / STEP_LABELS.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0A1226] to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / STEP_LABELS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Tablet & Desktop View (>= 640px) */}
          <div className="hidden sm:flex items-center justify-between gap-2">
            {STEP_LABELS.map((label, i) => {
              const num = i + 1;
              const isActive = step === num;
              const isDone = step > num;
              const isLast = i === STEP_LABELS.length - 1;
              const canJump = isDone && step < 6;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 ${isLast ? 'shrink-0' : 'flex-1'}`}
                >
                  <button
                    type="button"
                    disabled={!canJump}
                    onClick={() => {
                      if (canJump) {
                        setStep(num);
                        scrollToTop();
                      }
                    }}
                    className={`flex items-center gap-2 ${
                      canJump ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-[#0A1226] text-amber-300 ring-4 ring-amber-400/25'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : num}
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isActive ? 'text-[#0A1226]' : isDone ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 rounded ${
                        isDone ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="no-print mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 1: WELCOME & RULES */}
        {step === 1 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Official Guidelines & Fee Schedule
                </h2>
                <p className="text-sm text-slate-500">
                  Review competition formats, squad limits, and payment rules before registering.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Team & Pair Competitions
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {games
                    .filter((g) => g.entry_type !== 'Individual')
                    .map((g) => (
                      <li key={g.name} className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          {g.name}{' '}
                          <span className="text-xs text-slate-500">
                            ({g.min_players === g.max_players
                              ? `${g.min_players} players`
                              : `${g.min_players}–${g.max_players} squad`})
                          </span>
                        </span>
                        <span className="font-bold text-[#0A1226] shrink-0">
                          {g.fee_amount.toLocaleString()} {settings.currency}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Individual Competitions
                  </h3>
                  {settings.package_enabled && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      All-Access Pass: {settings.package_fee.toLocaleString()} {settings.currency}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {games
                    .filter((g) => g.entry_type === 'Individual')
                    .map((g) => (
                      <li key={g.name} className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <span className="font-bold text-[#0A1226] shrink-0">
                          {g.fee_amount.toLocaleString()} {settings.currency}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-[#0A1226] text-slate-200 p-4 sm:p-5 mb-6 text-sm space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Eligibility:</strong> Currently enrolled students only. Roll No / Student ID and Department / Class are mandatory for every player.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Individual All-Access Pass:</strong> Pay a single flat fee of{' '}
                  <strong className="text-amber-300">
                    {settings.package_fee.toLocaleString()} {settings.currency}
                  </strong>{' '}
                  for all eligible solo competitions. Team & pair games are billed separately.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Payments:</strong> Cash at the Registration Desk OR{' '}
                  <strong className="text-amber-300">
                    JazzCash to {settings.jazzcash_number} ({settings.jazzcash_title})
                  </strong>{' '}
                  with receipt screenshot upload.
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleNext(2)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 font-bold text-sm transition cursor-pointer"
              >
                <span>Start Registration</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: STUDENT / COORDINATOR INFO */}
        {step === 2 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Primary Student / Team Captain Details
                </h2>
                <p className="text-sm text-slate-500">
                  Your details will be auto-filled as Player #1 / Captain in your selected sports.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registrant.name}
                    onChange={(e) => setRegistrant({ ...registrant, name: e.target.value })}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Roll Number / Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registrant.studentId}
                    onChange={(e) => setRegistrant({ ...registrant, studentId: e.target.value })}
                    placeholder="e.g. 2022-ME-104"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Department / Class <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registrant.department}
                    onChange={(e) => setRegistrant({ ...registrant, department: e.target.value })}
                    placeholder="e.g. Mechanical Engineering - 6th Sem"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Contact / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={registrant.phone}
                    onChange={(e) => setRegistrant({ ...registrant, phone: e.target.value })}
                    placeholder="e.g. 0300-1234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={registrant.email || ''}
                    onChange={(e) => setRegistrant({ ...registrant, email: e.target.value })}
                    placeholder="student@university.edu.pk"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Campus / Club (Optional)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registrant.institution || ''}
                    onChange={(e) =>
                      setRegistrant({ ...registrant, institution: e.target.value })
                    }
                    placeholder="Main Campus"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => handleNext(1)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => handleNext(3)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 font-bold text-sm transition cursor-pointer"
              >
                <span>Select Sports</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: SELECT SPORTS */}
        {step === 3 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Choose Your Competitions
                  </h2>
                  <p className="text-sm text-slate-500">
                    Tap one or multiple sports to register in a single submission.
                  </p>
                </div>
              </div>
              {selectedCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {selectedCount} Sport{selectedCount > 1 ? 's' : ''} Selected
                </span>
              )}
            </div>

            {/* Individual All-Access Pass Banner */}
            {settings.package_enabled && (
              <div
                className={`rounded-xl p-4 mb-5 border-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  usePackage
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-gradient-to-r from-[#0A1226] to-[#152244] border-[#1F305E] text-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                    <Sparkles
                      className={`w-4 h-4 ${usePackage ? 'text-amber-600' : 'text-amber-300'}`}
                    />
                    <span className={usePackage ? 'text-amber-950' : 'text-white'}>
                      Individual All-Access Pass — {settings.package_fee.toLocaleString()}{' '}
                      {settings.currency}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      usePackage ? 'text-amber-800' : 'text-slate-300'
                    }`}
                  >
                    Covers all 5 solo sports (Table Tennis Single, Basketball Single, Chess, Rubik&apos;s Cube, Arm Wrestling) for a flat {settings.package_fee.toLocaleString()} {settings.currency}. Team &amp; pair games are billed separately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUsePackage(!usePackage)}
                  className={`touch-manipulation shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    usePackage
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-amber-400 text-[#0A1226] hover:bg-amber-300'
                  }`}
                >
                  {usePackage ? (
                    <>
                      <Check className="w-4 h-4" /> Pass Activated
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Activate Pass
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 10 Sports Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
              {games.map((game) => {
                const isSelected = Boolean(selectedGames[game.name]);
                const isTeam =
                  game.entry_type === 'Team' || game.entry_type === 'Pair';

                return (
                  <button
                    key={game.name}
                    type="button"
                    disabled={!game.is_open}
                    onClick={() => toggleGame(game)}
                    className={`touch-manipulation text-left rounded-2xl p-4 border-2 transition relative flex flex-col justify-between cursor-pointer ${
                      !game.is_open
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200'
                        : isSelected
                        ? 'bg-amber-50/60 border-[#0A1226] shadow-md ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#0A1226] text-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <SportIcon name={game.name} className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                        {game.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        {game.notes}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isTeam
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {game.entry_type}
                      </span>
                      {game.is_package_eligible && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Pass Eligible
                        </span>
                      )}
                      {!game.is_open ? (
                        <span className="ml-auto text-xs font-bold text-red-600">
                          Closed
                        </span>
                      ) : (
                        <span className="ml-auto text-xs font-extrabold text-[#0A1226]">
                          {game.fee_amount.toLocaleString()} {settings.currency}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => handleNext(2)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => handleNext(4)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 font-bold text-sm transition cursor-pointer"
              >
                <span>Configure Rosters ({selectedCount})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: DYNAMIC ROSTERS */}
        {step === 4 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                    Team &amp; Athlete Rosters
                  </h2>
                  <p className="text-sm text-slate-500">
                    Every player must provide Full Name, Roll No / Student ID, and Department / Class.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleNext(3)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add / Change Sports
              </button>
            </div>

            <div className="space-y-6 mb-6">
              {Object.entries(selectedGames).map(([gameName, entry]) => {
                const game = games.find((g) => g.name === gameName);
                if (!game) return null;
                const isTeamOrPair =
                  game.entry_type === 'Team' || game.entry_type === 'Pair';

                return (
                  <div
                    key={gameName}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#0A1226] text-amber-300 flex items-center justify-center">
                          <SportIcon name={gameName} className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">
                            {gameName}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {game.allowed_format} ·{' '}
                            {game.min_players === game.max_players
                              ? `Exactly ${game.min_players} player(s)`
                              : `Squad ${game.min_players}–${game.max_players} players`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                        {entry.players.length} / {game.max_players} Players
                      </span>
                    </div>

                    {isTeamOrPair && (
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                          {game.entry_type === 'Pair' ? 'Pair / Team Name' : 'Team Name'}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={entry.teamName || ''}
                          onChange={(e) => updateTeamName(gameName, e.target.value)}
                          placeholder={`e.g. Mechanical Strikers (${gameName})`}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {entry.players.map((player, pIdx) => {
                        const isCaptain = pIdx === 0;
                        return (
                          <div
                            key={pIdx}
                            className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1226]">
                                {isCaptain && (
                                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                                )}
                                {isCaptain ? 'Player #1 (Captain / Primary)' : `Player #${pIdx + 1}`}
                              </span>
                              {isTeamOrPair &&
                                !isCaptain &&
                                entry.players.length > game.min_players && (
                                  <button
                                    type="button"
                                    onClick={() => removePlayer(gameName, pIdx)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
                                    title="Remove player"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                  </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <input
                                type="text"
                                placeholder="Full Name *"
                                value={player.name}
                                onChange={(e) =>
                                  updatePlayer(gameName, pIdx, 'name', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#0A1226] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Roll No / Student ID *"
                                value={player.studentId}
                                onChange={(e) =>
                                  updatePlayer(gameName, pIdx, 'studentId', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#0A1226] focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Department / Class *"
                                value={player.department}
                                onChange={(e) =>
                                  updatePlayer(gameName, pIdx, 'department', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#0A1226] focus:outline-none"
                              />
                              <input
                                type="tel"
                                placeholder="Phone"
                                value={player.phone || ''}
                                onChange={(e) =>
                                  updatePlayer(gameName, pIdx, 'phone', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#0A1226] focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {isTeamOrPair && entry.players.length < game.max_players && (
                      <button
                        type="button"
                        onClick={() => addPlayer(gameName)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-dashed border-slate-400 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Substitute / Squad Player ({entry.players.length}/{game.max_players})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button
                type="button"
                onClick={() => handleNext(3)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => handleNext(5)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A1226] hover:bg-[#152244] text-amber-300 font-bold text-sm transition cursor-pointer"
              >
                <span>Review &amp; Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 5: SUMMARY & PAYMENT */}
        {step === 5 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#0A1226] text-amber-300 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Summary &amp; Payment Method
                </h2>
                <p className="text-sm text-slate-500">
                  All fees are verified live on the server. Choose Cash or JazzCash to complete registration.
                </p>
              </div>
            </div>

            {/* Fee Statement */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
              {calculatingFee || !feeSummary ? (
                <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating verified fees...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase">
                        <th className="py-3 px-3 sm:px-4">Competition</th>
                        <th className="hidden sm:table-cell py-3 px-4">Players</th>
                        <th className="hidden sm:table-cell py-3 px-4">Rate Basis</th>
                        <th className="py-3 px-3 sm:px-4 text-right">Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeSummary.itemized.map((item) => (
                        <tr key={item.gameName} className="border-t border-slate-200">
                          <td className="py-3 px-3 sm:px-4 font-bold text-slate-900">
                            {item.gameName}
                            <div className="text-[11px] font-normal text-slate-500">
                              {item.format} · {item.playerCount} athlete(s)
                            </div>
                            <div className="sm:hidden text-[11px] font-normal text-amber-700 mt-0.5">
                              {item.feeNote}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-3 px-4 text-slate-600">
                            {item.playerCount} athlete(s)
                          </td>
                          <td className="hidden sm:table-cell py-3 px-4 text-xs text-slate-500">
                            {item.feeNote}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {item.fee.toLocaleString()} {feeSummary.currency}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-amber-50 border-t-2 border-amber-300">
                        <td
                          colSpan={3}
                          className="hidden sm:table-cell py-3.5 px-4 font-extrabold text-amber-950"
                        >
                          TOTAL REGISTRATION FEE DUE
                          {feeSummary.packageApplied && (
                            <span className="ml-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                              Individual Pass Applied
                            </span>
                          )}
                        </td>
                        <td className="sm:hidden py-3.5 px-3 font-extrabold text-amber-950">
                          TOTAL FEE DUE
                          {feeSummary.packageApplied && (
                            <span className="block w-fit mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                              Individual Pass Applied
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right font-extrabold text-base sm:text-lg text-amber-950 whitespace-nowrap">
                          {feeSummary.totalFee.toLocaleString()} {feeSummary.currency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment Method Cards */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Select Payment Method
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Cash');
                  setErrorMsg('');
                }}
                className={`touch-manipulation text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'border-[#0A1226] bg-emerald-50/50 ring-2 ring-emerald-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-2 font-bold text-slate-900">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    Cash at Registration Desk
                  </span>
                  {paymentMethod === 'Cash' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Complete registration now and pay cash directly at the Mechanical Sports Desk with your Roll Number.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('JazzCash');
                  setErrorMsg('');
                }}
                className={`touch-manipulation text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                  paymentMethod === 'JazzCash'
                    ? 'border-[#0A1226] bg-amber-50/60 ring-2 ring-amber-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-2 font-bold text-slate-900">
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    JazzCash Transfer (Online)
                  </span>
                  {paymentMethod === 'JazzCash' && (
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Transfer to official JazzCash <strong>{settings.jazzcash_number}</strong> ({settings.jazzcash_title}) &amp; upload receipt screenshot.
                </p>
              </button>
            </div>

            {/* JazzCash Account & Receipt Upload Panel */}
            {paymentMethod === 'JazzCash' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5 mb-6 space-y-4">
                <div className="bg-white rounded-xl border border-amber-200 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      Official JazzCash Account Details
                    </div>
                    <button
                      type="button"
                      onClick={copyJazzCashNumber}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedJazzCash ? 'Copied!' : 'Copy Number'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">JazzCash Number: </span>
                      <strong className="font-mono text-base text-amber-900">
                        {settings.jazzcash_number}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Account Holder: </span>
                      <strong className="text-slate-900">{settings.jazzcash_title}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                    JazzCash Transaction ID / TID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. TID 01984726351"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#0A1226] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                    Upload Payment Receipt Screenshot <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptSelect}
                    className="hidden"
                  />
                  {!receiptData ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-amber-400 bg-white hover:bg-amber-50/40 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer"
                    >
                      {compressing ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                          <span>Optimizing photo for fast mobile upload...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-amber-600" />
                          <span>Tap to Choose or Take Photo of JazzCash Receipt</span>
                          <span className="text-xs font-normal text-slate-400">
                            JPG / PNG — Auto-compressed for mobile
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-white rounded-xl border border-emerald-300 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptData}
                        alt="Receipt preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-emerald-700 truncate">
                          Receipt Ready: {receiptName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Optimized &amp; ready for organizer verification
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearReceipt}
                        className="text-xs font-bold text-red-600 hover:underline px-2 py-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleNext(4)}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                disabled={submitting || calculatingFee || compressing}
                onClick={handleSubmit}
                className="w-full sm:w-auto touch-manipulation inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Registration...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete &amp; Submit Registration
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* STEP 6: OFFICIAL PROOF OF REGISTRATION SLIP */}
        {step === 6 && submissionResult && (
          <section className="space-y-4">
            <div className="no-print rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="font-bold text-emerald-900 text-base">
                    Registration Submitted Successfully!
                  </h2>
                  <p className="text-xs text-emerald-700">
                    Download or print your official proof slip below for check-in at the Sports Desk.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1226] text-amber-300 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Download / Print PDF Slip
                </button>
                <button
                  type="button"
                  onClick={copyWhatsAppSummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  {copiedSlip ? 'Copied!' : 'Copy for WhatsApp'}
                </button>
              </div>
            </div>

            {/* Printable Official Slip */}
            <div className="print-slip bg-white rounded-2xl shadow-md border-2 border-[#0A1226] p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 pb-4 mb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-700">
                    Official Registration Proof Slip
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0A1226]">
                    {settings.event_title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted: {new Date(submissionResult.submissionTime).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    submissionResult.paymentMethod === 'JazzCash'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-blue-50 text-blue-800 border-blue-300'
                  }`}
                >
                  {submissionResult.paymentMethod === 'JazzCash'
                    ? 'JazzCash Receipt Under Verification'
                    : 'Cash Due at Registration Desk'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Student / Captain</span>
                  <strong className="text-slate-900">{submissionResult.registrant.name}</strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Roll Number / Student ID</span>
                  <strong className="font-mono text-[#0A1226]">
                    {submissionResult.registrant.studentId}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Department / Class</span>
                  <strong className="text-slate-900">
                    {submissionResult.registrant.department}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Phone Number</span>
                  <strong className="text-slate-900">{submissionResult.registrant.phone}</strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Payment Method</span>
                  <strong className="text-slate-900">
                    {submissionResult.paymentMethod === 'JazzCash'
                      ? `JazzCash (${settings.jazzcash_number} — ${settings.jazzcash_title})`
                      : 'Cash at Registration Desk'}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Reference / TID</span>
                  <strong className="text-slate-900">
                    {submissionResult.transactionRef ||
                      (submissionResult.paymentMethod === 'JazzCash'
                        ? 'Receipt Screenshot Uploaded'
                        : 'Payable at Desk')}
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#0A1226] text-white text-xs uppercase">
                      <th className="py-2.5 px-3">Registration ID</th>
                      <th className="py-2.5 px-3">Sport &amp; Format</th>
                      <th className="py-2.5 px-3">Team / Entry</th>
                      <th className="py-2.5 px-3">Players</th>
                      <th className="py-2.5 px-3 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionResult.entries.map((entry) => (
                      <tr key={entry.registrationId} className="border-b border-slate-200">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0A1226]">
                          {entry.registrationId}
                        </td>
                        <td className="py-2.5 px-3">
                          <strong>{entry.gameName}</strong>{' '}
                          <span className="text-xs text-slate-500">({entry.format})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{entry.teamName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{entry.playerCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {entry.feeDue.toLocaleString()} {submissionResult.currency}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50 font-extrabold text-base">
                      <td colSpan={4} className="py-3 px-3 text-amber-950">
                        TOTAL AMOUNT
                      </td>
                      <td className="py-3 px-3 text-right text-amber-950">
                        {submissionResult.totalFeeDue.toLocaleString()}{' '}
                        {submissionResult.currency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-500 border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between gap-2">
                <span>
                  {submissionResult.paymentMethod === 'Cash'
                    ? 'Bring this slip + Roll Number to the Mechanical Sports Desk to pay cash and complete verification.'
                    : `Your JazzCash receipt is under review by ${settings.jazzcash_title} / Sports Committee.`}
                </span>
                <span className="font-semibold text-slate-700">
                  Eligibility Status: Pending Desk Verification
                </span>
              </div>
            </div>

            <div className="no-print flex justify-center pt-2">
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Register Another Student / Team
              </button>
            </div>
          </section>
        )}

        {/* Sticky Live Summary Bar on Step 3 (Mobile + Desktop Quick Action) */}
        {step === 3 && selectedCount > 0 && (
          <div className="no-print fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-3xl z-40 bg-[#0A1226]/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-amber-400/40 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-300">
                {selectedCount} Sport{selectedCount > 1 ? 's' : ''} Selected
                {usePackage ? ' · Solo Pass Active' : ''}
              </div>
              <div className="font-display font-bold text-base sm:text-lg text-amber-300">
                Est. {estimatedStep3Total.toLocaleString()} {settings.currency}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNext(4)}
              className="touch-manipulation inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0A1226] font-bold text-xs sm:text-sm cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clean Footer with Discreet Staff / Organizer Portal Link */}
        <footer className="no-print mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            © 2026 {settings.event_title} · {settings.organizer_contact}
          </span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-[#0A1226] transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Organizer / Staff Portal</span>
          </Link>
        </footer>
      </main>
    </div>
  );
}
