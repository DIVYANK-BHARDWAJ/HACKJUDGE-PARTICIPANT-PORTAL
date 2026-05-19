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
      <div className="flex justify-center items-center min-h-[50vh] px-4">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-6 md:p-8 space-y-6 shadow-glow relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-[var(--cyan)]" />

          <div className="flex flex-col items-center text-center space-y-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-[rgba(124,106,247,0.1)] border border-[rgba(124,106,247,0.2)] flex items-center justify-center text-[var(--accent)] mb-2">
              <Lock size={20} />
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">ADMIN AUTHENTICATION</h3>
            <p className="text-xs text-[var(--text2)] font-mono-custom">ENTER SECURITY KEY TO ACCESS MANAGEMENT</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm font-mono-custom text-center text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text3)]"
            />
            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] hover:from-[var(--accent2)] hover:to-[var(--accent)] text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-transform transform active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmittingAuth ? <RefreshCw className="animate-spin" size={16} /> : 'UNLOCK ADMIN CONTROLS'}
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
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Management Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-6 shadow-glow space-y-5">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono-custom border-b border-[var(--border)] pb-2 flex items-center gap-2">
            ⚙️ LEADERBOARD SETTINGS
          </h4>

          {/* Freeze toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-white block">Freeze Leaderboard</span>
              <span className="text-xs text-[var(--text3)]">Lock current standings & pause countdowns</span>
            </div>
            <button
              onClick={() => onSetIsFrozen(!isFrozen)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isFrozen ? 'bg-[var(--accent)]' : 'bg-[var(--surface2)] border-[var(--border)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isFrozen ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* End Time setup */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <span className="text-sm font-semibold text-white block">Configure End Time</span>
            <div className="flex gap-2">
              <div className="relative grow">
                <input
                  type="datetime-local"
                  value={inputEndTime}
                  onChange={(e) => setInputEndTime(e.target.value)}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono-custom text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                onClick={handleSaveEndTime}
                className="bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--accent)] text-white text-xs px-4 rounded-lg font-mono-custom flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Calendar size={12} />
                SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Purge Card */}
        <div className="bg-[rgba(255,77,143,0.02)] border border-[rgba(255,77,143,0.15)] rounded-[20px] p-6 shadow-glow space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[var(--pink)] uppercase tracking-wider font-mono-custom border-b border-[rgba(255,77,143,0.15)] pb-2 flex items-center gap-2">
              <ShieldAlert size={16} />
              DANGER ZONE
            </h4>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              Purge all submissions from database tables. This wipes out rankings, user dashboard results, and cannot be undone.
            </p>
          </div>

          <button
            onClick={handleClearAll}
            disabled={isPerformingAction === 'clear'}
            className="w-full bg-[var(--pink)] hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60 font-mono-custom text-xs"
          >
            {isPerformingAction === 'clear' ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              'CLEAR ALL SUBMISSIONS'
            )}
          </button>
        </div>
      </div>

      {/* Submissions Manager List */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-6 shadow-glow space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono-custom pb-2 border-b border-[var(--border)]">
          📝 SUBMISSIONS ADMIN ({submissions.length})
        </h4>

        {sortedSubmissions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--text3)] font-mono-custom">
            NO SUBMISSIONS REGISTERED IN DATABASE
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-custom border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text3)] uppercase">
                  <th className="py-3 px-2 text-center">RK</th>
                  <th className="py-3 px-2">REPOSITORY</th>
                  <th className="py-3 px-2">OWNER</th>
                  <th className="py-3 px-2 text-center">SCORE</th>
                  <th className="py-3 px-2 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text2)]">
                {sortedSubmissions.map((sub, i) => (
                  <tr key={sub.id} className="hover:bg-[var(--surface2)] transition-colors">
                    <td className="py-3 px-2 text-center text-white font-bold">{i + 1}</td>
                    <td className="py-3 px-2 font-semibold text-white max-w-[200px] truncate">
                      {sub.repo_name}
                      <span className="block text-[10px] text-[var(--text3)] truncate">{sub.github_url}</span>
                    </td>
                    <td className="py-3 px-2">{sub.owner}</td>
                    <td className="py-3 px-2 text-center font-bold text-[var(--cyan)]">
                      {parseFloat(sub.score as string).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleDelete(sub.id, sub.repo_name)}
                        disabled={isPerformingAction === sub.id}
                        className="text-[var(--text3)] hover:text-[var(--pink)] p-1 rounded transition-colors cursor-pointer"
                        title="Delete Submission"
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
