/* eslint-disable */
'use client';

import React, { useState } from 'react';
import { Lock, Trash2, Calendar, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

interface Submission {
  id: string;
  github_url: string;
  repo_name: string;
  owner: string;
  score: number | string;
  submitted_at?: string;
}

interface AdminTabProps {
  submissions: Submission[];
  isFrozen: boolean;
  endTime: string;
  onSetIsFrozen: (frozen: boolean) => void;
  onSetEndTime: (time: string) => void;
  onDeleteSubmission: (id: string) => Promise<boolean>;
  onClearSubmissions: () => Promise<boolean>;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export default function AdminTab({
  submissions,
  isFrozen,
  endTime,
  onSetIsFrozen,
  onSetEndTime,
  onDeleteSubmission,
  onClearSubmissions,
  addToast
}: AdminTabProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);

  // Parse end-time for datetime-local input (YYYY-MM-DDThh:mm)
  const formatDateTimeLocal = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const tzoffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
      return localISOTime;
    } catch {
      return '';
    }
  };

  const [inputEndTime, setInputEndTime] = useState(formatDateTimeLocal(endTime));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('hackarena_admin_pass', password);
        setIsAuthenticated(true);
        addToast('Admin panel unlocked successfully.', 'success');
      } else {
        addToast(data.error || 'Invalid credentials.', 'error');
      }
    } catch {
      addToast('Auth server error.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleDelete = async (id: string, repoName: string) => {
    if (!confirm(`Are you sure you want to delete the submission for "${repoName}"?`)) return;
    setIsPerformingAction(id);
    const success = await onDeleteSubmission(id);
    setIsPerformingAction(null);
    if (success) {
      addToast(`Deleted "${repoName}" submission.`, 'success');
    } else {
      addToast(`Could not delete "${repoName}".`, 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('💥 WARNING: Are you absolutely sure you want to clear ALL submissions? This action is permanent!')) return;
    setIsPerformingAction('clear');
    const success = await onClearSubmissions();
    setIsPerformingAction(null);
    if (success) {
      addToast('All submissions cleared.', 'success');
    } else {
      addToast('Clear submissions failed.', 'error');
    }
  };

  const handleSaveEndTime = () => {
    try {
      const isoString = new Date(inputEndTime).toISOString();
      onSetEndTime(isoString);
      addToast('Hackathon end time updated successfully.', 'success');
    } catch {
      addToast('Invalid date format selected.', 'error');
    }
  };

  // 1. Password Gate UI
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] px-4 animate-fade-in">
        <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 md:p-8 space-y-6 shadow-glow relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--red-primary)] shadow-[0_0_10px_var(--red-primary)] opacity-80" />

          <div className="flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 clip-chamfer-sm bg-[rgba(255,30,30,0.1)] border border-[var(--border-red)] flex items-center justify-center text-[var(--red-primary)] mb-2 shadow-[0_0_15px_var(--red-glow)]">
              <Lock size={20} />
            </div>
            <h3 className="text-xl font-display font-bold text-white tracking-[0.25em] m-0">SECURITY CLEARANCE</h3>
            <p className="text-[9px] text-[var(--text-muted)] font-mono-custom uppercase tracking-widest mt-2">ENTER KEY TO ACCESS TERMINAL</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--bg-void)] border border-[var(--border-subtle)] px-4 py-3 text-sm font-mono-custom text-center text-white focus:outline-none focus:border-[var(--red-primary)] focus:shadow-[0_0_10px_var(--red-glow)] transition-all placeholder-[var(--text-muted)]"
            />
            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full bg-[var(--bg-void)] border border-[var(--red-primary)] text-white hover:bg-[var(--red-deep)] font-semibold font-mono-custom tracking-[0.2em] uppercase py-3 px-6 clip-chamfer-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-glow disabled:opacity-60 text-xs"
            >
              {isSubmittingAuth ? <RefreshCw className="animate-spin text-[var(--red-primary)]" size={16} /> : 'UNLOCK TERMINAL'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Admin Workspace Dashboard
  // Sort for management view
  const sortedSubmissions = [...submissions].sort((a, b) => parseFloat(b.score as string) - parseFloat(a.score as string));

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Management Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 shadow-[0_10px_20px_rgba(0,0,0,0.5)] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
            <div className="w-1.5 h-1.5 bg-[var(--red-primary)]" />
            <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.25em] font-mono-custom">
              LEADERBOARD PROTOCOLS
            </h4>
          </div>

          {/* Freeze toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-white block font-mono-custom uppercase">Freeze Leaderboard</span>
              <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-mono-custom">Lock rankings</span>
            </div>
            <button
              onClick={() => onSetIsFrozen(!isFrozen)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer clip-chamfer-sm border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isFrozen ? 'bg-[var(--red-primary)] shadow-[0_0_10px_var(--red-primary)]' : 'bg-[var(--bg-void)] border border-[var(--border-subtle)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform bg-white transition duration-200 ease-in-out mt-[1px] ml-[1px] ${
                  isFrozen ? 'translate-x-[14px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* End Time setup */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white block font-mono-custom uppercase">Configure Deadline</span>
            <div className="flex gap-2">
              <div className="relative grow">
                <input
                  type="datetime-local"
                  value={inputEndTime}
                  onChange={(e) => setInputEndTime(e.target.value)}
                  className="w-full bg-[var(--bg-void)] border border-[var(--border-subtle)] px-3 py-2 text-[10px] font-mono-custom text-white focus:outline-none focus:border-[var(--red-primary)] focus:shadow-[0_0_8px_var(--red-glow)]"
                />
              </div>
              <button
                onClick={handleSaveEndTime}
                className="bg-[var(--bg-void)] border border-[var(--border-subtle)] hover:border-[var(--red-primary)] hover:shadow-glow hover:text-[var(--red-primary)] text-[var(--text-muted)] text-[10px] px-4 clip-chamfer-sm font-mono-custom flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
              >
                <Calendar size={12} />
                SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Purge Card */}
        <div className="bg-[rgba(255,30,30,0.03)] border border-[var(--border-red)] clip-chamfer p-6 shadow-glow space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-red)]">
              <ShieldAlert size={14} className="text-[var(--red-primary)] animate-pulse" />
              <h4 className="text-[10px] md:text-xs font-bold text-[var(--red-primary)] uppercase tracking-[0.25em] font-mono-custom drop-shadow-[0_0_5px_var(--red-glow)]">
                DANGER ZONE
              </h4>
            </div>
            <p className="text-[9px] md:text-[10px] text-[var(--chrome-low)] leading-relaxed uppercase tracking-widest font-mono-custom">
              Purge all transmissions. This wipes out rankings and cannot be undone. Proceed with extreme caution.
            </p>
          </div>

          <button
            onClick={handleClearAll}
            disabled={isPerformingAction === 'clear'}
            className="w-full bg-[var(--bg-void)] border border-[var(--red-primary)] text-[var(--red-primary)] hover:bg-[var(--red-primary)] hover:text-white font-bold py-3 px-6 clip-chamfer-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 font-mono-custom text-[10px] tracking-[0.2em] uppercase"
          >
            {isPerformingAction === 'clear' ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              'CLEAR ALL TRANSMISSIONS'
            )}
          </button>
        </div>
      </div>

      {/* Submissions Manager List */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] clip-chamfer p-6 shadow-[0_10px_20px_rgba(0,0,0,0.5)] space-y-4 overflow-x-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div className="w-1.5 h-1.5 bg-[var(--red-primary)]" />
          <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[0.25em] font-mono-custom">
            [ TERMINAL: SUBMISSIONS ({submissions.length}) ]
          </h4>
        </div>

        {sortedSubmissions.length === 0 ? (
          <div className="text-center py-10 text-[10px] md:text-xs text-[var(--text-muted)] font-mono-custom tracking-[0.2em] uppercase">
            NO PROTOCOLS RECEIVED YET
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono-custom border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase tracking-widest">
                  <th className="py-4 px-3 text-center">RK</th>
                  <th className="py-4 px-3">REPOSITORY</th>
                  <th className="py-4 px-3">OPERATOR</th>
                  <th className="py-4 px-3 text-center">SCORE</th>
                  <th className="py-4 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--chrome-low)]">
                {sortedSubmissions.map((sub, i) => (
                  <tr key={sub.id} className="hover:bg-[rgba(255,30,30,0.03)] hover:text-white transition-colors group">
                    <td className="py-4 px-3 text-center text-[var(--chrome-high)] font-bold">{i + 1}</td>
                    <td className="py-4 px-3 font-semibold text-white max-w-[200px] truncate">
                      {sub.repo_name}
                      <a href={sub.github_url} target="_blank" rel="noopener noreferrer" className="block text-[9px] text-[var(--red-primary)] hover:underline truncate uppercase mt-0.5">{sub.github_url.replace('https://github.com/','')}</a>
                    </td>
                    <td className="py-4 px-3 uppercase tracking-wider">{sub.owner}</td>
                    <td className="py-4 px-3 text-center font-bold text-[var(--success)] group-hover:drop-shadow-[0_0_5px_var(--success)]">
                      {parseFloat(sub.score as string).toFixed(2)}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => handleDelete(sub.id, sub.repo_name)}
                        disabled={isPerformingAction === sub.id}
                        className="text-[var(--text-muted)] hover:text-[var(--red-primary)] p-1.5 transition-all cursor-pointer hover:shadow-glow"
                        title="Delete Protocol"
                      >
                        {isPerformingAction === sub.id ? (
                          <RefreshCw className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
