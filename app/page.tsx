'use client';

import React, { useState, useEffect } from 'react';
import SubmitTab from '@/components/SubmitTab';
import ResultTab from '@/components/ResultTab';
import AdminTab from '@/components/AdminTab';

// Unique types matching schema
interface Submission {
  id: string;
  github_url: string;
  repo_name: string;
  owner: string;
  team_name?: string;
  deployment_link?: string;
  score: number;
  submitted_at: string;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}


export default function Home() {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-result' | 'admin'>('submit');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userResult, setUserResult] = useState<any | null>(null);
  const [userSubmissionUrl, setUserSubmissionUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Persistent settings (toggled via Admin)
  const [isFrozen, setIsFrozen] = useState(false);
  const [endTime, setEndTime] = useState('2026-12-01T18:00:00Z');

  // Load configuration and cached submissions on mount
  useEffect(() => {
    // Check organizer access query parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('organizer') === 'true' || params.get('admin') === 'true') {
        setIsOrganizer(true);
      }
    }

    // Fetch shared config (end time + freeze) from server — this is the source of truth
    // so ALL browsers see the admin's latest settings, not just the admin's own localStorage.
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.endTime) {
          setEndTime(cfg.endTime);
          localStorage.setItem('hackarena_end_time', cfg.endTime);
        }
        setIsFrozen(!!cfg.isFrozen);
        localStorage.setItem('hackarena_is_frozen', cfg.isFrozen ? 'true' : 'false');
      })
      .catch(() => {
        // Fallback: read from localStorage if network fails
        const savedEndTime = localStorage.getItem('hackarena_end_time');
        const defaultEndTime = '2026-05-21T12:30:00Z';
        setEndTime(savedEndTime || defaultEndTime);
        const savedFreeze = localStorage.getItem('hackarena_is_frozen');
        setIsFrozen(savedFreeze === 'true');
      });

    // Local submissions seed check
    const localSaved = localStorage.getItem('hackarena_submissions');
    if (!localSaved) {
      localStorage.setItem('hackarena_submissions', JSON.stringify([]));
    }

    // User result cached session check
    const savedResult = localStorage.getItem('hackarena_user_result');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      setUserResult(parsed);
      setUserSubmissionUrl(parsed.github_url);
    }

    fetchStandings();
  }, []);

  // Fetch standings from API proxy or LocalStorage
  const fetchStandings = async () => {
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.results || []);
        localStorage.setItem('hackarena_submissions', JSON.stringify(data.results || []));
        return;
      }
    } catch (err) {
      console.warn('API fetch failed. Using local storage.', err);
    }

    // Fallback: Read local storage cache
    const cached = localStorage.getItem('hackarena_submissions');
    if (cached) {
      setSubmissions(JSON.parse(cached));
    }
  };

  // Toast Notifier utility
  const addToast = (text: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    
    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Triggered on Submit Success
  const handleSubmissionSuccess = (result: any) => {
    const newSubmission = {
      id: result.dbData?.[0]?.id || `local-${Math.random().toString(36).substring(2, 9)}`,
      github_url: result.github_url,
      repo_name: result.repo_name,
      owner: result.owner,
      team_name: result.team_name || '',
      deployment_link: result.deployment_link || '',
      score: result.highScore ?? result.score, // Ensure high score is kept
      latest_score: result.score,
      improved: result.improved ?? true,
      submitted_at: new Date().toISOString()
    };

    // Cache submission user session
    setUserResult(newSubmission);
    setUserSubmissionUrl(newSubmission.github_url);
    localStorage.setItem('hackarena_user_result', JSON.stringify(newSubmission));

    // Update submissions local cache
    const currentSubmissions = [...submissions];
    const existingIndex = currentSubmissions.findIndex(s => s.github_url === newSubmission.github_url);
    
    if (existingIndex !== -1) {
      currentSubmissions[existingIndex] = newSubmission;
    } else {
      currentSubmissions.push(newSubmission);
    }
    
    setSubmissions(currentSubmissions);
    localStorage.setItem('hackarena_submissions', JSON.stringify(currentSubmissions));

    // Refetch/sync database
    fetchStandings();

    // Dynamically switch tab
    setActiveTab('my-result');
  };

  // Admin Actions helpers
  const handleSetIsFrozen = (frozen: boolean) => {
    setIsFrozen(frozen);
    localStorage.setItem('hackarena_is_frozen', frozen ? 'true' : 'false');
    // Persist to shared server config so all participants see the freeze state
    const password = localStorage.getItem('hackarena_admin_pass') || 'admin';
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, isFrozen: frozen })
    }).catch(err => console.warn('[Config] Failed to persist freeze state:', err));
    addToast(`Leaderboard is now ${frozen ? 'FROZEN' : 'ACTIVE'}.`, frozen ? 'error' : 'success');
  };

  const handleSetEndTime = (time: string) => {
    setEndTime(time);
    localStorage.setItem('hackarena_end_time', time);
    // Persist to shared server config so ALL participants see the updated end time
    const password = localStorage.getItem('hackarena_admin_pass') || 'admin';
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, endTime: time })
    }).catch(err => console.warn('[Config] Failed to persist end time:', err));
  };

  const handleDeleteSubmission = async (id: string) => {
    const target = submissions.find(s => s.id === id);
    if (!target) return false;

    // Helper function to remove repo count key
    const removeCountLocally = () => {
      try {
        const repoKey = `${target.owner}/${target.repo_name}`.toLowerCase();
        const counts = JSON.parse(localStorage.getItem('hackarena_submission_counts') || '{}');
        delete counts[repoKey];
        localStorage.setItem('hackarena_submission_counts', JSON.stringify(counts));
      } catch {}
    };

    // Call API proxy
    try {
      const password = localStorage.getItem('hackarena_admin_pass') || 'admin';
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'delete', id })
      });

      if (res.ok) {
        removeCountLocally();
        // Remove locally
        const updated = submissions.filter(s => s.id !== id);
        setSubmissions(updated);
        localStorage.setItem('hackarena_submissions', JSON.stringify(updated));
        
        // Clean active user session if their submission is deleted
        if (userResult && userResult.id === id) {
          setUserResult(null);
          setUserSubmissionUrl(null);
          localStorage.removeItem('hackarena_user_result');
        }

        fetchStandings();
        return true;
      }
    } catch {
      console.error('Delete call failed');
    }

    // Fallback: Delete locally
    removeCountLocally();
    const updated = submissions.filter(s => s.id !== id);
    setSubmissions(updated);
    localStorage.setItem('hackarena_submissions', JSON.stringify(updated));
    fetchStandings();
    return true;
  };

  const handleClearSubmissions = async () => {
    try {
      const password = localStorage.getItem('hackarena_admin_pass') || 'admin';
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'clear' })
      });

      if (res.ok) {
        setSubmissions([]);
        localStorage.setItem('hackarena_submissions', JSON.stringify([]));
        localStorage.setItem('hackarena_submission_counts', JSON.stringify({}));
        setUserResult(null);
        setUserSubmissionUrl(null);
        localStorage.removeItem('hackarena_user_result');
        return true;
      }
    } catch {
      console.error('Clear call failed');
    }

    // Fallback locally
    setSubmissions([]);
    localStorage.setItem('hackarena_submissions', JSON.stringify([]));
    localStorage.setItem('hackarena_submission_counts', JSON.stringify({}));
    setUserResult(null);
    setUserSubmissionUrl(null);
    localStorage.removeItem('hackarena_user_result');
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header / Navbar */}
      <header className="border-b border-[var(--border)] bg-[rgba(9,9,15,0.7)] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-2xl font-bold text-white tracking-widest font-mono-custom animate-pulse">⌬</span>
            <span className="text-lg font-black tracking-widest text-white">
              HACK <span className="text-[var(--accent)]">ARENA</span>
            </span>
          </div>

          {/* Nav Tabs Switcher */}
          <nav className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold tracking-wide cursor-pointer transition-colors duration-200 ${
                activeTab === 'submit' 
                  ? 'bg-[var(--surface2)] border border-[var(--border)] text-white' 
                  : 'text-[var(--text2)] hover:text-white'
              }`}
            >
              Submit
            </button>
            <button
              onClick={() => setActiveTab('my-result')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold tracking-wide cursor-pointer transition-colors duration-200 ${
                activeTab === 'my-result' 
                  ? 'bg-[var(--surface2)] border border-[var(--border)] text-white' 
                  : 'text-[var(--text2)] hover:text-white'
              }`}
            >
              My Result
            </button>
            {isOrganizer && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold tracking-wide cursor-pointer transition-colors duration-200 ${
                  activeTab === 'admin' 
                    ? 'bg-[var(--surface2)] border border-[var(--border)] text-white' 
                    : 'text-[var(--text2)] hover:text-white'
                }`}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Live Badge counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-mono-custom select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lime)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--lime)]"></span>
            </span>
            <span className="text-[var(--text2)] tracking-wide">
              LIVE · <span className="text-white font-bold">{submissions.length}</span> submissions
            </span>
          </div>

        </div>
      </header>

      {/* Main Tab Render Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto py-8">
        <div className="transition-opacity duration-200">
          {activeTab === 'submit' && (
            <SubmitTab
              onSubmissionSuccess={handleSubmissionSuccess}
              submissions={submissions}
              endTime={endTime}
              addToast={addToast}
            />
          )}

          {activeTab === 'my-result' && (
            <ResultTab
              result={userResult}
              submissions={submissions}
              addToast={addToast}
            />
          )}

          {activeTab === 'admin' && isOrganizer && (
            <AdminTab
              submissions={submissions}
              isFrozen={isFrozen}
              endTime={endTime}
              onSetIsFrozen={handleSetIsFrozen}
              onSetEndTime={handleSetEndTime}
              onDeleteSubmission={handleDeleteSubmission}
              onClearSubmissions={handleClearSubmissions}
              addToast={addToast}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text3)] font-mono-custom select-none">
        ⌬ HACK ARENA // © 2026 DESIGNED BY DEEPMIND ANTIGRAVITY. ALL RIGHTS DOMINATED.
      </footer>

      {/* Stacked Toast Notification Area */}
      <div 
        className="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999]"
        style={{ pointerEvents: 'none' }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{ pointerEvents: 'auto' }}
            className="flex items-center gap-3 bg-[var(--surface2)] border border-[var(--border2)] rounded-xl px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.5)] max-w-xs transition-all duration-300 transform translate-y-0 animate-slide-up"
          >
            {/* Status dot marker */}
            <span 
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                toast.type === 'success' ? 'bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]' : 'bg-[var(--pink)] shadow-[0_0_8px_var(--pink)]'
              }`}
            />
            <span className="text-xs font-mono-custom text-[var(--text)] leading-snug">
              {toast.text}
            </span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-[var(--text3)] hover:text-white text-xs shrink-0 cursor-pointer pl-1 font-mono-custom"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
